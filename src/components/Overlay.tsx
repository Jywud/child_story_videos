import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BOTTOM_BAR_H, FONT_TEXT, H, SAFE_BOTTOM, W } from "../theme";
import { clamp01 } from "../lib/handdrawn";
import { FONT_DISPLAY } from "../lib/fonts";

/**
 * 标题类文字统一做成「描边压在插画上」，不用色块挡背景。
 *
 * 历史：
 *  - 最早用奶油色圆角卡片（Plaque）兜住文字，用户反馈"方块挡住了背景" → 改描边
 *  - 描边版一开始用纯深棕填充，用户反馈"整体偏暗" → 改渐变亮色
 *
 * 双层实现：底层只画描边（同时提供投影），上层用 background-clip:text 铺渐变。
 * 不用单层 `-webkit-text-stroke` + `background-clip:text` 是因为两者叠在一起时，
 * 描边会跟着被裁切/盖住，容易出毛边。
 */
// 渐变起点不要用接近白的浅黄：压在亮天空上会糊掉。从"实金"起跳更稳。
export const GRAD_TITLE =
  "linear-gradient(178deg, #FFE873 0%, #FFC93C 34%, #FF9E1F 70%, #FF7A12 100%)";
/**
 * 副标与主标要拉开两层区分（只靠字号不够）：
 *  - 颜色：主标暖金 → 副标亮奶油白（冷暖对立最容易读出层级）
 *  - 字体：主标 YaHei 粗体（敦实圆黑）→ 副标楷体（秀气温润）
 * 楷体笔画细，描边会沿字形中线往里吃，所以副标的 strokeWidth 要比主标小很多。
 */
export const GRAD_SUB =
  "linear-gradient(178deg, #FFFFFF 0%, #FFF7E6 52%, #FFEBC6 100%)";
export const FONT_SUB =
  '"KaiTi", "STKaiti", "Kaiti SC", "Microsoft YaHei", serif';
export const GRAD_FRESH =
  "linear-gradient(178deg, #E8F9A6 0%, #C2EB57 38%, #77CC72 76%, #46B263 100%)";
/** 深绿实色渐变（2026-10-07）：落在浅色留白区时，亮绿看不清，改满饱和深绿 */
export const GRAD_FRESH_DEEP =
  "linear-gradient(178deg, #2E7D32 0%, #388E3C 55%, #2E7D32 100%)";
/**
 * 彩虹渐变（2026-10-01 用户要求封面主标改彩虹色）：
 * 适合 3-6 岁的糖果彩虹，红→橙→黄→绿→蓝→紫，横向铺色，
 * 每个字落在不同色段上，一眼就是「彩虹」的观感（纵向同色会糊成一片）。
 * 用 `background-clip:text` 上色时，渐变方向取横向 92deg。
 */
export const GRAD_RAINBOW =
  "linear-gradient(92deg, #FF4D4D 0%, #FF9A2E 20%, #FFD42A 40%, #4ED26B 60%, #3FA9F5 80%, #A45BF0 100%)";

/**
 * 逐字彩虹实色（2026-10-02 用户要求：单字渐变看不清，改为每个字一种颜色）。
 * 根因：background-clip:text 的横向渐变会让一个字跨在两个色段之间，
 * 字内被混色（黄绿过渡压在笔画上），饱和度掉、和奶油纸底糊在一起。
 * 改成整字单色后每个笔画都是满饱和，可读性大幅回升。
 * 色序取彩虹轮换，相邻字冷暖交替；黄色用加深的 #FFC21A，避免浅黄在纸底上发虚。
 */
export const RAINBOW_PER_CHAR = [
  "#F8413F", // 红
  "#FF9A2E", // 橙
  "#FFC21A", // 黄（加深，浅黄压奶油底会看不清）
  "#3DBB5F", // 绿
  "#2F96E8", // 蓝
  "#9C55E8", // 紫
] as const;

/** 标题第 i 个字用的彩虹色（超出轮换长度就取模循环） */
export const rainbowCharColor = (i: number) =>
  RAINBOW_PER_CHAR[i % RAINBOW_PER_CHAR.length];

const OUTLINE = "#FFFDF4";
/** 楷体细笔画用深描边，跟主标的浅描边形成对照 */
const OUTLINE_SUB = "#8A4A12";
/** 紧致暗轮廓 + 柔和投影：让亮色填充在任何底色上都立得住 */
const HALO =
  "drop-shadow(0 0 5px rgba(104,52,4,0.72)) drop-shadow(0 7px 16px rgba(104,52,4,0.42))";
const HALO_SUB =
  "drop-shadow(0 0 4px rgba(104,52,4,0.62)) drop-shadow(0 5px 12px rgba(104,52,4,0.34))";

/** 按字数自适应字号，长标题不折行、不溢出安全区（站酷快乐体偏宽，系数留余量） */
const fitSize = (text: string, maxWidth = 880, max = 164, min = 62) =>
  Math.max(min, Math.min(max, Math.floor((maxWidth - 40) / (text.length + 0.7))));

/** 副标用楷体（非粗体），单字比主标窄，可以放宽一档 */
export const fitSubSize = (text: string, maxWidth = 840, max = 84, min = 50) =>
  Math.max(
    min,
    Math.min(max, Math.floor((maxWidth - 40) / (text.length * 1.05 + 0.5)))
  );

/**
 * 封面大标题自适应字号。
 *
 * 站酷快乐体单字 advance ≈ 0.92em（实测 getlength('曹')@148px = 136），
 * 字距 10px。标题是 inline-block 居中，只要估算总宽不超过内容宽即可安全。
 * 封面两侧 padding 42 + 描边外扩，取可用宽 avail = 990。
 *
 * 2026-10-01 用户要求「标题字号缩小2号」：封面基准从 168 → 148。
 * 7 字《猜猜我有多爱你》在 148 基准下会进一步降到 ≈124，仍不溢出；min 兜底 60。
 */
export const fitCoverSize = (
  text: string,
  {
    max = 148,
    avail = 990,
    letterSpacing = 10,
    glyphRatio = 0.92,
    min = 60,
  } = {}
) =>
  Math.max(
    min,
    Math.min(
      max,
      Math.floor((avail / text.length - letterSpacing) / glyphRatio)
    )
  );

/**
 * 2026-10-01 用户要求「全部改为站酷快乐体」——标题统一走 FONT_DISPLAY，
 * 不再做单字字形替换（此前「曹」曾换华文琥珀，本次按用户要求回归站酷）。
 * splitGlyphFix 保留以便将来需要时快速恢复，但当前映射表为空。
 */
export const GLYPH_FONT_FIX: Record<string, string> = {};

/** 按 GLYPH_FONT_FIX 把标题拆成单字 span；无替换需求时返回原字符串 */
export const splitGlyphFix = (text: string): React.ReactNode =>
  text
    .split("")
    .map((ch, i) =>
      GLYPH_FONT_FIX[ch] ? (
        <span key={i} style={{ fontFamily: GLYPH_FONT_FIX[ch] }}>
          {ch}
        </span>
      ) : (
        <React.Fragment key={i}>{ch}</React.Fragment>
      )
    );

export const OutlinedHeading: React.FC<{
  children: React.ReactNode;
  fontSize: number;
  gradient?: string;
  strokeWidth?: number;
  stroke?: string;
  /** 字形家族：主标默认站酷快乐体，副标传 FONT_SUB 走楷体 */
  fontFamily?: string;
  /** 站酷快乐体只有 400 一档，给 700 会被合成加粗、边缘发虚 */
  fontWeight?: number;
  halo?: string;
  lineHeight?: number;
  letterSpacing?: number;
  /**
   * 逐字实色（2026-10-02）：传入时忽略 gradient，children 必须是字符串，
   * 每个字填充 perChar(i) 返回的颜色。整字单色没有字内混色，
   * 解决单字渐变在色段交界处看不清的问题。
   */
  perChar?: (i: number, ch: string) => string;
}> = ({
  children,
  fontSize,
  gradient = GRAD_TITLE,
  strokeWidth = 13,
  stroke = OUTLINE,
  fontFamily = FONT_DISPLAY,
  fontWeight = 400,
  halo = HALO,
  lineHeight = 1.18,
  letterSpacing = 2,
  perChar,
}) => {
  const metrics: React.CSSProperties = {
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    whiteSpace: "nowrap",
  };
  const text = typeof children === "string" ? children : null;
  // 上层填充：逐字实色走 perChar span；渐变走 background-clip:text
  const fillLayer = perChar && text !== null
    ? text.split("").map((ch, i) => (
        <span key={i} style={{ color: perChar(i, ch) }}>
          {ch}
        </span>
      ))
    : children;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        // 用 filter 而不是 text-shadow：描边的形状也能吃到投影，
        // text-shadow 只按字形轮廓算，会在粗描边里侧留出一圈假影
        filter: halo,
      }}
    >
      {/* 底层：只做描边，同时把容器撑到正确尺寸 */}
      <div
        aria-hidden
        style={{
          ...metrics,
          color: "transparent",
          WebkitTextStroke: `${strokeWidth}px ${stroke}`,
        }}
      >
        {children}
      </div>
      {/* 上层：逐字实色 或 渐变填充 */}
      <div
        style={{
          ...metrics,
          position: "absolute",
          left: 0,
          top: 0,
          ...(perChar && text !== null
            ? {}
            : {
                background: gradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }),
        }}
      >
        {fillLayer}
      </div>
    </div>
  );
};

/** 副标题：亮奶油白填充 + 暖棕细描边 + 楷体，与主标在颜色和字体上都区分开 */
export const SubHeading: React.FC<{
  children: React.ReactNode;
  fontSize: number;
  letterSpacing?: number;
  lineHeight?: number;
  gradient?: string;
  /**
   * 深色模式（2026-10-07）：副标落在浅色留白区时改用「纯深棕实色 + 无描边 + 微投影」。
   * 原因：楷体笔画细，浅底上任何描边都会把笔画整体包住，字就糊了。
   * 纯色文字在浅底上对比度天然足够，描边反而多余。
   */
  dark?: boolean;
}> = ({
  children,
  fontSize,
  letterSpacing = 8,
  lineHeight = 1.3,
  gradient = GRAD_SUB,
  dark = false,
}) => {
  if (dark) {
    return (
      <div
        style={{
          fontFamily: FONT_SUB,
          fontSize,
          fontWeight: 700,
          letterSpacing,
          lineHeight,
          whiteSpace: "nowrap",
          color: "#6E3A0C",
          filter: "drop-shadow(0 1px 2px rgba(255,250,238,0.9))",
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <OutlinedHeading
      fontSize={fontSize}
      gradient={gradient}
      strokeWidth={6}
      stroke={OUTLINE_SUB}
      fontFamily={FONT_SUB}
      fontWeight={400}
      halo={HALO_SUB}
      letterSpacing={letterSpacing}
      lineHeight={lineHeight}
    >
      {children}
    </OutlinedHeading>
  );
};

/** 系列胶囊标签（绘本封面上方那种小圆角牌） */
export const SeriesPill: React.FC<{ text: string; fontSize?: number }> = ({
  text,
  fontSize = 34,
}) => (
  <div
    style={{
      display: "inline-block",
      background: "rgba(255,246,226,0.9)",
      borderRadius: 999,
      padding: "10px 32px",
      fontFamily: FONT_TEXT,
      fontSize,
      fontWeight: 700,
      color: "#6D4A24",
      letterSpacing: 4,
      boxShadow: "0 6px 16px rgba(56,32,6,0.18)",
    }}
  >
    {text}
  </div>
);

/** 底部字幕条：渐变遮罩 + 硬字幕（同时盖住 AI 生成图水印）。
 * 2026-10-10 新规范：**同屏最多 2 行**，字号按最长行自适应缩小。 */
export const BottomCaption: React.FC<{ text: string; frame: number }> = ({
  text,
  frame,
}) => {
  const enter = clamp01(frame / 8);
  // 按标点切句，在累计长度最接近中点的标点处分成两行
  const parts = text
    .split(/(?<=[，。！？……：；])/)
    .map((s) => s.trim())
    .filter(Boolean);
  let lines: string[];
  if (parts.length <= 1) {
    lines = parts.length ? parts : [text];
  } else {
    const total = parts.reduce((a, p) => a + p.length, 0);
    let acc = 0;
    let best = 1;
    let bestDiff = Infinity;
    parts.forEach((p, i) => {
      acc += p.length;
      if (i < parts.length - 1) {
        const diff = Math.abs(acc - total / 2);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = i + 1;
        }
      }
    });
    lines = [parts.slice(0, best).join(""), parts.slice(best).join("")].filter(
      Boolean,
    );
  }
  // 字号自适应：最长行铺满可用宽度即止，最小 30px
  const MAX_W = 940; // 1080 - 左右 70
  const fontSize = Math.max(
    30,
    Math.min(56, Math.floor(MAX_W / Math.max(...lines.map((l) => l.length)))),
  );
  return (
    <>
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          background: `linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0) 100%)`,
          height: BOTTOM_BAR_H,
          top: H - BOTTOM_BAR_H,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: SAFE_BOTTOM - 60,
          paddingLeft: 70,
          paddingRight: 70,
        }}
      >
        <div
          style={{
            fontFamily: FONT_TEXT,
            fontSize,
            fontWeight: 700,
            lineHeight: 1.4,
            textAlign: "center",
            color: "#fff",
            WebkitTextStroke: "9px rgba(0,0,0,0.85)",
            paintOrder: "stroke fill",
            opacity: enter,
            transform: `translateY(${(1 - enter) * 22}px)`,
            letterSpacing: 1,
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              {line}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </>
  );
};

/**
 * 创意词块字幕（2026-09-30 定稿，儿童动画主流做法）：
 * 一句话拆成 2–3 个词块，居中错落排布（左/右/左轻微错位），关键词用暖橙放大，
 * 米白描边保证任何背景可读，词块按 speakable 顺序打字机式依次浮现。
 * 2026-10-10 新规范：**同屏最多 2 行**——词块两两合并成行，字号按最长行自适应缩小。
 */
export const BookCaption: React.FC<{
  text: string;
  frame: number;
  /** 关键词（可选）：命中处用暖橙放大 */
  highlight?: string;
}> = ({ text, frame, highlight }) => {
  // 按标点切词块（顿号/逗号/省略号/问号/感叹号后断），保底整句一块
  const chunks = text
    .split(/(?<=[，。！？……：])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const perChunkDelay = 9; // 每个词块间隔 9 帧浮现
  // 两档错位：左、右交替（2 行内仍保持错落感）
  const offsets = [0, 24];

  // 词块两两合并成行（贪心：尽量均分），保证同屏最多 2 行
  const lines: { chunks: string[]; startIdx: number }[] = [];
  if (chunks.length <= 2) {
    lines.push({ chunks, startIdx: 0 });
  } else {
    const total = chunks.reduce((a, c) => a + c.length, 0);
    let acc = 0;
    let best = 1;
    let bestDiff = Infinity;
    chunks.forEach((c, i) => {
      acc += c.length;
      if (i < chunks.length - 1) {
        const diff = Math.abs(acc - total / 2);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = i + 1;
        }
      }
    });
    lines.push({ chunks: chunks.slice(0, best), startIdx: 0 });
    lines.push({ chunks: chunks.slice(best), startIdx: best });
  }
  // 字号自适应：最长行铺满可用宽度即止
  const maxLineLen = Math.max(...lines.map((l) => l.chunks.join("").length));
  const MAX_W = 940;
  const scale = Math.min(1, MAX_W / (maxLineLen * 52)); // 基准热词 52px
  const hotSize = Math.max(30, Math.floor(52 * scale));
  const baseSize = Math.max(26, Math.floor(44 * scale));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        // 贴近底部：只留水印规避所需的最低余量，字幕视觉落在画面「落款位」
        paddingBottom: 96,
        paddingLeft: 70,
        paddingRight: 70,
      }}
    >
      <div style={{ textAlign: "center" }}>
        {lines.map((line, li) => {
          return (
            <div
              key={li}
              style={{
                display: "block",
                transform: `translateX(${offsets[li % 2]}px)`,
                marginTop: li === 0 ? 0 : 8,
                whiteSpace: "nowrap",
              }}
            >
              {line.chunks.map((chunk, ci) => {
                const gi = line.startIdx + ci;
                const isHot = highlight ? chunk.includes(highlight) : gi === 1;
                const enter = clamp01((frame - gi * perChunkDelay) / 10);
                return (
                  <span
                    key={ci}
                    style={{
                      display: "inline-block",
                      opacity: enter,
                      transform: `translateY(${(1 - enter) * 18}px)`,
                      fontFamily: FONT_SUB,
                      fontSize: isHot ? hotSize : baseSize,
                      lineHeight: 1.5,
                      letterSpacing: 3,
                      fontWeight: isHot ? 700 : 400,
                      color: isHot ? "#FFB03A" : "#FFFDF2",
                      WebkitTextStroke: "5.5px rgba(30,26,20,0.72)",
                      paintOrder: "stroke fill",
                      textShadow:
                        "0 3px 12px rgba(20,14,6,0.5), 0 1px 0 rgba(255,246,220,0.4)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chunk}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 标题卡：文字压在插画上方区域，走势与绘本封面一致 */
export const TitleBlock: React.FC<{
  title: string;
  subtitle?: string;
  frame: number;
}> = ({ title, subtitle, frame }) => {
  const enter = clamp01((frame - 8) / 12);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        paddingTop: 190,
        paddingLeft: 60,
        paddingRight: 60,
      }}
    >
      <div
        style={{
          opacity: enter,
          transform: `translateY(${(1 - enter) * 26}px)`,
          textAlign: "center",
        }}
      >
        <OutlinedHeading fontSize={fitSize(title)}>{title}</OutlinedHeading>
        {subtitle ? (
          <div style={{ marginTop: 22 }}>
            <SubHeading fontSize={fitSubSize(subtitle, 820)}>
              {subtitle}
            </SubHeading>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** 寓意卡 / 互动卡：压在插画上，居中排在画面上部 */
export const MessageBlock: React.FC<{
  title: string;
  subtitle?: string;
  frame: number;
  /** 主标渐变（默认暖金，互动卡传 GRAD_FRESH） */
  accent?: string;
  /**
   * 排版位置（2026-10-07 留存改造）：
   *  - top（默认）：压在画面上部
   *  - bottom：排到画面下部留白区（interact.jpg 底部有大片留白，顶部人物脸容易被主标遮挡）
   */
  position?: "top" | "bottom";
}> = ({ title, subtitle, frame, accent, position = "top" }) => {
  const enter = clamp01(frame / 10);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        paddingTop: position === "top" ? 210 : 0,
        paddingBottom: position === "bottom" ? 300 : 0,
        justifyContent: position === "bottom" ? "flex-end" : "flex-start",
        paddingLeft: 60,
        paddingRight: 60,
      }}
    >
      <div
        style={{
          opacity: enter,
          transform: `translateY(${(1 - enter) * 24}px)`,
          textAlign: "center",
        }}
      >
        <OutlinedHeading
          fontSize={fitSize(title, 900, 130, 60)}
          gradient={accent ?? GRAD_TITLE}
        >
          {title}
        </OutlinedHeading>
        {subtitle ? (
          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <SubHeading
              fontSize={fitSubSize(subtitle, 840, 72, 44)}
              dark={position === "bottom"}
            >
              {subtitle}
            </SubHeading>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** 右上角系列角标 */
export const Badge: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      top: 44,
      right: 38,
      background: "rgba(255,248,236,0.88)",
      borderRadius: 999,
      padding: "9px 26px",
      fontFamily: FONT_TEXT,
      fontSize: 32,
      fontWeight: 700,
      color: "#6D4A24",
      letterSpacing: 3,
      boxShadow: "0 5px 14px rgba(56,32,6,0.18)",
    }}
  >
    {text}
  </div>
);

/**
 * 场景进出透明度 —— 交叉淡化。
 *
 * 注意：淡化是"上一幕淡出、下一幕原本就完全不透明地铺在下面"，
 * 所以**只有第一幕需要淡入**，其余幕的 fadeIn 传 0。
 * 若两幕同时半透明，中间会透出底色，画面会被冲淡。
 */
export const SceneFade: React.FC<{
  duration: number;
  fadeIn?: number;
  fadeOut?: number;
  children: React.ReactNode;
}> = ({ duration, fadeIn = 10, fadeOut = 10, children }) => {
  const frame = useCurrentFrame();
  const inOpacity =
    fadeIn <= 0
      ? 1
      : interpolate(frame, [0, fadeIn], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const outOpacity =
    fadeOut <= 0
      ? 1
      : interpolate(frame, [duration - fadeOut, duration], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  return (
    <AbsoluteFill style={{ opacity: Math.min(inOpacity, outOpacity) }}>
      {children}
    </AbsoluteFill>
  );
};

export const dims = { W, H };
