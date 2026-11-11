import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * 单幕插画：满幅平铺，可选 Ken Burns 缓慢推近。
 *
 * Ken Burns（2026-10-07 新增，留存优化）：
 *  - 仅首幕（钩子卡）启用：缩放 1.06 → 1.14 缓慢推近 + 轻微位移，让静态图有"电影运镜感"
 *  - 其他幕保持静止（历史决策：画面本身不做转场动画，进出由 SceneFade 交叉淡化负责）
 *  - 缩放上限 1.14：1080×1440 源图放大 14% 后仍不糊，也不破坏构图留白区
 *  - 用 Remotion 的 <Img>（阻塞加载）保证渲染确定性
 *
 * 传 kenBurns={true} 启用；不传则与旧行为完全一致（满幅静止）。
 */
export const StoryImage: React.FC<{ image: string; kenBurns?: boolean }> = ({
  image,
  kenBurns = false,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // 进度 0→1（前 80% 的时间内完成推近，留一点余量）
  const t = kenBurns
    ? Math.min(1, frame / Math.max(1, durationInFrames * 0.8))
    : 0;
  // 缓入缓出，避免起手突兀
  const eased = t * t * (3 - 2 * t);
  const scale = kenBurns ? 1.06 + 0.08 * eased : 1;
  // 轻微向上漂移（推近时视觉重心上移，配合标题在画面上部）
  const translateY = kenBurns ? interpolate(eased, [0, 1], [0, -14]) : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(`assets/${image}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: kenBurns
            ? `scale(${scale}) translateY(${translateY}px)`
            : undefined,
        }}
      />
    </AbsoluteFill>
  );
};
