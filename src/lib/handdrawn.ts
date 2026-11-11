/**
 * 手绘感几何工具：种子随机 + 抖动笔触 + 笔刷排线 + 弧长采样。
 * 全部纯函数、无外部依赖，保证 Remotion 每帧渲染确定性。
 */

export type Pt = { x: number; y: number };

export const mulberry32 = (a: number): (() => number) => {
  let s = a >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seedFrom = (str: string): number => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** 带垂直抖动的平滑折线，两端振幅收窄让笔画衔接自然 */
export const wobblyLine = (
  rng: () => number,
  a: Pt,
  b: Pt,
  amp: number,
  segs: number
): Pt[] => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const raw: number[] = [];
  for (let i = 0; i <= segs; i++) raw.push((rng() * 2 - 1) * amp);
  const sm = raw.map((_, i) => {
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(raw.length - 1, i + 1)];
    return (prev + raw[i] * 2 + next) / 4;
  });

  const pts: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const taper = Math.sin(Math.PI * t) * 0.65 + 0.35;
    pts.push({
      x: a.x + dx * t + nx * sm[i] * taper,
      y: a.y + dy * t + ny * sm[i] * taper,
    });
  }
  return pts;
};

/** 折线转二次贝塞尔平滑路径 */
export const ptsToPath = (pts: Pt[], close = false): string => {
  if (pts.length < 2) return "";
  const f = (n: number) => n.toFixed(2);
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${f(pts[i].x)} ${f(pts[i].y)} ${f(mx)} ${f(my)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${f(last.x)} ${f(last.y)}`;
  if (close) d += " Z";
  return d;
};

/** 按弧长比例取点，用于笔尖跟随 */
export const pointAtProgress = (pts: Pt[], p: number): Pt => {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1 || p <= 0) return pts[0];
  if (p >= 1) return pts[pts.length - 1];

  let total = 0;
  const seg: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    seg.push(l);
    total += l;
  }
  let target = total * p;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const t = seg[i] === 0 ? 0 : target / seg[i];
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      };
    }
    target -= seg[i];
  }
  return pts[pts.length - 1];
};

export type Band = { d: string; w: number; pts: Pt[] };

/**
 * 生成覆盖整幅画面的笔刷排线（遮罩用）。
 * 顺序按 y + 随机扰动排序 → 整体自上而下，局部有手绘的不规则感。
 *
 * ⚠️ 三个系数是联合约束，不要单独调大。相邻两条之间要被覆盖住，需要：
 *     中心偏移差 (step × 2×JITTER) + 摆动偏移差 (step × 2×AMP) + 兜底余量
 *       <  两条笔画的覆盖高度 (step × WIDTH)
 *   实测（scripts/check_mask.js --tune，用全部真实 scene.key 做种子，x 每 2px 采样）：
 *     0.22 / 0.40 / 1.90  →  最多 65px 未覆盖（浅角度下肉眼就是长条白色楔形）
 *     0.08 / 0.30 / 2.40  →  最多 14px，仍有 4 个种子不过关
 *     0.06 / 0.26 / 2.70  →  0px（当前值）
 *   改动这三个值后**必须**重跑 `node scripts/check_mask.js`。
 *
 *   count 取 20：笔画宽 2.70 × (1440/20) ≈ 194px，比条数取 14 时更细，刷出感更像笔刷。
 */
const JITTER = 0.06;
const AMP = 0.26;
const WIDTH = 2.7;

export const brushBands = (
  seed: string,
  W: number,
  H: number,
  count = 20
): Band[] => {
  const rng = mulberry32(seedFrom(seed));
  const step = H / count;
  const raw: { band: Band; order: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const y = step * (i + 0.5) + (rng() * 2 - 1) * step * JITTER;
    const tilt = (rng() * 2 - 1) * step * 0.85;
    const a = { x: -80, y: y - tilt };
    const b = { x: W + 80, y: y + tilt };
    const pts = wobblyLine(rng, a, b, step * AMP, 14);
    raw.push({
      band: { d: ptsToPath(pts), w: step * WIDTH, pts },
      y,
      order: y + (rng() * 2 - 1) * step * 1.6,
    });
  }

  raw.sort((p, q) => p.order - q.order);
  return raw.map((r) => r.band);
};

/** 手绘抖动矩形边框（闭合路径） */
export const wobblyRect = (
  rng: () => number,
  x: number,
  y: number,
  w: number,
  h: number,
  amp: number
): string => {
  const sides: Pt[][] = [
    wobblyLine(rng, { x, y }, { x: x + w, y }, amp, 8),
    wobblyLine(rng, { x: x + w, y }, { x: x + w, y: y + h }, amp, 10),
    wobblyLine(rng, { x: x + w, y: y + h }, { x, y: y + h }, amp, 8),
    wobblyLine(rng, { x, y: y + h }, { x, y }, amp, 10),
  ];
  const pts: Pt[] = [];
  sides.forEach((s, i) => (i === 0 ? pts.push(...s) : pts.push(...s.slice(1))));
  return ptsToPath(pts, true);
};

/** 标题下方的手绘下划线波浪 */
export const squiggle = (
  rng: () => number,
  x: number,
  y: number,
  w: number,
  amp: number
): string => {
  const segs = 10;
  const pts: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push({
      x: x + w * t,
      y: y + Math.sin(t * Math.PI * 3) * amp * (0.6 + rng() * 0.5),
    });
  }
  return ptsToPath(pts);
};

export const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
