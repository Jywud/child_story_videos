import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { OutlinedHeading, fitCoverSize, FONT_SUB } from "../../components/Overlay";
import { FONT_COVER } from "../../lib/fonts";
import type { CoverSpec } from "./constants";

/**
 * 融合版封面（2026-11-21 用户定标，全系列新集通用）：
 *   插画满幅铺底 + 标题压在画面上部干净区 + 钩子副标 + 右上胶囊角标。
 *   文字与画面融为一体，不用色块/画芯框分隔（用户明确要的杂志感）。
 *
 *   - 主标：庆科黄油体（童趣圆胖，OFL 免费商用）+ 暖金渐变 + 深棕粗描边。
 *   - 副标：楷体亮奶油 + 深棕细描边，走 COVER.subLines.join("，")。
 *   - 底图：满幅铺底。⚠ COVER.image 必须填「上部留干净区」的图（出图提示词写
 *     「画面上部留出较干净区域用于放标题」），否则大标题会压住主角脸或塔顶。
 *     不要用主体顶到画面上沿的图（如第30集的 s13-stand）。
 *   - 字体已内联（lib/huangyouFontData.ts），Root.tsx 顶层 useCoverFont() 加载。
 */
export const StoryCover: React.FC<{ cover: CoverSpec }> = ({ cover }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Img
      src={staticFile(`assets/${cover.image}`)}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "50% 50%",
      }}
    />

    {/* 主标：压在画面上部干净区（top 5%），庆科黄油体暖金+深棕粗描边 */}
    <div
      style={{
        position: "absolute",
        top: "5%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <OutlinedHeading
        fontSize={fitCoverSize(cover.title)}
        fontFamily={FONT_COVER}
        gradient="linear-gradient(180deg, #FFE9A8 0%, #FFC93C 55%, #F5A623 100%)"
        stroke="#6B3A12"
        strokeWidth={15}
        halo="drop-shadow(0 5px 12px rgba(70,35,8,0.45))"
        letterSpacing={10}
      >
        {cover.title}
      </OutlinedHeading>
    </div>

    {/* 钩子副标：楷体亮奶油 + 深棕细描边，主标下方（top 20%） */}
    <div
      style={{
        position: "absolute",
        top: "20%",
        left: 0,
        right: 0,
        textAlign: "center",
      }}
    >
      <OutlinedHeading
        fontSize={52}
        fontFamily={FONT_SUB}
        gradient="linear-gradient(180deg, #FFFFFF 0%, #FFF4DC 100%)"
        stroke="#7A461A"
        strokeWidth={5}
        halo="drop-shadow(0 3px 8px rgba(70,35,8,0.4))"
        letterSpacing={3}
      >
        {cover.subLines.join("，")}
      </OutlinedHeading>
    </div>

    {/* 右上系列角标：半透明奶油底压在画面上 */}
    <div
      style={{
        position: "absolute",
        top: 32,
        right: 36,
        padding: "9px 24px",
        borderRadius: 999,
        background: "rgba(255,248,232,0.88)",
        fontFamily: "Microsoft YaHei",
        fontSize: 26,
        fontWeight: 700,
        color: "#8A5A22",
        letterSpacing: 2,
        boxShadow: "0 3px 12px rgba(120,80,30,0.18)",
      }}
    >
      {cover.badge}
    </div>
  </AbsoluteFill>
);
