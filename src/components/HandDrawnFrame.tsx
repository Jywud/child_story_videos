import React from "react";
import { C, H, W } from "../theme";
import { clamp01, mulberry32, seedFrom, wobblyRect } from "../lib/handdrawn";

type Props = {
  seed: string;
  frame: number;
  drawFrames?: number;
  inset?: number;
  color?: string;
  strokeWidth?: number;
};

/** 手绘抖动边框，按 pathLength 逐段"描"出来 */
export const HandDrawnFrame: React.FC<Props> = ({
  seed,
  frame,
  drawFrames = 30,
  inset = 44,
  color = C.ink,
  strokeWidth = 7,
}) => {
  const d = React.useMemo(() => {
    const rng = mulberry32(seedFrom(`frame-${seed}`));
    return wobblyRect(rng, inset, inset, W - inset * 2, H - inset * 2, 7);
  }, [seed, inset]);

  const p = clamp01(frame / drawFrames);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={100 - 100 * p}
      />
    </svg>
  );
};
