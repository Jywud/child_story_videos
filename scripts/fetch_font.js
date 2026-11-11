// @ts-check
/**
 * 下载站酷快乐体到本地 public/assets/fonts/。
 *
 * 为什么要本地化，而不是运行时用 @remotion/google-fonts：
 *  - 中文在 Google Fonts 是拆成上百个 unicode-range 子集分发的，
 *    渲染时按需分批拉取，网络一抖就会静默回退到系统字体，出片才发现掉字；
 *  - 本地放一份 TTF，离线也能渲染，结果确定。
 *
 * ⚠️ 不要用 fonts.googleapis.com 那个"老浏览器 UA 拿全量 TTF"的偏方：
 *    实测返回的 `/l/font?kit=` 内容不是裸 TTF（magic 是 cc1a1700），
 *    FontFace 会报 `Invalid font data in ArrayBuffer`。
 *    直接用 google/fonts 官方仓库里的源文件，是标准 sfnt（magic 00010000）。
 *
 * 用法: node scripts/fetch_font.js
 */
const fs = require("fs");
const path = require("path");

const SOURCES = [
  "https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf",
];
const OUT = path.join(
  process.cwd(),
  "public",
  "assets",
  "fonts",
  "ZCOOLKuaiLe-Regular.ttf"
);

/** sfnt 有效 magic：00010000 (TrueType) / 4F54544F ('OTTO') / 74727565 ('true') */
const isValidFont = (buf) => {
  const tag = buf.readUInt32BE(0);
  return tag === 0x00010000 || tag === 0x4f54544f || tag === 0x74727565;
};

(async () => {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`✗ ${res.status} ${url}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isValidFont(buf)) {
        console.error(`✗ 不是有效字体（magic ${buf.subarray(0, 4).toString("hex")}）${url}`);
        continue;
      }
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, buf);
      console.log(
        `saved ${OUT}  ${(buf.length / 1048576).toFixed(2)} MB  from ${url}`
      );
      return;
    } catch (err) {
      console.error(`✗ ${err.message}  ${url}`);
    }
  }
  console.error("全部源都失败了");
  process.exit(1);
})();

