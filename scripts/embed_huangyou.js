// @ts-check
/**
 * 把站酷庆科黄油体内联成 data URI，生成 src/lib/huangyouFontData.ts。
 * 与 embed_font.js 同机制：避免 remotion 多标签页并发拉字体导致 delayRender 超时。
 * 用法: node scripts/embed_huangyou.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TTF = path.join(
  ROOT,
  "public",
  "assets",
  "fonts",
  "ZCOOLQingKeHuangYou-Regular.ttf"
);
const OUT = path.join(ROOT, "src", "lib", "huangyouFontData.ts");

if (!fs.existsSync(TTF)) {
  console.error(`找不到字体文件 ${TTF}`);
  process.exit(1);
}

const buf = fs.readFileSync(TTF);
const tag = buf.readUInt32BE(0);
if (tag !== 0x00010000) {
  console.error(`字体 magic 不是 00010000（实际 ${tag.toString(16)}），拒绝内联`);
  process.exit(1);
}

const b64 = buf.toString("base64");
const file = `// 由 scripts/embed_huangyou.js 自动生成，请勿手改。
// 源文件：public/assets/fonts/ZCOOLQingKeHuangYou-Regular.ttf（${(buf.length / 1048576).toFixed(2)} MB）
// 封面标题专用童趣字体（OFL 免费商用）。内联原因见 scripts/embed_font.js。
export const HUANGYOU_FONT_DATA_URI =
  "data:font/ttf;base64,${b64}";
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, file, "utf8");
console.log(
  `生成 ${OUT}  ${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB（含 base64 膨胀）`
);
