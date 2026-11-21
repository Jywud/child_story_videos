import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Paper } from "./Paper";
import { StoryImage } from "./StoryImage";
import { Badge, OutlinedHeading, fitCoverSize, fitSubSize, FONT_SUB } from "./Overlay";
import { FONT_DISPLAY } from "../lib/fonts";

/**
 * 「黄金3秒」钩子首幕（2026-11-21 定标，全系列通用）。
 *
 * 首幕不用普通 StoryScene，改用本组件，让开场 3 秒有动静、降低跳出率。
 * 三层动效：
 *  1. 插画 Ken Burns 缓慢推近（StoryImage kenBurns）
 *  2. 主标弹簧弹入（scale 0.72→1 回弹）+ 副标延后跟进
 *  3. 环境微动效：3 个柔和暖光斑缓慢飘移+明暗呼吸（不破坏水彩质感）
 *
 * ⚠ 底图要求：上部必须留干净区（出图提示词写「画面上部留出较干净区域用于放标题」），
 *   否则标题会压住主角脸。详见 SKILL.md「开场钩子」章节。
 *
 * 用法（Video.tsx 首幕）：
 *   isFirst ? <HookScene image={s.image.replace(/^assets\//,'')} badge={story.badge}
 *               title={s.title ?? ''} subtitle={s.subtitle ?? ''} duration={s.duration} />
 *           : <StoryScene .../>
 */
export const HookScene: React.FC<{
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  duration: number;
}> = ({ image, badge, title, subtitle, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 主标：弹簧弹入，第 4 帧起，0.72→1 带回弹
  const titleSpring = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: { damping: 11, mass: 0.7, stiffness: 110 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [0.72, 1]);
  const titleOpacity = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 副标：延后 14 帧平滑浮入
  const subEnter = interpolate(frame, [14, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 光斑：3 个柔光点，缓慢飘移 + 呼吸，周期错开
  const glows = [
    { x: "18%", y: "30%", size: 150, delay: 0, drift: 26, base: 0.16 },
    { x: "76%", y: "22%", size: 110, delay: 40, drift: -20, base: 0.13 },
    { x: "60%", y: "42%", size: 90, delay: 75, drift: 18, base: 0.11 },
  ];

  return (
    <AbsoluteFill>
      <Paper seed={7} />
      <StoryImage image={image} kenBurns />

      {/* 环境微动效：柔和暖光斑，缓慢上下飘 + 明暗呼吸 */}
      {glows.map((g, i) => {
        const t = frame - g.delay;
        const breathe =
          0.7 +
          0.3 *
            Math.sin((t / Math.max(1, duration * 0.5)) * Math.PI * 2 + i);
        const dy = interpolate(
          Math.sin((t / Math.max(1, duration)) * Math.PI * 2),
          [-1, 1],
          [-g.drift, g.drift]
        );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.x,
              top: g.y,
              width: g.size,
              height: g.size,
              marginLeft: -g.size / 2,
              marginTop: -g.size / 2,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,236,170,0.9) 0%, rgba(255,224,140,0.35) 45%, rgba(255,224,140,0) 72%)",
              opacity: g.base * breathe,
              transform: `translateY(${dy}px)`,
              pointerEvents: "none",
            }}
          />
        );
      })}

      <Badge text={badge} />

      {/* 主标：弹簧弹入，压在画面上部干净区 */}
      <div
        style={{
          position: "absolute",
          top: "13%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        <OutlinedHeading
          fontSize={fitCoverSize(title, { avail: 900 })}
          fontFamily={FONT_DISPLAY}
          gradient="linear-gradient(178deg, #FFE873 0%, #FFC93C 34%, #FF9E1F 70%, #FF7A12 100%)"
          stroke="#FFFDF4"
          strokeWidth={11}
          halo="drop-shadow(0 0 5px rgba(104,52,4,0.72)) drop-shadow(0 7px 16px rgba(104,52,4,0.42))"
          letterSpacing={6}
        >
          {title}
        </OutlinedHeading>
      </div>

      {/* 副标：延后浮入，楷体亮奶油 */}
      <div
        style={{
          position: "absolute",
          top: "27%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: subEnter,
          transform: `translateY(${(1 - subEnter) * 18}px)`,
        }}
      >
        <OutlinedHeading
          fontSize={fitSubSize(subtitle, 900, 76, 44)}
          fontFamily={FONT_SUB}
          gradient="linear-gradient(178deg, #FFFFFF 0%, #FFF7E6 52%, #FFEBC6 100%)"
          stroke="#8A4A12"
          strokeWidth={5}
          halo="drop-shadow(0 5px 12px rgba(70,35,8,0.4))"
          letterSpacing={3}
        >
          {subtitle}
        </OutlinedHeading>
      </div>
    </AbsoluteFill>
  );
};
