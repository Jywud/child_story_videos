import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Paper } from "./Paper";
import { StoryImage } from "./StoryImage";
import {
  Badge,
  BookCaption,
  BottomCaption,
  GRAD_FRESH_DEEP,
  MessageBlock,
  TitleBlock,
} from "./Overlay";
import type { Scene } from "../lib/timeline";

type Props = {
  scene: Scene;
  badge: string;
  /** 字幕形态：bottom=视频字幕条（默认），book=绘本书页腔 */
  captionStyle?: "bottom" | "book";
  /** 书页腔关键词（暖橙放大） */
  highlight?: string;
  /** 首幕 Ken Burns 缓慢推近（2026-10-07 留存优化） */
  kenBurns?: boolean;
};

/**
 * 单幕：满幅插画 + 角标 + 字幕/卡片。画面本身不做转场动画，
 * 进出由 Video.tsx 里的 SceneFade 交叉淡化负责。
 * kenBurns=true 时首幕插画缓慢推近（留存优化，见 StoryImage.tsx）。
 *
 * 历史：这里先后试过「笔刷逐笔刷出」（BrushReveal）和「3D 书本翻页」（PageTurn），
 * 两个文件都还在仓库里但已停用，想恢复把下面的渲染换掉即可。
 */
export const StoryScene: React.FC<Props> = ({
  scene,
  badge,
  captionStyle = "bottom",
  highlight,
  kenBurns = false,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Paper seed={scene.key.length * 13 + 7} />
      <StoryImage image={scene.image} kenBurns={kenBurns} />
      <Badge text={badge} />

      {scene.variant === "bottom" && scene.text ? (
        captionStyle === "book" ? (
          <BookCaption text={scene.text} frame={frame} highlight={highlight} />
        ) : (
          <BottomCaption text={scene.text} frame={frame} />
        )
      ) : null}

      {scene.variant === "title" ? (
        <TitleBlock
          title={scene.title ?? ""}
          subtitle={scene.subtitle}
          frame={frame}
        />
      ) : null}

      {scene.variant === "moral" || scene.variant === "interact" ? (
        <MessageBlock
          title={scene.title ?? ""}
          subtitle={scene.subtitle}
          frame={frame}
          accent={scene.variant === "interact" ? GRAD_FRESH_DEEP : undefined}
          position={scene.key === "s20-interact" ? "bottom" : "top"}
        />
      ) : null}
    </AbsoluteFill>
  );
};
