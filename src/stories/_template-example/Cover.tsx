import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import {
  OutlinedHeading,
  FONT_SUB,
  fitCoverSize,
  rainbowCharColor,
} from "../../components/Overlay";
import { FONT_TEXT } from "../../theme";
import type { CoverSpec } from "./constants";

/**
 * 真实绘本封面版式（2026-10-02 更新）：
 * 奶油纸底 + 顶部纸面书名区（文字不压画）+ 内框画芯。
 * 2026-10-01 用户要求：主标统一站酷快乐体、字号缩小 2 号、改彩虹色（3-6 岁风格）。
 *  - 主标字号走 fitCoverSize()，基准从 168 降到 148（长标题进一步自适应缩小）。
 * 2026-10-02 用户要求：单字内渐变看不清（字跨色段被混色），改为**每个字一种实色**。
 *  - 主标走 OutlinedHeading 的 perChar={rainbowCharColor} 逐字上色，整字满饱和。
 *  - 标题直接传字符串（splitGlyphFix 映射表已空，无需拆字）。
 * 2026-10-07（用户指示：版式还原为旧版，文字排版不动）：
 *  - 画芯画法强化：放大画芯主体（河豚），让"气鼓鼓"更抓眼。只动图，不动文字与版式。
 *  - 实现：画芯内套一层放大裁切容器（scale 1.28 + 上移聚焦河豚），河豚脸占比显著提高。
 */

export const StoryCover: React.FC<{ cover: CoverSpec }> = ({ cover }) => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(circle at 50% 12%, #FCF6E7 0%, #F5EAD0 58%, #EDDCB8 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "40px 42px 42px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── 顶部书名区（在纸面上，不压画） ── */}
      <div style={{ textAlign: "center" }}>
        <OutlinedHeading
          fontSize={fitCoverSize(cover.title)}
          perChar={rainbowCharColor}
          stroke="#FFF9EA"
          strokeWidth={9}
          halo="drop-shadow(0 4px 10px rgba(90,50,10,0.30))"
          letterSpacing={10}
        >
          {cover.title}
        </OutlinedHeading>

        {/* 副标一行化：楷体暖棕，像书封上的题记 */}
        <div
          style={{
            marginTop: 16,
            fontFamily: FONT_SUB,
            fontSize: 46,
            color: "#7A4A20",
            letterSpacing: 5,
            textShadow:
              "0 1px 0 rgba(255,252,240,0.9), 0 3px 8px rgba(120,80,30,0.18)",
          }}
        >
          {cover.subLines.join("，")}
        </div>

        {/* 系列署名行：书脊感的小字 */}
        <div
          style={{
            marginTop: 14,
            fontFamily: FONT_TEXT,
            fontSize: 27,
            fontWeight: 700,
            color: "#B08D55",
            letterSpacing: 9,
          }}
        >
          — {cover.badge} —
        </div>
      </div>

      {/* ── 画芯：内框圆角插画，像贴在封面上的一幅画 ── */}
      <div
        style={{
          flex: 1,
          marginTop: 26,
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          border: "5px solid #E3CFA2",
          boxShadow:
            "0 12px 30px rgba(96,64,22,0.26), inset 0 0 0 2px rgba(255,250,235,0.9)",
        }}
      >
        {/* 画芯内放大：聚焦河豚主体（只动图，不动版式文字） */}
        <Img
          src={staticFile(`assets/${cover.image}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scale(1.28) translateY(-4%)",
            transformOrigin: "50% 42%",
          }}
        />
      </div>
    </div>
  </AbsoluteFill>
);
