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
import { SceneFade } from "../../components/Overlay";

/**
 * 环境音效组件（2026-10-11 新增）：
 * - 低音量铺底/点状混入，带淡入避免突兀（volume callback 渐入）
 * - loop=true（默认）：雨声/虫鸣等持续音效，Audio loop 铺满整幕
 * - loop=false：关门/水花等点状音效，外包 Sequence 限时防拖尾串音
 */
const SceneSfxAudio: React.FC<{ sfx: SceneSfx; duration: number }> = ({
  sfx,
  duration,
}) => {
  const volume = sfx.volume ?? 0.25;
  const fadeIn = sfx.fadeIn ?? 20;
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
                {/* 绘本书页腔创意词块字幕，关键词暖橙放大 */}
                {/* 首幕（钩子卡）启用 Ken Burns 缓慢推近 */}
                <StoryScene scene={s} badge={story.badge} captionStyle="book" />
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
