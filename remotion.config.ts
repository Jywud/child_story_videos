import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Config } from "@remotion/cli/config";

/**
 * 渲染前强制预检 —— 这是"从源头防返工"的执行点。
 *
 * 每次 remotion render / still / compositions 都会先跑一遍静态校验：
 *   1. 分镜引用的图片、配音是否存在
 *   2. 每张图是否都在 props.json 里登记了道具状态
 *   3. 每张图是否有提示词留档，且带「无文字，无字母，无水印」
 *   4. 道具状态为 yes 的图，提示词是否约束了道具本身不带字
 *   5. 道具连续性：状态翻转是否只发生在 props.json 允许的那几幕
 *   6. 笔刷排线是否存在未覆盖的几何缝隙
 *
 * 任一项不过直接抛错中止，不再把问题留到成片里。
 * 临时跳过：SKIP_PRECHECK=1（仅在明确知道后果时用）
 */
if (!process.env.SKIP_PRECHECK) {
  try {
    // 从渲染命令参数里找出当前集的 slug（composition id / still id），
    // 传给 precheck，让风格校验只查正在渲染的这一集（历史集漂移不阻断新渲染）。
    const storiesDir = path.join(process.cwd(), "src", "stories");
    const slugs = fs.existsSync(storiesDir) ? fs.readdirSync(storiesDir) : [];
    // render 的 id 是 <slug>，still（封面）的 id 是 cover-<slug>，两种都要识别
    const targetSlug = process.argv.slice(2)
      .map((a) => a.replace(/^cover-/, ""))
      .find(
        (a) => slugs.includes(a) && fs.existsSync(path.join(process.cwd(), "public", "assets", a))
      );
    execFileSync(process.execPath, [
      path.join(process.cwd(), "scripts", "precheck.js"),
    ], { stdio: "inherit", env: { ...process.env, PRECHECK_SLUG: targetSlug || "" } });
  } catch {
    throw new Error(
      "预检未通过，已阻止渲染（见上方错误明细）。修复后重试；确需强行渲染请设 SKIP_PRECHECK=1"
    );
  }
}

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
