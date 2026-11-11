import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp01 } from "../lib/handdrawn";
import { H, W } from "../theme";

/**
 * 模拟真实书本翻页。
 *
 * 两个坑，都是先踩过才写下来的：
 *
 * ① 刚性平面绕书脊旋转很"硬"。真实纸页会弯曲：靠书脊那段几乎是平的，
 *    越靠自由边弯得越狠。做法是把页面沿宽度切成 SLICES 条竖切片，逐条累加
 *    位移与旋转，拼出一个折线近似的弧面：
 *      β(u) = e × (BASE + CURL × u^1.5)     u ∈ [0,1] 从书脊到自由边
 *      x_i  = Σ_{j<i} sw·cos β_j
 *      z_i  = Σ_{j<i} sw·sin β_j            z 正向 = 朝观察者
 *      切片 i = translate3d(x_i, 0, z_i) rotateY(-β_i)，原点取切片左边缘
 *
 * ② 直接让角度随时间线性走，会出现"前 40% 一动不动、然后一口气塌掉"，
 *    而且 BASE 不够大时靠书脊那片永远转不过 90°，旧页到最后还剩四分之一赖在屏幕上。
 *    所以这里不驱动角度，而是**驱动"下一页应该露出多少"**：
 *    先离线求出 reveal(e) 对照表，再按目标露出比例反解出 e，几何去追它。
 *    观看到的运动因此是平滑的，几何的非线性被吃掉了。
 *
 * 硬约束：BASE ≥ 90 —— e=1 时靠书脊那一片必须转过 90°，否则旧页走不干净。
 * 方向：rotateY 取**负**角，自由边朝读者抬起才是真实翻页方向（正角像卡片被压扁推走）。
 * 透视原点放在**书脊**（0% 50%），放到画面中心会让收拢中的整页被推出画面。
 */
const SLICES = 28;
const SPINE_P = 3600;
const BASE = 90;
const CURL = 96;

const sw = W / SLICES;
const rad = (d: number) => (d * Math.PI) / 180;

type Slice = { x: number; z: number; beta: number; u: number };

/** 给定基础转角比例 e，算出逐片落点、转角，以及轮廓最右端的投影位置 */
const buildSlices = (e: number): { slices: Slice[]; projRight: number } => {
  const slices: Slice[] = [];
  let x = 0;
  let z = 0;
  let projRight = 0;
  for (let i = 0; i < SLICES; i++) {
    const u = (i + 0.5) / SLICES;
    const beta = e * (BASE + CURL * Math.pow(u, 1.5));
    slices.push({ x, z, beta, u });
    const ex = x + sw * Math.cos(rad(beta));
    const ez = z + sw * Math.sin(rad(beta));
    if (ez < SPINE_P - 1) {
      projRight = Math.max(projRight, (ex * SPINE_P) / (SPINE_P - ez));
    }
    x = ex;
    z = ez;
  }
  return { slices, projRight };
};

// reveal(e) 对照表：e 从 0 到 1 时已露出画面的比例
const STEPS = 64;
const TABLE: { e: number; r: number }[] = [];
for (let i = 0; i <= STEPS; i++) {
  const e = i / STEPS;
  TABLE.push({ e, r: clamp01(1 - buildSlices(e).projRight / W) });
}

/** 反解：要露出 r 比例，基础转角比例 e 该取多少 */
const eForReveal = (r: number): number => {
  if (r <= TABLE[0].r) return 0;
  for (let i = 1; i < TABLE.length; i++) {
    if (TABLE[i].r >= r) {
      const a = TABLE[i - 1];
      const b = TABLE[i];
      const t = b.r === a.r ? 0 : (r - a.r) / (b.r - a.r);
      return a.e + (b.e - a.e) * t;
    }
  }
  return 1;
};

/** smootherstep：两端导数为 0，起步与收尾都软 */
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const PageTurn: React.FC<{
  frame: number;
  duration: number;
  turnFrames: number;
  imageUrl: string;
  overlays: React.ReactNode;
}> = ({ frame, duration, turnFrames, imageUrl, overlays }) => {
  const p = clamp01((frame - (duration - turnFrames)) / turnFrames);

  // 驱动量：目标露出比例（只用了转场的前 92%，留一点给"整页继续翻走"的收尾）
  const target = smootherstep(clamp01((p - 0.06) / 0.86));
  const e = eForReveal(target);
  const { slices, projRight } = buildSlices(e);

  // 落在下一页上的投影，跟着翻起页的轮廓走
  const castShadow = clamp01(Math.sin(Math.PI * Math.pow(p, 0.75)) * 0.95);
  // 页尾整体淡出，避免最后堆在书脊处糊成一团
  const vanish = p < 0.86 ? 1 : clamp01(1 - (p - 0.86) / 0.14);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: SPINE_P,
        perspectiveOrigin: "0% 50%",
        transformStyle: "preserve-3d",
        opacity: vanish,
      }}
    >
      {/* 落影分两层：贴边的一道稍硬（页边压出的接触影），外侧一道大而软 */}
      <div
        style={{
          position: "absolute",
          left: Math.max(0, projRight - 16),
          top: 0,
          width: 420,
          height: "100%",
          background:
            "linear-gradient(90deg, rgba(26,17,9,0.42) 0%, rgba(26,17,9,0.16) 38%, rgba(26,17,9,0.05) 68%, rgba(26,17,9,0) 100%)",
          opacity: castShadow,
          filter: "blur(10px)",
        }}
      />

      {slices.map((s, i) => {
        // 明暗跟着"这一片当前朝哪"走：还没抬起的受光，越过 60° 开始转暗，
        // 转到接近垂直时最暗 —— 这道渐变是弯曲感的主要来源
        const beta = s.beta;
        const lit = Math.max(0, (50 - beta) / 50) * 0.07;
        const dark = Math.max(0, (beta - 55) / 125) * 0.36;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: sw + 1, // 多 1px 避免切片之间出现亚像素缝
              height: H,
              overflow: "hidden",
              transformStyle: "preserve-3d",
              transformOrigin: "0% 50%",
              transform: `translate3d(${s.x.toFixed(2)}px, 0, ${s.z.toFixed(
                2
              )}px) rotateY(${(-beta).toFixed(3)}deg)`,
            }}
          >
            {/* 正面 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
              }}
            >
              {/* 插画走 background 复用同一张解码图，避免 20 份全尺寸栅格化 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: `${W}px ${H}px`,
                  backgroundPosition: `${-i * sw}px 0`,
                }}
              />
              {/* 角标 / 字幕 / 卡片：整体左移 i×sw，保证跨切片位置连续 */}
              <div
                style={{
                  position: "absolute",
                  left: -i * sw,
                  top: 0,
                  width: W,
                  height: H,
                }}
              >
                {overlays}
              </div>
              {lit > 0 ? (
                <AbsoluteFill style={{ background: `rgba(255,248,232,${lit.toFixed(3)})` }} />
              ) : null}
              {dark > 0 ? (
                <AbsoluteFill style={{ background: `rgba(26,16,8,${dark.toFixed(3)})` }} />
              ) : null}
            </div>

            {/* 页背：翻过去之后看到的那一面，是张空白纸 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background:
                  "linear-gradient(90deg, #DBCDB0 0%, #F2E9D8 52%, #FFFCF5 100%)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
