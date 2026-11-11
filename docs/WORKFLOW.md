
# 儿童绘本故事视频流水线（完整操作手册）

把一篇儿童故事变成一条可直发的竖屏绘本短视频：满幅水彩插画 + **交叉淡化转场** + 硬字幕 + 童声配音 + 封面图。

> 本文档是仓库的完整工作流手册，配合根目录 README.md 使用。
> AI Agent（Codex / Claude Code / Cursor 等）开工前先通读本文，严格遵循「防返工机制」与「约定」章节。

## 工程位置与规格

| 项 | 值 |
|---|---|
| 工程根目录 | `D:\myproject\my-files\child_story_videos` |
| 分辨率 / fps | 1080 × 1440（3:4） / 30 |
| 字幕安全区 | 底部留 300px |
| 底部渐变条 | 460px（同时盖住 AI 生成图水印） |
| 音频 | 仅 edge-tts 配音，**无 BGM** |

目录结构：
```
src/lib/handdrawn.ts        种子随机 + 抖动笔触 + 笔刷排线 + 弧长采样
src/lib/timeline.ts         Scene 类型 + buildTimeline + timelineDuration
src/components/Paper.tsx      纸张底（feTurbulence 颗粒 + 暗角）
src/components/BrushReveal.tsx 核心：笔刷遮罩逐笔揭示 + 笔尖跟随 + 收尾补缝 + 落定定格
src/components/HandDrawnFrame.tsx 手绘抖动边框（默认不用）
src/components/Overlay.tsx    字幕条 / 描边标题 / 系列胶囊 / 角标 / 场景淡化
src/components/StoryScene.tsx 单幕装配
src/components/StoryImage.tsx 满幅插画（无揭示动画）
src/stories/<slug>/constants.ts  ← 只改这里
src/stories/<slug>/Video.tsx | Cover.tsx  通用，不动
scripts/gen_voice.py          edge-tts 配音 + mutagen 实测帧数
scripts/prep_images.py        PNG → 1080×1440 JPEG 入库（可指定不同源目录）
scripts/precheck.js           预检总入口（渲染前自动跑）
scripts/check_props.js        道具连续性 / 素材存在性 / 提示词留档校验
scripts/check_mask.js         排线零缝隙几何校验（--tune 可扫系数）
scripts/turn_profile.js       翻页运动曲线分析（--scan 扫参数），改翻页参数前先跑
scripts/check_gap.py          像素校验：渲染帧是否有残留缝隙
scripts/contact_sheet.py      把一集素材拼成带编号联络表，核对道具/造型一致性
src/stories/<slug>/props.json   ← 道具状态清单（必填）
src/stories/<slug>/prompts.json ← 提示词留档（必填）
```

**画面元素只有**：满幅插画 + 右上角系列角标 + 底部字幕条 / 奶油卡片。不加边框、不加边框式装饰。

## 防返工机制（强制，不要绕过）

这一行踩过的两次返工（**道具一会儿有一会儿没有**、**布袋上印出英文 WHEAT**）根因都不是手滑，
而是「没有可检查的事实来源」。所以把判断变成**声明式文件 + 自动校验 + 渲染前阻断**：

| 机制 | 文件 | 作用 |
|---|---|---|
| 道具清单 | `src/stories/<slug>/props.json` | 每张图的道具状态 `yes/no/hidden`，以及允许状态翻转的幕（`allowChangeAt`）。**每张图必须显式登记**，漏登记直接报错 |
| 提示词留档 | `src/stories/<slug>/prompts.json` | 每张图出图时的完整提示词。校验它带「无文字，无字母，无水印」；道具为 `yes` 的图还必须带「没有任何文字图案」 |
| 预检总入口 | `scripts/precheck.js` | 串起道具校验 + 排线几何校验，任一失败退出码 1 |
| 渲染阻断 | `remotion.config.ts` | 每次 `render/still/compositions` 先跑预检，不过直接抛错中止。临时跳过 `SKIP_PRECHECK=1` |
| 联络表 | `scripts/contact_sheet.py` | 出图后拼图人工核对（道具 / 造型 / 多余文字，一次全看） |
| 像素复检 | `scripts/check_gap.py` | 渲染后抽样帧，统计残留缝隙像素 |
| 风格复检 | `scripts/check_tone.py` | 出图后统计全片色调（Hue/Sat/Lum），抓风格离群的漂移图（`--loose` 豁免夜景等剧情合理偏色） |

### props.json 的三种状态

- `yes` — 道具在画面里看得见
- `no` — 画面里明确没有
- `hidden` — 构图看不到（近景特写、远景），**无法判定，连续性检查时跳过**

### 连续性判定规则

按幕顺序扫描每个道具；`hidden` 不更新状态；`variant` 为 `title/moral/interact`
的卡片幕（钩子卡、寓意卡、互动卡）不算叙事时间线，**自动豁免**。
状态一旦要在某一幕翻转，该幕必须出现在 `allowChangeAt` 里，并且要写明理由。

```jsonc
"allowChangeAt": [
  { "scene": 3,  "why": "妈妈把袋子放到小马背上（装载时刻）" },
  { "scene": 18, "why": "磨坊送达，袋子卸下（交付时刻）" }
]
```

反面教材（曾经的真实错误）：第 18 幕交付后袋子为 `no`，第 19 幕却复用了「驮着袋子」的图
→ 第 19 幕不在 `allowChangeAt` 里 → **渲染直接被拦下**。

### 三种状态之外：transient 道具（2026-09-27 新增）

一次性道具（如送礼队伍捧的礼盒、只在前几幕出现的信物）：在 props.json 该道具上加 `"transient": true`。
校验器把它最后一段连续 `yes` 之后转 `no` 视为**合法退场**（不要求登记 allowChangeAt）；若退场后又回到画面则报错。
适用于「道具跟人走」的场景——人走了道具自然没了，不算连续性断裂。

### 已验证

反向测试过：把第 19 幕换成驮袋图后，`remotion compositions` 立即中止（EXIT=1），
错误信息精确到「第 19 幕（s19-return / s2-wheat.jpg）道具 sack 从 no 变成 yes，但这一幕不在 allowChangeAt 里」，
并顺带提示 `run-home.jpg` 变成未被引用的孤儿图。

## 画面元素与揭示方式

`StoryImage` 把插画**满幅平铺，没有任何揭示动画**：
```tsx
<AbsoluteFill><Img src={staticFile(`assets/${image}`)} style={{width:"100%",height:"100%",objectFit:"cover"}} /></AbsoluteFill>
```
用 Remotion 的 `<Img>` 而不是原生 `<img>` —— 它渲染前会阻塞等待图片加载，保证每帧确定性。

**画面元素只有**：满幅插画 + 右上角系列角标 + 底部字幕条 + **压在插画上的描边文字**。不加边框、不加色块、不加揭示特效。

### 标题类文字：渐变亮色 + 描边，压在插画上

踩过的两个坑：早先标题卡/寓意卡/互动卡/封面都用**奶油色圆角卡片**兜住文字，
用户反馈「方块挡住了背景」；改成纯深棕描边文字后，又反馈「整体偏暗」。最终形态：

**双层结构**（`OutlinedHeading`）——底层只画描边并撑开尺寸，上层 `background-clip: text` 铺渐变。
不要用单层 `-webkit-text-stroke` + `background-clip: text`，两者叠在一起描边会被裁切出毛边。

| 项 | 值 |
|---|---|
| 主标渐变 | `GRAD_TITLE` `178deg, #FFE873 → #FFC93C → #FF9E1F → #FF7A12`（暖金） |
| **主标字体** | **站酷快乐体 `ZCOOL KuaiLe` 400**（圆润手写感，比系统圆黑贴绘本调性） |
| 主标描边 | `#FFFDF4` 13px |
| 副标渐变 | `GRAD_SUB` `178deg, #FFFFFF → #FFF7E6 → #FFEBC6`（亮奶油白） |
| 副标字体 | **`KaiTi` 楷体 400**（秀气温润）—— 换字体家族比换字重有效 |
| 副标描边 | `#8A4A12` 暖棕 **6px** |
| 互动卡渐变 | `GRAD_FRESH` 亮绿系 `#E8F9A6 → #C2EB57 → #77CC72 → #46B263` |
| 立体感 | `filter: drop-shadow(...)` 见 `HALO` / `HALO_SUB` |
| 字号 | 主标 `fitSize()`，副标 `fitSubSize()`（楷体非粗体单字更窄，放宽一档）；**封面主标用 `fitCoverSize()`**（见下） |
| 位置 | 画面上部（`paddingTop ≈ 190–210`），给下方插画主体留空间 |

**主副标题必须在颜色和字体两个维度都拉开**（只靠字号不够）：
主标暖金 + 圆黑 vs 副标亮白 + 楷体，冷暖对立 + 字形对立，一眼就读出层级。
副标题组件单独封装为 `SubHeading`（`Overlay.tsx`）。

#### 封面主标：自适应字号 + 逐字彩虹实色（2026-10-02 用户定调）

**封面主标必须走 `fitCoverSize(text)`，基准 max=148**（用户要求比 168 缩小 2 号）。
站酷快乐体单字 advance ≈ 0.92em（实测 `getlength("曹")@148px = 136`），加字距 10px：

```ts
// avail=990（1080 - 两侧 padding 42 - 描边外扩），6 字算 ≈148，7 字《猜猜我有多爱你》降到 ≈124 不溢出
export const fitCoverSize = (text, { max=148, avail=990, letterSpacing=10, glyphRatio=0.92, min=60 } = {}) =>
  Math.max(min, Math.min(max, Math.floor((avail / text.length - letterSpacing) / glyphRatio)));
```

**封面主标配色用「逐字实色彩虹」，不再用单字渐变**（2026-10-02 用户反馈"渐变色看不清"后定调）：

- **根因**（重要教训）：`background-clip:text` + 横向渐变时，一个字会**跨在两个色段之间**，
  字内被混色（黄绿过渡压在笔画上），饱和度掉、和奶油纸底糊在一起。
  这是机制问题，调渐变方向/描边粗细都救不了。**凡是 `background-clip:text` 铺多色渐变，
  字符数 < 色段数×2 时必有单字混色。**
- **正确做法**：`OutlinedHeading` 传 `perChar={rainbowCharColor}`（整字一个纯色，字间轮换），
  不走 gradient。实现见 `Overlay.tsx`：

```ts
export const RAINBOW_PER_CHAR = [
  "#F8413F", // 红
  "#FF9A2E", // 橙
  "#FFC21A", // 黄（加深！浅黄 #FFD42A 压奶油底会看不清）
  "#3DBB5F", // 绿
  "#2F96E8", // 蓝
  "#9C55E8", // 紫
] as const;
export const rainbowCharColor = (i: number) =>
  RAINBOW_PER_CHAR[i % RAINBOW_PER_CHAR.length];

// 封面主标调用（Cover.tsx）：
<OutlinedHeading fontSize={fitCoverSize(cover.title)}
  perChar={rainbowCharColor} stroke="#FFF9EA" strokeWidth={9}
  halo="drop-shadow(0 4px 10px rgba(90,50,10,0.30))" letterSpacing={10}>
  {cover.title}
</OutlinedHeading>
```

- `perChar` 传入时 `OutlinedHeading` **忽略 gradient**，上层填充逐字 span 上色，底层描边结构不变。
- 描边保持 `#FFF9EA` 9px，保证彩色字在浅奶油底上立得住。
- **配色总原则（2026-10-02 用户定调）：标题文字一律用深色/满饱和色，浅色（浅黄、浅粉、浅青）压奶油纸底会看不清，以后尽量不用。从下一篇新集开始执行，已发布 8 集不改。**新集调色板在奶油纸底（#FCF6E7）上逐色核对对比度；`#FFC21A` 加深黄就是这条原则的第一次落地。
- 视频内 TitleBlock/MessageBlock 仍走 `GRAD_TITLE` 暖金渐变——短标题 3-5 字基本落在同一色段，无单字混色问题，**不要顺手改掉**。
- 新增封面（长标题）时**先算一遍 `fitCoverSize`**，确认总宽 ≤ avail。

**封面标题弃用的旧方案（勿回退）**：`GRAD_RAINBOW` 横向渐变（92deg）+ `splitGlyphFix` 拆字。
GRAD_RAINBOW 常量仍保留在 Overlay.tsx（视频侧可能复用），但封面主标已不再引用它。

#### 标题字体：统一站酷快乐体（用户 2026-10-01 明确）

**标题一律走 `FONT_DISPLAY`（站酷快乐体），不做单字替换**（`GLYPH_FONT_FIX` 已清空）。

- ⚠️ 已知站酷快乐体自带的「曹」是**草头式字形**（上部两块方，像「曺」），且**同厂的庆科黄油体也一样**；
  用户在看到实物后仍选择统一站酷，故按用户意愿保留，不要自作主张再换字体。
- 若将来用户改主意要修单字：`splitGlyphFix()` 机制保留可用，映射表填 `{ 曹: '"STHupo"' }`（华文琥珀，Windows 自带，字形正确）；
  **替换 span 绝不能加 `transform: scale()`** —— `OutlinedHeading` 渐变靠父层 `background-clip:text`，
  子元素有 transform 会另起合成层、只剩描边（字变淡），字面差异交给字体本身。

#### 封面组件是"一改全改"的单点

8 个 `<slug>/Cover.tsx` 内容**必须逐字一致**（用 `md5sum src/stories/*/Cover.tsx` 核对）。
改封面版式时改一个再 `node` 复制到其余 7 个，避免各集漂移。
发版前**必须重渲 `output/第N集-*/cover.png` 与 `output/<slug>/cover.png` 两处**（共 16 张），否则老封面残留。
本次就是靠这个发现了**第五集是旧版**（残留适读章）+ **"第N集-*" 一批老封面没跟上改版**。

- **渐变起点不要用接近白的浅黄**：压在亮天空上会糊掉，从"实金"起跳才稳。
- **投影必须用 `filter: drop-shadow` 而不是 `text-shadow`**：`text-shadow` 只按字形轮廓算，
  会在粗描边里侧留出一圈假影；`drop-shadow` 吃的是渲染后的 alpha，描边形状也算进去。
- **楷体等细笔画字体，描边必须减半**：`-webkit-text-stroke` 沿字形中线往里吃，太粗会把笔画吞掉
  （主标 13px，楷体副标只能 6px）。
- 封面另加系列胶囊标签（`SeriesPill`）放在标题上方，顶部再叠一层极淡提亮
  （`rgba(255,252,244,0.24) → 透明`，别超过 0.3，否则丢插画质感）。

组件：`OutlinedHeading` / `SubHeading` / `SeriesPill` / `TitleBlock` / `MessageBlock`（都在 `Overlay.tsx`）。

### 自定义字体（站酷快乐体）怎么接

字体文件必须**本地化**，不要用 `@remotion/google-fonts`：
中文在 Google Fonts 是拆成上百个 `unicode-range` 子集分发的，渲染时按需分批拉取，
网络一抖就**静默回退**到系统字体，往往出片后才发现掉字。

```bash
node scripts/fetch_font.js     # 下载到 public/assets/fonts/ZCOOLKuaiLe-Regular.ttf（含 magic 校验 + 双源回退）
node scripts/embed_font.js     # 内联成 data URI，生成 src/lib/displayFontData.ts
```

`src/lib/fonts.ts` 只负责加载；**delayRender 由 `Root.tsx` 的 `useEffect` 注册**：

```tsx
const useDisplayFont = () => {
  useEffect(() => {
    const handle = delayRender("加载站酷快乐体");
    loadDisplayFont().finally(() => continueRender(handle));
  }, []);
};
```

三个必须踩过的坑（每一个都会让整片渲染崩掉，且 still 单帧测试看不出来）：

1. **`delayRender` 不能写在模块作用域**。写在 `lib/fonts.ts` 顶层时渲染器不会给它记账，
   `continueRender` 变成空操作，`remotion render` 跑到第 800 多帧时抛
   `delayRender() was called but not cleared after 28000ms`。
   **必须放进组件 `useEffect`**。`still` 只渲染一帧、在超时前就结束，所以完全测不出来 —— 必须用整片渲染验证。
2. **字体要走内联 data URI，不要 `staticFile` + 运行时 fetch**。
   `render` 默认 `--concurrency=4` 会开 4 个标签页，每页都拉一次 1.4MB 字体，
   实测有页面拉不完，同样触发上面的超时。
3. **不要用"老浏览器 UA 拿全量 TTF"的偏方**。给 `fonts.googleapis.com` 发老 UA 会得到
   `/l/font?kit=` 的地址，但下载下来**不是裸 TTF**（magic `cc1a1700`），
   `FontFace` 报 `Invalid font data in ArrayBuffer`。
   用 `google/fonts` 仓库源文件（`raw.githubusercontent.com` 或
   `cdn.jsdelivr.net/gh/google/fonts@main/...`），是标准 sfnt（magic `00010000`）。

另外：站酷快乐体**只有 400 一档**，给 700 会被合成加粗、边缘发虚，
`OutlinedHeading` 的 `fontWeight` 默认已改 400。

> 2026-09-18 用户明确要求去掉「粉刷/描边」揭示效果，画面转场只保留翻书。
> 停用还顺带消灭了一整类瑕疵：笔刷遮罩排线只要有几何缝隙就会露出奶油色楔形。
> `BrushReveal.tsx` 与 `check_mask.js` 都保留在仓库（预检仍会跑），想恢复时把 `StoryScene` 里的
> `<StoryImage>` 换回 `<BrushReveal>` 即可，下面的原理与防缝约束继续有效。

<details>
<summary>附：已停用的笔刷揭示原理与「排线缝隙」防坑（恢复该效果时必读）</summary>

用 **SVG mask + 笔刷排线** 把画面"刷"出来：

1. `brushBands()` 生成抖动排线（seeded PRNG，两端振幅收窄）
2. 放进 `<mask>`，每条 `<path pathLength={100} strokeDasharray="100">`，`strokeDashoffset = 100 - 100*progress`
3. 进度按 eased 时间错峰推进 → 自上而下但局部不规则
4. `pointAtProgress()` 算出当前笔画位置 → 画一颗墨点当"笔尖"跟随，画完淡出
5. 画完后 `scale 1.015 → 1.0` 轻微回落定格

`pathLength=100` 是关键：无需测量真实路径长度，dash 单位被归一化。

排线之间只要没盖住，就会露出奶油色纸底，浅角度下被拉成**长条白色楔形**（用户会一眼看到并退回）。
三个系数是联合约束，**不能单独调**（定义在 `brushBands` 顶部）：

```
相邻中心偏移差 (step × 2×JITTER) + 摆动偏移差 (step × 2×AMP) + 余量 < 覆盖高度 (step × WIDTH)
```

| JITTER | AMP | WIDTH | 实测最大未覆盖 |
|---|---|---|---|
| 0.22 | 0.40 | 1.90 | 65px（肉眼明显） |
| 0.08 | 0.30 | 2.40 | 14px（4 个种子仍不过关） |
| 0.06 | 0.26 | **2.70** | **0px**（当前值，count=20） |

「收尾补缝」（最后 12 帧叠一条 `opacity 0→1` 的白色整幅 rect）只是**兜底**，不要靠它遮几何问题 —— 几何校验必须本身就是 0px。

```bash
node scripts/check_mask.js          # 几何层：全部真实种子下未覆盖高度，应全为 0px
node scripts/check_mask.js --tune   # 打印系数×缝隙对照表，用于重新调参
python scripts/check_gap.py <渲染帧.png> <原图.jpg>   # 像素层：残留缝隙像素应接近 0
```
`check_gap.py` 原理：已揭示的像素应等于原图，未揭示处是奶油纸底 → 找「原图暗、渲染亮、差异大」的像素。要排除角标、字幕带、奶油色卡片区域，否则误报。

</details>

## 转场：当前用交叉淡化

**当前方案是交叉淡化（crossfade），不是翻书。** 2026-09-18 用户先后否掉了「笔刷揭示」和「3D 书本翻页」
（翻页试了三轮：正角→负角、刚性→切片弯曲，最终结论是「效果不行，改为淡入浅出的试试」）。

### 实现要点（有一个容易做错的地方）

两幕重叠 `FADE_FRAMES` 帧。为了淡化中**不露出底色**，必须采用
「上一幕淡出 + 下一幕一直完全不透明地铺在下面」：

- `Video.tsx` **反序渲染**（早的场景在上层），只有第一幕需要 `fadeIn`
- 其余幕 `fadeIn = 0`。若两幕同时半透明，中间会透出奶油底色，画面被冲淡
- `SceneFade` 里 `fadeIn/fadeOut <= 0` 要走 `opacity = 1` 分支，不能直接喂给 `interpolate`
  （输入区间两端相同会算出 NaN）
- 首幕 `fadeIn=14`（从底色浮现）、末幕 `fadeOut=14`（收尾），中间幕 `fadeOut=FADE_FRAMES`

`FADE_FRAMES = 20`（0.67 秒），`buffer` 普通 32 / 卡片 38 → 两句人声之间留 12 帧停顿。

### 备选方案（文件都还在仓库，想换回只需改 `StoryScene`）

| 文件 | 效果 | 备注 |
|---|---|---|
| `StoryImage.tsx` | 满幅平铺、无特效 | **当前使用** |
| `BrushReveal.tsx` | 笔刷逐笔刷出 | 用户否掉：不要粉刷感。配套 `scripts/check_mask.js` |
| `PageTurn.tsx` | 3D 书本翻页（切片弯曲） | 用户否掉：太生硬→改弯曲后仍不满意。配套 `scripts/turn_profile.js` |

<details>
<summary>附：已停用的 3D 翻页实现细节（恢复时必读）</summary>

刚性平面绕书脊旋转很"硬"，所以做成**切片弯曲**：页面沿宽度切 `SLICES=28` 条竖切片，
逐条累加位移与旋转拼出折线弧面。

```
β(u) = e × (BASE + CURL × u^1.5)        u ∈ [0,1] 从书脊到自由边
x_i  = Σ_{j<i} sw·cos β_j
z_i  = Σ_{j<i} sw·sin β_j               z 正向 = 朝观察者
切片 i = translate3d(x_i, 0, z_i) rotateY(-β_i)，transformOrigin 取切片左边缘
```

- 插画走 `background-image` + `background-position: -i*sw`，不要在每个切片里放全尺寸 `<img>`；
  叠加层用一个 `left:-i*sw` 的整页容器包住；切片宽度多写 1px 防亚像素缝。
- 每片按 β 加明暗渐变（`lit`/`dark`）—— **这道渐变是弯曲感的主要来源**，没有它切片看起来还是平的。
- **不要直接驱动角度**：几何是非线性的，会"前 40% 不动 → 一口气塌掉"。
  先离线求 `reveal(e)` 对照表，再按目标露出比例 `smootherstep` 反解出 e。
  用 `node scripts/turn_profile.js` 看曲线（`--scan` 扫参数），别靠反复渲染试。
- **硬约束 `BASE ≥ 90`**：e=1 时靠书脊那片必须转过 90°，否则**旧页到最后还剩四分之一赖在屏幕上**。
- 旋转角取**负**（自由边朝读者抬起）；透视原点必须在**书脊** `0% 50%`（放画面中心会让页面飞出画面）。

</details>

## 标准流程

### 1. 分镜与文案

**选题后、动工前的版权自查（2026-10-03 新增，第 9 集教训）**：
定下题材后，先做**中英文双重检索**（书名 + "绘本/storybook/ picture book" + 核心设定关键词），
确认没有同名/同设定的既有绘本。题材相近不算侵权（儿童情绪类是公共题材池），
但**角色名、情节链、寓意句三样必须全是自己的**。
例：第 9 集《怕黑的小夜灯》与英文《Lino the Lamp Is Afraid of the Dark》(2016) 题材撞车，
但情节（护娃主动亮灯 vs 关灯恐惧自愈）、角色、寓意全不同 → 安全。

固定结构，儿童故事通用：

| # | 幕 | 说明 |
|---|---|---|
| 1 | 悬念钩子卡 | 用**冲突画面**做底图 + 疑问大字（如「河水有多深？」），故事名放副标，前 3 秒拉留存 |
| 2-N | 故事主体 | 必须走完起承转合，每句 10–16 字 |
| 倒数二 | 寓意卡 | 主标短句 + 副标寓意（如「智慧不分大小 / 爱动脑筋的孩子最闪亮」） |
| 最后一 | 互动卡 | **2026-09-24 起改为亲子共读引导**（用户要求）：倒数第 2–3 句旁白引导互动（「问问宝贝：还有别的好办法吗？」「让孩子当一次小主角」），互动卡文案「明晚继续讲新故事 / 关注我 · 今晚给宝贝讲讲这个故事吧」，底图用亲子共读场景（不再用通用点赞话术） |

### 2. 配音（edge-tts）

```bash
cd "D:/myproject/my-files/child_story_videos"
"C:/Users/11273/.workbuddy/binaries/python/envs/default/Scripts/python.exe" scripts/gen_voice.py <slug>
```
- 改 `scripts/gen_voice.py` 里的 `PARTS`
- 声线：`zh-CN-XiaoyiNeural` = **甜美少女声**（VoiceTag `Lively`）；`zh-CN-XiaoxiaoNeural` = 温暖偏成熟；`zh-CN-YunxiaNeural` = 男童 `Cute`
- 参数：`rate="-25%"`、`pitch="+8Hz"`（更慢更甜，儿童向）
- **必须带重试**（edge-tts 会中途 `NoAudioReceived`），脚本已内置 5 次指数退避
- **必须用 mutagen 实测帧数**填 `voiceFrames`，不要估算

### 2b. 时长配平（想做到 N 秒时这样算）

```
成片帧数 = Σ voiceFrames + Σ buffer − (幕数−1) × TURN_FRAMES
```
- `TURN_FRAMES = 22`（翻书转场）
- `buffer` 必须 **> TURN_FRAMES**，多出来的部分就是两句人声之间的停顿（实测 `buffer=34` → 停顿 12 帧 ≈ 0.4 秒，听感刚好）
- 想凑 2 分钟（3600 帧）：23 幕 × 平均 151 帧配音时，`buffer=34` 正好落在 3789 帧（126 秒）
- 配音长度由文案字数决定，所以**先跑配音拿实测帧数，再倒推 buffer**，不要反过来

### 2c. 道具连续性（出图前必做，否则一定返工）

儿童绘本的"道具"（背上的口袋、手里的篮子、戴的帽子）**只要在某个镜头出现，就必须在剧情允许的每一幕都出现**。
否则观众会看到"一会儿有一会儿没有"。这是最容易被退回的问题之一。

出图前先写一张**道具状态表**，每一幕明确标 `有 / 无`，并检查状态变化的时刻是否对应剧情事件：

| 幕 | 剧情 | 道具状态 | 合理性 |
|---|---|---|---|
| 3 | 妈妈把袋子放到背上 | 从无→有 | ✅ 装载时刻 |
| 4–17 | 一直在送的路上 | 有 | ✅ |
| 18 | 送到磨坊 | 有→无 | ✅ 交付时刻 |
| 19+ | 空身回家 | 无 | ✅ |

配套两条硬要求：
- **复用图片时先查这张表**。同一个 `slug.jpg` 被复用到两幕，两幕的道具状态必须相同（最典型的坑：把"驮着货"的图复用到了"已交货"的那一幕）。
- **同一地点的不同时点要拆成两张图**。例如"在家"出现在装上袋子之前和之后，就不能用同一张图。
- 开场**钩子卡**如果用了后续剧情的画面，要么单独出一张不含道具细节的远景建立镜头，要么接受它和下一幕之间的状态跳变 —— 推荐前者。

出图后**必须**拼联络表人工核对一遍（顺带能发现错别字、多余英文、造型跑偏）：
```bash
python scripts/contact_sheet.py <slug> output/<slug>/_contact_sheet.png 5
```

### 2d. ⚠ 可数属性（花瓣数、个数）是道具连续性的**特殊死穴**（2026-10-01 血泪）

枚举状态（如七彩花的 `seven→six→five→…→bare`）在 `props.json` 里登记得再规范、提示词写得再明白，
**图片生成模型都不会遵守**。这不是配置问题，是扩散模型的固有局限。

**已用 5 组对照实验证实（第 8 集《七彩花》）：**

| 方案 | 结果 |
|---|---|
| ImageGen 图生图（`input_fidelity: high`） | ✗ 整幅重绘。花瓣数仍错、构图/人物位置全变、带「AI生成」水印 |
| ImageGen 图生图（普通） | ✗ 同上 |
| ImageGen 纯文生图（写明"正好六片、完全没有橙色"） | ✗ 画出 8 片且带橙色 |
| ImageGen 缺口/扇形描述（"左侧留大缺口"） | ✗ 理解成花瓣中间的洞，画成 13 片 |
| **美图 designkit（`designkit chat --image-file`）** | **✓ 有效**。s7 橙瓣被自然抹除、其余像素完好；s20 只剩一片垂落瓣，完美 |

**规律**：扩散模型对**"有无"敏感**（"有没有带袋子"能画对），对**"几个"不敏感**（"六片花瓣"必错）。
所以凡是画面里"数量"会随剧情变化的道具（花瓣数、果子数、蜡烛数……），**不要在设计阶段依赖 AI 出对**。

**可行的三条路（按推荐度）：**

1. **回避可数性（首选，零成本）** —— 分镜/字幕不要点名具体数量。
   - 反例：「只剩下最后一片花瓣」（观众会去数）
   - 正解：「花瓣一片片飘落」「花儿渐渐稀疏」——避免"几"这个信息
   - 代价：字幕改动要重跑配音 + 重渲视频。

2. **美图 designkit 后处理**（需要美豆额度，效果最好）
   ```bash
   designkit auth status --check          # 确认 connected
   designkit create-room                  # ← 每张图必须独立房间！多任务塞一个房间会丢产物
   designkit chat -p "[@input_image:ref]去除图片中的指定内容。把画面中七彩花花头上的橙色花瓣去掉一片，让花朵只剩六片彩色花瓣，其余花瓣、花茎、小动物和背景全部保持不变。" \
       --room-id <room_id> --image-file public/assets/<slug>/s7-give1.jpg
   designkit history-detail -r <room_id> --watch --yield-on-update   # 前台阻塞，禁止加 run_in_background
   designkit download -r <room_id> -o output/_petalfix/new
   ```
   - 事件：`history_update`（出图）→ `is_complete/next_action=done`（完成）
   - `recharge_required` = **美豆余额耗尽**，必须用户充值后 `designkit resume --room-id .. --task-id .. --after-seq .. --reason recharge`
   - 产物是 1088×1440 PNG，用 `prep_images.py` 同款逻辑转 1080×1440 JPEG 覆盖
   - ⚠ 美图也会偶发失败（第 8 集 s9/s10 处理不到位），**必须逐张人工核对**，不能假设全绿

3. **本地 OpenCV 后处理**（免费，但需逐张调参，不保证完美）
   - 常用思路都在 `output/_petalfix/*.py` 里留了脚本
   - 关键难点：**准确定位花心**。可用「距离变换最大内切圆」（`find_center.py`）或「双眼中点」（`detect_eyes.py`）；
     浅色花心 vs 冷色天空要用**色温**区分（花心 R≥B，天空 B>R）
   - 填充方式对比：径向拉伸 → 留放射条纹 ✗；inpaint 大遮罩 → 留糊块 ✗；最近非花像素 → 易采到米色纸边 ✗；
     **射线填充（沿半径向外、跳过所有彩色遮挡物、取第一处真实背景）→ 最干净** ✓
   - 花瓣彼此**相接无间隙**，所以"按角度分段数花瓣"不可靠；判数量要靠人工看联络表

**新增一集时的预防措施**：写分镜时先问一句——"这一幕的字幕有没有说'几片/几个'？"
如果有，要么改文案回避，要么预先规划好用美图后处理。**不要指望出图时能画对。**
约定：主角造型描述、道具描述（含"袋身没有任何文字图案"）在每一张的提示词里逐张重复写全，不要省。

**风格一致性**：ImageGen 单张独立生成，仅靠提示词尾巴维持风格，场景跨度大时会漂移
（《曹冲称象》s6 色相漂到 97°偏青冷，其余 21 张都在 32-46°暖黄区）。出图后必须跑
```bash
python scripts/check_tone.py <slug>            # 默认严判
python scripts/check_tone.py <slug> --loose    # 夜景/室内等剧情合理偏色时放宽
```
离群图处理：挑一张色调标准的**同场景图**作 image1，图生图重出（提示词保留原画面，`input_fidelity≈0.55`），
转码覆盖后重跑 check_tone + 重渲主视频。风格基准描述（暖黄/冷蓝等）在 `prompts.json` 的 `_styleTail` 里统一维护。

### 3. 插画（ImageGen，串行！）

```
size = 1024x1536，quality = high
提示词模板：
手绘水彩儿童绘本插画，竖构图。[画面，写清主角造型，保持全系列一致的描述]。
柔和蜡笔与水彩质感，暖色调，圆润造型，纸质纹理，童趣。无文字，无字母，无水印。
```
生成完转码入库：
```bash
"C:/Users/11273/.workbuddy/binaries/python/envs/default/Scripts/python.exe" scripts/prep_images.py <slug> "s1-xx,s2-xx,...,interact"
```

### 4. 数据与装配

复制 `src/stories/<上一集>/` → 改名，只改 `constants.ts`（文案/图片名/帧数），然后在 `src/Root.tsx` 注册。

### 5. 渲染

```bash
cd "D:/myproject/my-files/child_story_videos"
PATH="/c/Users/11273/.workbuddy/binaries/node/versions/22.22.2-3:$PATH"
"/c/Users/11273/.workbuddy/binaries/node/versions/22.22.2-3/npx.cmd" remotion render src/index.ts <slug> "output/<slug>/<slug>.mp4" \
  --jpeg-quality=85 --pixel-format=yuv420p --concurrency=4
# 封面
".../npx.cmd" remotion still src/index.ts cover-<slug> "output/<slug>/cover.png" --frame=0
```
渲染前先 `remotion compositions src/index.ts` 校验编译与时长。

## 必踩的坑

| 现象 | 原因 | 解法 |
|---|---|---|
| Bash 报 `dirname: command not found` / `head: command not found` / `mkdir: command not found` | 本会话的 Git Bash 缺 coreutils，PATH 是坏的 | 用 `node -e "require('fs')..."` 代替 ls/mkdir/mv；用**绝对路径**调 `python.exe` 与 `npx.cmd`；**不要接管道**（没有 head/tail） |
| PowerShell 工具看不到 stdout | 该工具输出捕获异常 | 同上，改用 Bash + 绝对路径 + node/python |
| ImageGen 并行时图片全落到一个目录、文件名互相覆盖 | 并行调用 output_dir 失效 + 同秒时间戳模板相同 | **必须串行单张调用** |
| 转码后画面和分镜对不上 | 中文文件名按字符串排序 ≠ 生成时间顺序 | `prep_images.py` 用正则提取 `YYYY-MM-DDTHH-MM-SS` 排序 |
| 淡化中画面被冲淡、透出奶油底色 | 两幕同时半透明 | 只让**上一幕淡出**，下一幕常驻 `opacity 1`；即 `fadeIn=0`（除首幕）+ **反序渲染** |
| 淡化完全不生效 / 整幕透明 | `fadeIn` 或 `fadeOut` 传了 0 却直接喂给 `interpolate`（输入区间两端相同 → NaN） | `SceneFade` 里 `<= 0` 要走 `opacity = 1` 分支 |
| 视频末尾多一段黑屏 | 淡化压缩了相邻场景起点 | `durationInFrames` 必须用 `timelineDuration()`，不能用 Σ(voiceFrames+buffer) |
| SVG 里 `url(#id)` 引用失效 | `React.useId()` 返回含冒号（`:r1:`） | `id.replace(/[^a-zA-Z0-9]/g, "")` 后再拼 |
| 首帧就崩 `Easing is not a function` | Remotion 只有 `Easing.sin`，没有 `Easing.sine` | 用 `Easing.sin` |
| `remotion compositions/render` 卡在下载 102MB Chrome Headless Shell，120s 超时被杀 | 每个新工程首次都要下载一次 | 先跑一次让它下完（约 2 分钟），或 `--browser-executable` 指向 `D:/myproject/my-files/remotion-videos/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe`（注意：`compositions` 命令下该 flag 实测未生效，仍会下载） |
| 渲染 shell 长时间不退出但 mp4 已生成 | remotion CLI 尾进程挂起 | 先查目标文件是否存在且大小稳定，视为完成即可 |
| 字体乱码 / 缺字 | 用网络字体（Google Fonts）在离线或墙内会失败 | 用系统字体：标题 `KaiTi/STKaiti`，正文 `Microsoft YaHei`，无需联网 |
| 用户嫌「长方形黑框」多余 | `HandDrawnFrame` 包了一圈手绘矩形边框 | 满幅插画的观感不需要这个边框——**默认不加**，`HandDrawnFrame.tsx` 保留但不在 `StoryScene` / `Cover` 里引用 |
| 用户嫌「方块挡住了背景」 | 标题/寓意/互动卡与封面用了奶油色圆角卡片（`Plaque`）兜文字 | 改成**描边文字直接压在插画上**（见「标题类文字」）；`Plaque` 已删除 |
| 用户嫌文字「整体偏暗」 | 描边文字用了纯深棕填充 | 改**渐变亮色**（金→橙），描边仍留白，另加一圈紧致暗色 `drop-shadow` 保证亮色在任何底色上立得住 |
| 主副标题层级读不出来 | 只靠字号区分，颜色/字体都一样 | 两个维度都拉开：主标暖金 + 站酷快乐体 vs 副标亮奶油白 + 楷体 |
| 细笔画字体（楷体）加描边后笔画被吞 | `-webkit-text-stroke` 沿字形中线描边、往里吃一半 | 描边减半（主标 13px → 楷体副标 6px）；或改用纯 `drop-shadow` 暗轮廓 |
| 自定义字体在成片里时好时坏 / 前几帧是别的字体 | 字体异步加载，没卡住渲染 | `delayRender()` + `continueRender()` 包住 `FontFace.load()` |
| **整片渲染跑到第 800 多帧崩**，报 `delayRender() "..." was called but not cleared after 28000ms` | `delayRender` 写在**模块作用域**，渲染器不记账，`continueRender` 成空操作。**still 单帧测试完全测不出来** | 把 `delayRender` 挪进组件 `useEffect`；字体改内联 data URI 去掉运行时请求；加载加超时兜底（`Promise.race`） |
| `FontFace` 报 `Invalid font data in ArrayBuffer` | 用老 UA 从 `fonts.googleapis.com` 拿的 `/l/font?kit=` 不是裸 TTF（magic `cc1a1700`） | 改用 `google/fonts` 仓库源文件（jsDelivr 镜像更稳），下载时校验 magic `00010000` |
| `FontFace` 只报 `NetworkError`，看不出原因 | 直接把 URL 交给 `FontFace`，它不透出状态码 | 先自己 `fetch` 成 ArrayBuffer 再构造 `FontFace` |
| 主标字体加粗后边缘发虚 | 站酷快乐体只有 400 一档，700 是浏览器合成加粗 | `fontWeight` 用 400 |
| 亮色文字在浅色天空上糊成一团 | 渐变起点是接近白的浅黄，且只靠白描边无暗轮廓 | 渐变从"实金"起跳；补 `drop-shadow(0 0 5px 深棕)` 暗轮廓 |
| 粗描边文字里侧有一圈假影 | 用了 `text-shadow`（只按字形轮廓算，不含描边） | 换 `filter: drop-shadow`（按渲染后 alpha 算，含描边） |
| 渐变文字描边出毛边 | 单层元素上同时用 `-webkit-text-stroke` 与 `background-clip: text` | 拆成**双层**：底层只描边、上层铺渐变 |
| 主角身上的道具「一会儿有一会儿没有」，与剧情对不上 | 出图时没维护道具状态，又复用了带道具的那张图 | 出图前写道具状态表（见「道具连续性」），复用图片前查表，出图后用 `contact_sheet.py` 核对 |
| AI 出的袋子上印了英文 `WHEAT` 一类字样 | 提示词只说"无文字"，没约束到道具本身 | 每张提示词都显式写「（袋身没有任何文字图案）」；出图后拼联络表核对 |
| ImageGen 出图**右下角带生成器水印**（"AI生成 / WORKBUDDY"），直接当封面交付不可用 | 水印是烘焙进图片的，且提示词管不住 | 出图后先看右下角。水印落在平滑水彩底纹上时，用**左侧等宽条水平镜像**补掉，接缝做 14px / 10px 羽化（见 `scripts/make_series_cover.py` 的 `remove_watermark()`）；若水印压在主体上，只能重新构图或裁切 |
| **封面标题溢出画布**（长标题右侧被切） | 封面主标写死 `fontSize={168}`，7 字标题需 ≈1152px > 可用 996px | 改 `fitCoverSize(text)` 自适应（见「封面主标」）；n≤6 仍为 168，输出不变 |
| **某个字的字形像错别字**（如「曹」写成草头式） | 站酷快乐体自带的**不规范字形**，不是缺字回退（cmap 里该码位有映射） | `splitGlyphFix()` 单字换 `STHupo`（见「封面主标」）；**替换 span 不能加 transform**，否则渐变填充丢失只剩描边 |
| **改了封面版式，某些集还是老样子** | `<slug>/Cover.tsx` 各集漂移 / `output/第N集-*/cover.png` 是旧产物 | `md5sum src/stories/*/Cover.tsx` 核对一致性；改版后**逐集重渲** `output/第N集-*/cover.png` 与 slug 镜像目录两处 |

> 已停用方案的坑（笔刷排线缝隙、3D 翻页的旋转方向/透视原点/`BASE≥90` 等）都收在各自的
> `<details>` 附录里，恢复对应效果时再去读。

## 关键参数速查

| 项 | 值 |
|---|---|
| FADE_FRAMES（交叉淡化） | 20（须 < 各幕 buffer） |
| buffer | 普通 32，寓意/互动卡 38（比 FADE_FRAMES 多出的 12 帧 = 两句人声之间的停顿） |
| 首末幕 | 首幕 `fadeIn=14`，末幕 `fadeOut=14`，中间幕 `fadeIn=0` / `fadeOut=FADE_FRAMES` |
| 揭示方式 | **无**——`StoryImage` 满幅平铺（`BrushReveal` 已停用） |
| 笔刷条数 / 系数（停用中） | count 20；JITTER 0.06 / AMP 0.26 / WIDTH 2.70（在 `handdrawn.ts`，`check_mask.js` 会解析它） |
| 底部字幕 | 白字 + 深色描边（`paintOrder: stroke fill`）+ 底部渐变压暗带；字幕安全区底部 300px |
| 标题 / 卡片 | **无背景色块**：渐变描边文字直接压在插画上（见「标题类文字」）；旧的奶油卡片 `Plaque` 已删除 |
| 配音 | `zh-CN-XiaoyiNeural` / rate `-25%` / pitch `+8Hz` |

## 系列总封面（1080×1080 方图）

区别于单集封面（3:4，跟着该集 composition 走），系列总封面是**跨集复用**的方图，用于主页/合集入口。

```bash
# 1) ImageGen 出 1024×1024 方图（提示词写「正方形构图」「画面干净，构图左右均衡」）
# 2) 合成标题
python scripts/make_series_cover.py <源图.png> output/series-cover/儿童绘本故事系列-封面.jpg
```

`scripts/make_series_cover.py` 做四件事：**去水印 → LANCZOS 放大到 1080 → 顶部提亮 → 叠渐变描边标题**（站酷快乐体主标 + 楷体副标，配色与正片卡片共用常量）。

- 题材选**「一本书 + 系列里的角色从书页里探出来」**——一眼说明是"系列"，且不强绑任何一集。
- ImageGen 只支持 `1024x1024` 这类档位，方图需求靠出 1024 再放大 5.5% 到 1080，肉眼无损。
- 文字排在**上部天空区**（低细节），别压住书和动物；顶部加 0.30 封顶的奶油提亮带帮文字压住浅底。
- 平台要求「≤5MB」时用 JPEG（`quality=93, subsampling=0`）——水彩插画实测 1080×1080 仅 0.53 MB，比 PNG 稳。

## 新增一集清单

0. **先写 `props.json` 的道具状态表**（哪几幕有道具、哪几幕是剧情上的装载/交付时刻），再动手出图
1. `gen_voice.py` 换 `PARTS` → 跑出 v1..vN.mp3 与实测帧数
2. ImageGen **串行**出图，**每张的完整提示词同步记进 `prompts.json`** → `prep_images.py` 转码入库
3. `python scripts/contact_sheet.py <slug> output/<slug>/_contact_sheet.png` 人工核对道具/造型/多余文字
4. 复制 `src/stories/<slug>/` → 改 `constants.ts`；补齐 `props.json` / `prompts.json` 的图片名
5. `Root.tsx` 注册 composition（视频 + 封面 Still）
6. `npm run precheck` 必须全绿 —— 这是渲染的前置条件（`remotion` 命令本身也会自动跑）
7. `remotion render` → `remotion still --frame=0`
8. 渲染后抽帧跑 `check_gap.py`，确认无残留缝隙
