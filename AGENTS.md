# AGENTS.md

儿童绘本故事视频创作框架（Remotion 流水线）。任何 AI Agent（Codex / Claude Code / Cursor 等）在本仓库工作前先通读本文件，再按需查阅 [docs/WORKFLOW.md](docs/WORKFLOW.md)（完整操作手册，含踩坑案例）。

## 工作流总览

一集 = `src/stories/<slug>/` 三件套 + `public/assets/<slug>/` 素材：

1. **写分镜**：复制 `src/stories/_template-example/` 为新 slug，改 constants.ts / props.json / prompts.json
2. **出图**：按 prompts.json 提示词串行单张生成（任意文生图工具）→ `python scripts/prep_images.py <slug> <图名,逗号分隔>` 入库
3. **配音**：改 `scripts/gen_voice_voice.py` PARTS → `python scripts/gen_voice_voice.py <slug>`，mutagen 实测帧数回填 constants.ts 的 voiceFrames
4. **预检**：`node scripts/precheck.js`（不过禁止渲染）
5. **渲染**：`npx remotion render src/index.ts <slug> output/<slug>.mp4`，渲染后跑 `check_gap.py` 像素复检

## 硬性规则（违反必返工）

- **素材不在仓库里**：`public/assets/` 被 gitignore，图和配音由创作者本人生成
- **出图串行单张**：并行会串目录+文件名覆盖
- **提示词必带**「无文字，无字母，无水印」；道具写「素净没有任何文字图案」
- **可数属性回避**：提示词不写具体数量（扩散模型服从度极低）
- **voiceFrames 必须实测回填**，占位值会时长错乱
- **音效只用品状稳定的点状短音**（loop:false，1-2 秒），禁用持续环境音（低频合成音=电流声）
- **道具连续性**：props.json 每张图显式登记 yes/no/hidden，翻转必须登记 allowChangeAt；hidden=构图看不到跳过检查；title/moral/interact 卡片幕自动豁免
- **prep_images 前隔离非时间序图**（hook 备选放 `tmp-imgs/<slug>/hook-alternatives/`），否则映射整体错位
- **字幕 ≤2 行**自动断行，组件已内置
- **配音多音字**：读错用同音字替换配音文本（字幕保持原字）
- **git**：素材不入库（public/assets 排除），只有框架代码/模板/文档入库

## 规格速查

| 项 | 值 |
|---|---|
| 分辨率/fps | 1080×1440（3:4）/ 30 |
| 时长 | 单集 2-2.5 分钟 |
| 配音 | edge-tts zh-CN-XiaoyiNeural，rate -25%，pitch +8Hz |
| 转场 | 交叉淡化 FADE_FRAMES=20，各幕 buffer ≥32 |
| BGM | 无 |

## 详细文档

- [docs/WORKFLOW.md](docs/WORKFLOW.md) —— 完整手册：组件用法、防返工机制详解、标题排版规范、踩坑案例
- [README.md](README.md) —— 快速开始
