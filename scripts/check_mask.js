// @ts-check
/**
 * 笔刷排线「零缝隙」几何校验。
 *
 * 系数不在这里硬编码 —— 从 src/lib/handdrawn.ts 里正则解析出来，保证只有一处事实来源。
 * 种子也不写死 —— 从各集 constants.ts 解析出全部 scene.key，用真实种子逐个验证。
 *
 * 判据：沿 x 采样，累计所有笔画的垂直覆盖区间，出现未覆盖高度即判失败。
 *
 * 用法: node scripts/check_mask.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const W = 1080;
const H = 1440;

// ---------- 从源码读系数（唯一事实来源） ----------
const hd = fs.readFileSync(path.join(ROOT, "src", "lib", "handdrawn.ts"), "utf8");
const num = (name) => {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)\\s*;`).exec(hd);
  if (!m) throw new Error(`无法从 handdrawn.ts 解析系数 ${name}，校验器需要同步更新`);
  return Number(m[1]);
};
const JITTER = num("JITTER");
const AMP = num("AMP");
const WIDTH = num("WIDTH");
const cm = /count\s*=\s*(\d+)\s*\)\s*:\s*Band\[\]/.exec(hd);
const COUNT = cm ? Number(cm[1]) : 14;
const SEGS = 14;

// ---------- 真实种子 ----------
function seeds() {
  const dir = path.join(ROOT, "src", "stories");
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const f = path.join(dir, name, "constants.ts");
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, "utf8");
    const re = /key:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(src))) out.push(m[1]);
  }
  return out;
}

// ---------- 复刻 brushBands / wobblyLine 的几何与随机数消耗顺序 ----------
const mulberry32 = (a) => {
  let s = a >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const seedFrom = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

function build(seed, cfg) {
  const COUNT = cfg ? cfg.count : cm ? Number(cm[1]) : 14;
  const JITTER = cfg ? cfg.jit : num("JITTER");
  const AMP = cfg ? cfg.amp : num("AMP");
  const WIDTH = cfg ? cfg.width : num("WIDTH");
  const rng = mulberry32(seedFrom(seed));
  const step = H / COUNT;
  const list = [];

  for (let i = 0; i < COUNT; i++) {
    const y = step * (i + 0.5) + (rng() * 2 - 1) * step * JITTER;
    const tilt = (rng() * 2 - 1) * step * 0.85;
    const ax = -80;
    const ay = y - tilt;
    const bx = W + 80;
    const by = y + tilt;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const raw = [];
    for (let k = 0; k <= SEGS; k++) raw.push((rng() * 2 - 1) * step * AMP);
    const sm = raw.map((_, k) => {
      const p = raw[Math.max(0, k - 1)];
      const n = raw[Math.min(raw.length - 1, k + 1)];
      return (p + raw[k] * 2 + n) / 4;
    });

    const pts = [];
    for (let k = 0; k <= SEGS; k++) {
      const t = k / SEGS;
      const taper = Math.sin(Math.PI * t) * 0.65 + 0.35;
      pts.push({
        x: ax + dx * t + nx * sm[k] * taper,
        y: ay + dy * t + ny * sm[k] * taper,
      });
    }
    list.push({ pts, w: step * WIDTH });
  }
  return list;
}

/** 折线在给定 x 处的插值 y */
function yAt(pts, x) {
  if (x <= pts[0].x) return pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    if (x >= lo && x <= hi && b.x !== a.x) {
      const t = (x - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return pts[pts.length - 1].y;
}

function worstGap(seed) {
  return worstGapWith(seed, { count: COUNT, jit: JITTER, amp: AMP, width: WIDTH });
}

/** 指定系数组合下的最大未覆盖高度 */
function worstGapWith(seed, cfg) {
  const bs = build(seed, cfg);
  let worst = 0;
  for (let x = -40; x <= W + 40; x += 2) {
    const iv = bs
      .map((b) => {
        const c = yAt(b.pts, x);
        return [c - b.w / 2, c + b.w / 2];
      })
      .sort((a, b) => a[0] - b[0]);
    let top = -1e9;
    for (const [s, e] of iv) {
      if (top > -1e8 && s > top) worst = Math.max(worst, s - top);
      top = Math.max(top, e);
    }
  }
  return worst;
}

// ---------- main ----------
const all = seeds();
if (!all.length) {
  console.log("未解析到任何 scene.key，跳过遮罩几何校验");
  process.exit(0);
}

// 调参模式：扫描系数组合，报出各组合在全部真实种子下的最大缝隙
if (process.argv.includes("--tune")) {
  const combos = [];
  for (const count of [14, 16, 18, 20]) {
    for (const jit of [0.03, 0.05, 0.08]) {
      for (const amp of [0.22, 0.26, 0.3]) {
        for (const width of [1.9, 2.1, 2.4, 2.7]) {
          combos.push({ count, jit, amp, width });
        }
      }
    }
  }
  const out = [];
  for (const c of combos) {
    let worst = 0;
    for (const s of all) worst = Math.max(worst, worstGapWith(s, c));
    out.push({ ...c, worst });
  }
  out.sort((a, b) => a.worst - b.worst);
  console.log("=== 按 (count, width) 聚合，看最小可行笔画宽度 ===");
  console.log("count  笔画宽(px)  最大缝隙(px)  ← 该宽度下所有 jitter/amp 的最差值");
  const agg = new Map();
  for (const r of out) {
    const k = `${r.count}|${r.width}`;
    if (!agg.has(k) || agg.get(k) < r.worst) agg.set(k, r.worst);
  }
  const rows = [...agg.entries()].map(([k, w]) => {
    const [count, width] = k.split("|").map(Number);
    return { count, width, worst: w };
  });
  rows.sort((a, b) => a.count - b.count || a.width - b.width);
  for (const r of rows) {
    console.log(
      `${String(r.count).padStart(5)} ${(r.width * (H / r.count)).toFixed(0).padStart(11)} ` +
        `${r.worst.toFixed(1).padStart(12)}`
    );
  }
  process.exit(0);
}

// 联合约束的粗判：中心偏移差 + 摆动偏移差 < 覆盖高度
const crude = 2 * JITTER + 2 * AMP;
const limit = WIDTH;
if (crude >= limit) {
  console.log(
    `系数组合已在理论上不保险：2*JITTER+2*AMP=${crude.toFixed(2)} ≥ WIDTH=${limit}`
  );
}

console.log(
  `遮罩几何校验：JITTER=${JITTER} AMP=${AMP} WIDTH=${WIDTH} count=${COUNT}，种子 ${all.length} 个`
);
const bad = [];
for (const s of all) {
  const g = worstGap(s);
  if (g > 1) bad.push(`${s}(${g.toFixed(1)}px)`);
}

if (bad.length) {
  console.log(`失败种子：${bad.join(", ")}`);
  console.log(
    `\n排线存在缝隙，画面上会出现奶油色长条楔形。\n` +
      `收紧 JITTER / AMP 或加大 WIDTH 后重跑本校验（BrushReveal 的收尾补缝只是兜底，不该依赖它）。`
  );
  process.exit(1);
}
console.log("全部种子 0 缝隙，通过。");
