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

`src/stories/_template-example/` 是一个 3 幕的最小示例，含完整三件套注释和占位图/静音配音——clone 后 `npx remotion studio` 即可预览。

渲染入口：本仓库的 `src/Root.tsx` 未入库（它注册了私人内容）。clone 后把 `src/Root.example.tsx` 重命名为 `src/Root.tsx` 即可运行。

## 出图纪律（AI 插画质量的关键）

插画用任意文生图工具生成（即梦/Midjourney/SD 等），提示词模板见每集 `prompts.json`。
以下纪律是大量返工换来的，直接决定成片质量：

### 提示词规范

- **必须带**「无文字，无字母，无水印」——扩散模型对文字控制极差
- **道具显式声明**「素净没有任何文字图案」（袋子/帽子/杯子等一切道具）
- **主角造型逐字复用**——每张图的描述一字不改，跨图一致性全靠这个
- **可数属性回避**：不要写「三朵花」「五个苹果」这类数量约束，扩散模型对数量服从度极低；改用「几朵」「一片片」
- **抽象意象写清楚位置**：意象长在哪里、不要画在哪、身上其他部位干干净净

### 操作规范

- **串行单张出图**：并行调用会串目录 + 文件名覆盖
- **出图必看水印**：多数生成器右下角有 AI 水印（烘焙进像素的），平滑底纹上可用左侧同纹镜像补掉
- **画幅**：出 1024×1536 → `scripts/prep_images.py` 统一转 1080×1440 JPEG q88
- **入库前人工核对**：`scripts/contact_sheet.py` 拼分镜序联络表，逐格检查主角造型/道具/表情与叙事一致，再入库
- **道具连续性**：复用图片前先查 props.json 道具状态表；主角身上道具必须与剧情事件对齐（装袋后→交货前一直有）
- **可逆状态**（灯亮/灭、睡/醒）登记 yes/no 两态；单幕道具用 `transient: true`
- **群体角色**（小伙伴）：镜头进出不用 yes/no，只在剧情关键幕登记 yes，其余 hidden
- **hook 多版本备选**：先出的备选图移入 `tmp-imgs/<slug>/hook-alternatives/` 隔离，再跑 prep_images，否则时间序映射错位一格

### 音效纪律

- **只用品状稳定的点状特效音**（打雷/提示音/门铃，loop:false，1-2 秒）
- **禁用持续环境音**（鸟鸣/风声/雨声铺底）——合成音效低频易被听成电流声、扫频易显机械，被验证效果很差
- `scripts/gen_sfx_*.py` 系列是验证过的合成配方；环境音效频谱能量须集中中频（低频持续音=电流声），正弦扫频必须加频率抖动+泛音
- 配音多音字读错：用同音字替换配音文本（字幕保持原字），如「影」读错换「颖」
