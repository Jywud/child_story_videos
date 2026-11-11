export type SceneVariant = "title" | "bottom" | "moral" | "interact";

/** 环境音效（2026-10-11 新增）：按场景混入，低音量不盖旁白 */
export type SceneSfx = {
  /** 音效文件路径（相对 assets/<slug>/，如 "sfx/rain.mp3"） */
  file: string;
  /** 音量 0-1，默认 0.25 */
  volume?: number;
  /** 是否循环铺满整幕（雨声/虫鸣等持续音效），默认 true；false = 只播一次（关门/水花等点状音效） */
  loop?: boolean;
  /** 音效淡入帧数（默认 20，避免突兀） */
  fadeIn?: number;
};

export type Scene = {
  key: string;
  image: string;
  audio: string | null;
  /** 配音实际帧数（mutagen 实测，勿估算） */
  voiceFrames: number;
  buffer: number;
  variant: SceneVariant;
  text?: string;
  title?: string;
  subtitle?: string;
  /** 单独指定刷出帧数（默认按场景时长自动算） */
  revealFrames?: number;
  /** 环境音效（可选）：雨声/鸟鸣/厨房等场景氛围 */
  sfx?: SceneSfx;
};

export type Story = {
  id: string;
  badge: string;
  scenes: Scene[];
};

/**
 * 相邻场景的重叠帧数 = 交叉淡化时长。
 * 上一幕在这段时间里淡出，下一幕（已经在下面铺好且完全不透明）透出来。
 * 须 < 各场景 buffer，保证淡化发生在两句人声之间的静默里。
 */
export const FADE_FRAMES = 20;

export type TimelineScene = Scene & { start: number; duration: number };

export const buildTimeline = (scenes: Scene[]): TimelineScene[] => {
  let cursor = 0;
  return scenes.map((s, i) => {
    const duration = s.voiceFrames + s.buffer;
    const entry: TimelineScene = { ...s, start: cursor, duration };
    cursor += i < scenes.length - 1 ? duration - FADE_FRAMES : duration;
    return entry;
  });
};

/** Composition 的 durationInFrames 必须用它，不能用 Σ(voiceFrames+buffer)，否则尾部黑屏 */
export const timelineDuration = (scenes: Scene[]): number => {
  const tl = buildTimeline(scenes);
  const last = tl[tl.length - 1];
  return last.start + last.duration;
};
