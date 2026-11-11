// @ts-check
/**
 * 把站酷快乐体内联成 data URI，生成 src/lib/displayFontData.ts。
 *
 * 为什么不用 staticFile + fetch：
 *   remotion render 默认 --concurrency=4，会开 4 个标签页，
 *   每页都要在模块加载时拉一次 1.44MB 字体。实测会出现某一页拉不完，
 *   触发 `delayRender() "加载站酷快乐体" was called but not cleared after 28000ms`，
 *   整个渲染在第 832 帧崩掉（still 单页渲染则正常，所以很容易误判）。
 *   内联后字体随 bundle 一起到浏览器，没有运行时请求，也就没有这个竞态。
 *
 * 用法: node scripts/embed_font.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TTF = path.join(
  ROOT,
  "public",
  "assets",
  "fonts",
  "ZCOOLKuaiLe-Regular.ttf"
);
const OUT = path.join(ROOT, "src", "lib", "displayFontData.ts");

if (!fs.existsSync(TTF)) {
  console.error(`找不到字体文件 ${TTF}\n先跑 node scripts/fetch_font.js`);
  process.exit(1);
}

const buf = fs.readFileSync(TTF);
const tag = buf.readUInt32BE(0);
if (tag !== 0x00010000) {
  console.error(`字体 magic 不是 00010000（实际 ${tag.toString(16)}），拒绝内联`);
  process.exit(1);
}

const b64 = buf.toString("base64");

const file = `// 由 scripts/embed_font.js 自动生成，请勿手改。
// 源文件：public/assets/fonts/ZCOOLKuaiLe-Regular.ttf（${(buf.length / 1048576).toFixed(2)} MB）
// 内联原因见 scripts/embed_font.js 顶部注释：避免多标签页并发拉字体导致 delayRender 超时。
export const DISPLAY_FONT_DATA_URI =
  "data:font/ttf;base64,${b64}";
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, file, "utf8");
console.log(
  `生成 ${OUT}  ${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB（含 base64 膨胀）`
);
