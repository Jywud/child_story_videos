import React from "react";
import { AbsoluteFill } from "remotion";
import { C, H, W } from "../theme";

/** 绘本纸张底：暖色渐变 + feTurbulence 颗粒 + 暗角 */
export const Paper: React.FC<{ seed?: number }> = ({ seed = 7 }) => {
  const raw = React.useId();
  const gid = `grain-${raw.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${C.paper} 0%, ${C.paperDeep} 100%)`,
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", opacity: 0.15, mixBlendMode: "multiply" }}
      >
        <filter id={gid}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={4}
            seed={seed}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter={`url(#${gid})`} />
      </svg>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 55%, rgba(74,56,42,0.16) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
