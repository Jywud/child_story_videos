import { DISPLAY_FONT_DATA_URI } from "./displayFontData";

/**
 * 站酷快乐体（ZCOOL KuaiLe）：圆润、手写感强，比系统圆黑更贴绘本调性。
 *
 * 字体以内联 data URI 的形式随 bundle 发给浏览器（见 scripts/embed_font.js），
 * **不走运行时网络请求**。原因：`remotion render` 默认 --concurrency=4 会开 4 个标签页，
 * 每页都在模块加载时拉一次 1.44MB 字体，实测某一页拉不完就触发
 * `delayRender() was called but not cleared after 28000ms`，整条渲染崩掉。
 *
 * ⚠️ delayRender 必须由**调用方在组件 useEffect 里**注册（见 Root.tsx），
 * 不要在本文件的模块作用域注册：模块作用域的 handle 不会被渲染器正确记账，
 * continueRender 变成空操作，必然超时。这个坑 still 命令看不出来
 * （单帧渲染在超时前就结束了），只有整片渲染才会暴出来。
 */
export const FONT_DISPLAY_NAME = "ZCOOL KuaiLe";

/** 主标题字族；加载失败时回退到系统圆黑 */
export const FONT_DISPLAY = `"${FONT_DISPLAY_NAME}", "Microsoft YaHei", sans-serif`;

const LOAD_TIMEOUT_MS = 15000;

let loading: Promise<void> | null = null;

/** 加载字体。不碰 delayRender，由调用方负责等待。 */
export const loadDisplayFont = (): Promise<void> => {
  if (loading) return loading;
  if (typeof document === "undefined" || !("FontFace" in window)) {
    return Promise.resolve();
  }

  const load = (async () => {
    const face = new FontFace(
      FONT_DISPLAY_NAME,
      `url(${DISPLAY_FONT_DATA_URI})`,
      { weight: "400", style: "normal" }
    );
    document.fonts.add(await face.load());
  })();

  // 兜底超时：万一字体解析卡住，宁可回退字体也不要卡死整个渲染
  loading = Promise.race([
    load,
    new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error(`字体加载超过 ${LOAD_TIMEOUT_MS}ms，改用回退字体`)),
        LOAD_TIMEOUT_MS
      )
    ),
  ]).catch((err) => {
    console.error("站酷快乐体加载失败，将回退到 Microsoft YaHei：", err);
  });

  return loading;
};
