import type { Scene, Story, CoverSpec } from "../../lib/timeline";

/**
 * 最小示例集：3 幕。复制本目录改成你的 slug 即可开新一集。
 *
 * 三件套：
 *   constants.ts —— 分镜数据（本文件）：每幕的图/配音/文案/字幕类型
 *   props.json   —— 道具状态表：防连续性穿帮（check_props.js 校验）
 *   prompts.json —— 出图提示词留档：AI 出图的完整提示词记录
 *
 * 渲染入口：本目录不用注册 Root.tsx（示例不渲染），
 * 你的新集需要复制一集的注册块到 src/Root.tsx。
 */
const A = "_template-example"; // 图片与配音存放于 public/assets/<slug>/
const BUF = 32;                // 各幕尾部缓冲帧（必须 > FADE_FRAMES=20）

export const SCENES: Scene[] = [
  {
    key: "s1-hook",            // 幕的唯一标识（种子用）
    image: `${A}/hook.jpg`,    // 图片路径 public/assets/_template-example/hook.jpg
    audio: `${A}/v1.mp3`,      // 配音路径（edge-tts 生成，见 scripts/gen_voice_voice.py）
    voiceFrames: 150,          // 配音实测帧数（mutagen ceil+1，渲染前必须回填真实值）
    buffer: BUF,
    variant: "title",          // title=开场标题卡（主标+副标）
    title: "你的主标题",
    subtitle: "你的副标题",
    revealFrames: 54,
  },
  {
    key: "s2-story",
    image: `${A}/s2.jpg`,
    audio: `${A}/v2.mp3`,
    voiceFrames: 180,
    buffer: BUF,
    variant: "bottom",         // bottom=底部字幕条（≤2 行自动断行）
    text: "旁白文案写在这里，跟着配音节奏分段。",
    // 点状特效音（可选）：loop:false 短促音，不要持续环境音
    // sfx: { file: "assets/_sfx/chime.mp3", volume: 0.3, loop: false },
  },
  {
    key: "s3-moral",
    image: `${A}/s2.jpg`,      // 寓意卡可复用前面画面
    audio: `${A}/v3.mp3`,
    voiceFrames: 160,
    buffer: BUF,
    variant: "moral",          // moral=寓意卡（复用画面+大标题）
    title: "寓意一句话",
    subtitle: "副句",
    revealFrames: 54,
  },
];

export const STORY: Story = {
  id: "template-example",      // composition id（拼音 slug）
  badge: "儿童绘本故事",        // 右上角角标
  scenes: SCENES,
};

export const COVER: CoverSpec = {
  id: "cover-template-example", // 必须 cover-<slug>，与 STORY.id 不同名
  image: `${A}/hook.jpg`,
  title: "示例集封面",
  subLines: ["第一行副标", "第二行副标"],
  badge: STORY.badge,
};
