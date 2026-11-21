import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
} from "remotion";
import type { SceneSfx, Story, TimelineScene } from "../../lib/timeline";
import { FADE_FRAMES } from "../../lib/timeline";
import { StoryScene } from "../../components/StoryScene";
import { HookScene } from "../../components/HookScene";
import { SceneFade } from "../../components/Overlay";

/**
 * 环境音效组件（2026-10-11 新增，2026-11-21 定标点状规范）：
 * - 只用 loop=false 的点状音效（关键动作响 1-2 秒），不做持续铺底、不加 BGM。
 * - fadeIn 默认 3 帧（0.1s）：短促音效要"脆"，20 帧会把"哗啦"变软。
 * - 音量 0.22-0.42 之间，不盖人声；成片音轨峰值应 <0.8 不削波。
 * - loop=true 的能力保留（雨声/虫鸣），但用户已定持续环境音不用，勿启用。
 */
const SceneSfxAudio: React.FC<{ sfx: SceneSfx; duration: number }> = ({
  sfx,
  duration,
}) => {
  const volume = sfx.volume ?? 0.25;
  const fadeIn = sfx.fadeIn ?? 3;
  const loop = sfx.loop !== false;
  const audioEl = (
    <Audio
      src={staticFile(sfx.file)}
      volume={(f: number) =>
        interpolate(f, [0, fadeIn], [0, volume], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
      loop={loop}
    />
  );
  return loop ? (
    audioEl
  ) : (
    <Sequence durationInFrames={Math.min(duration, 150)}>{audioEl}</Sequence>
  );
};

export const StoryVideo: React.FC<{ story: Story }> = ({ story }) => {
  const tl: TimelineScene[] = (() => {
    // buildTimeline 在 Root 里逐集引用，这里直接内联构建保持单文件自洽
    let cursor = 0;
    return story.scenes.map((s, i) => {
      const duration = s.voiceFrames + s.buffer;
      const entry = { ...s, start: cursor, duration } as TimelineScene;
      cursor += i < story.scenes.length - 1 ? duration - FADE_FRAMES : duration;
      return entry;
    });
  })();

  return (
    <AbsoluteFill style={{ backgroundColor: "#FCF6E7" }}>
      {tl
        .slice()
        .reverse()
        .map((s, i) => {
          const isFirst = i === tl.length - 1; // 反序后最后一个即第 1 幕
          const isLast = i === 0;
          return (
            <Sequence
              key={s.key}
              from={s.start}
              durationInFrames={s.duration}
              name={s.key}
            >
              <SceneFade
                duration={s.duration}
                fadeIn={isFirst ? 14 : 0}
                fadeOut={isLast ? 14 : FADE_FRAMES}
              >
                {isFirst ? (
                  /* 首幕：黄金3秒钩子——Ken Burns 推近 + 标题弹簧弹入 + 柔光斑微动 */
                  <HookScene
                    image={s.image.replace(/^assets\//, "")}
                    badge={story.badge}
                    title={s.title ?? ""}
                    subtitle={s.subtitle ?? ""}
                    duration={s.duration}
                  />
                ) : (
                  /* 绘本书页腔创意词块字幕，关键词暖橙放大 */
                  <StoryScene scene={s} badge={story.badge} captionStyle="book" />
                )}
              </SceneFade>
              {s.audio ? <Audio src={staticFile(`assets/${s.audio}`)} /> : null}
              {/* 环境音效：低音量混入，不盖旁白 */}
              {s.sfx ? <SceneSfxAudio sfx={s.sfx} duration={s.duration} /> : null}
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
};
