import React from "react";
import { C, H, W } from "../theme";
import {
  Band,
  brushBands,
  clamp01,
  easeOutSine,
  pointAtProgress,
} from "../lib/handdrawn";

type Props = {
  src: string;
  seed: string;
  /** 场景内相对帧（0 = 场景开始） */
  frame: number;
  /** 完整画完所需帧数 */
  revealFrames: number;
  bands?: number;
};

/**
 * 笔刷逐笔揭示：
 * 用一组抖动排线做 SVG mask，靠 pathLength=100 + strokeDashoffset 逐条"刷"出来，
 * 再现"像手一笔笔画出"，画完后轻微回落定格。
 */
export const BrushReveal: React.FC<Props> = ({
  src,
  seed,
  frame,
  revealFrames,
  bands: count = 20,
}) => {
  const raw = React.useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `brush-${uid}`;

  const allBands: Band[] = React.useMemo(
    () => brushBands(seed, W, H, count),
    [seed, count]
  );

  const perBand = Math.max(6, revealFrames / (count * 0.55));
  const span = Math.max(0, revealFrames - perBand);

  const progress = allBands.map((_, i) => {
    const start = count > 1 ? (i / (count - 1)) * span : 0;
    return easeOutSine(clamp01((frame - start) / perBand));
  });

  // 收尾补缝：最后 12 帧把整幅补齐。
  // mask 里白色是靠 alpha 叠加的，已刷到的位置本来就是 1，叠加后仍是 1，
  // 只有残留缝隙会被这条 rect 从 0 渐显到 1 —— 即"补缝"而非"重刷"。
  const mopUp = clamp01((frame - (revealFrames - 12)) / 12);

  // 笔尖跟随当前正在画的那一条
  const frontIdx = progress.findIndex((p) => p < 1);
  const tip =
    frame <= revealFrames + 4 && frontIdx >= 0
      ? pointAtProgress(allBands[frontIdx].pts, progress[frontIdx])
      : null;
  const tipOpacity =
    frame > revealFrames ? clamp01(1 - (frame - revealFrames) / 5) : 1;

  // 画完后的落定：1.015 → 1.0
  const settle = 1 + 0.015 * (1 - clamp01((frame - revealFrames) / 14));

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={W}
          height={H}
        >
          <rect width={W} height={H} fill="black" />
          {allBands.map((b, i) => (
            <path
              key={i}
              d={b.d}
              fill="none"
              stroke="#fff"
              strokeWidth={b.w}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - 100 * progress[i]}
            />
          ))}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="#fff"
            opacity={mopUp}
          />
        </mask>
      </defs>

      <g
        transform={`translate(${W / 2} ${H / 2}) scale(${settle.toFixed(
          5
        )}) translate(${-W / 2} ${-H / 2})`}
      >
        <image
          href={src}
          x={0}
          y={0}
          width={W}
          height={H}
          preserveAspectRatio="xMidYMid slice"
          mask={`url(#${maskId})`}
        />
      </g>

      {tip ? (
        <g opacity={tipOpacity}>
          <circle cx={tip.x} cy={tip.y} r={16} fill={C.ink} opacity={0.25} />
          <circle cx={tip.x} cy={tip.y} r={10} fill={C.ink} />
        </g>
      ) : null}
    </svg>
  );
};
