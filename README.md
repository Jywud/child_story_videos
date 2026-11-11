# 儿童绘本故事视频生成器

用 Remotion 流水线批量生产「儿童绘本故事」竖版视频（3:4，1080×1440，30fps）：
温柔哄睡向原创故事 + AI 插画 + 描边手绘字幕 + 点状特效音，内置防返工预检体系。

## 仓库定位

这是一个 **创作框架**，不是内容合集——你用自带工具链写出自己的故事集。
仓库只包含：通用组件、工具脚本、模板与 1 个示例集。你自己的分镜数据与素材（`public/assets/<你的slug>/`、`src/stories/<你的slug>/`）不入库。

## 快速开始

```bash
npm install
npx remotion studio          # 打开 Remotion Studio 预览
```

## 一集的生产流程

1. **写分镜**：复制 `src/stories/_template-example/` 为你的 slug，改 `constants.ts`（分镜/文案/字幕）、`props.json`（道具状态表）、`prompts.json`（出图提示词留档）
2. **出图**：按 prompts.json 用 ImageGen 串行出图 → `python scripts/prep_images.py <slug> <图名列表>` 转 1080×1440 入库 `public/assets/<slug>/`
3. **配音**：改 `scripts/gen_voice_voice.py` 的 PARTS（分幕文案+情绪档）→ `python scripts/gen_voice_voice.py <slug>`，帧数实测后回填 constants.ts
4. **预检**：`node scripts/precheck.js`（素材存在性/道具连续性/提示词留档三关）
5. **渲染**：`npx remotion render src/index.ts <slug> output/<slug>.mp4`

## 目录结构

```
src/lib/            通用算法（handdrawn 手绘字幕 / timeline 时间轴）
src/components/     通用组件（封面/字幕条/场景过渡）——新集不改
src/stories/        每集一个目录：constants.ts + props.json + prompts.json
public/assets/      素材（插画 jpg + 配音 mp3）——不入库
scripts/            工具链（配音生成/出图入库/预检/音效合成）
```

## 防返工预检

`remotion.config.ts` 挂了 precheck，每次 render/still 先过三关：

1. `check_props.js` —— 素材存在 + 道具连续性（状态只能按 allowChangeAt 翻转）
2. `check_mask.js` —— 手绘字幕排线零缝隙几何校验
3. 渲染后 `check_gap.py` 像素级复检

## 约定（踩坑沉淀，勿绕过）

- `Composition.durationInFrames` 必须用 `timelineDuration()`，不能用 Σ(voiceFrames+buffer)
- `voiceFrames` 必须 mutagen 实测，`FADE_FRAMES=20` < 各幕 buffer
- 交叉淡化：上一幕淡出 + 下一幕常驻 opacity 1
- Video.tsx 场景反序渲染（早的场景在上层）
- ImageGen 必须串行单张调用
- 配音多音字读错：替换同音字（字幕保持原字）
- 音效只用点状短促特效音（loop:false），持续环境音易被听成电流声
- props.json：可逆状态用 yes/no 三态 + allowChangeAt 登记；hidden = 构图看不到

## 配音

edge-tts `zh-CN-XiaoyiNeural`，rate -25%，pitch +8Hz。改 `scripts/gen_voice_voice.py`。

## 示例集

`src/stories/_template-example/` 是一个 3 幕的最小示例，含完整三件套注释。
