// @ts-check
/**
 * 渲染前预检总入口。任一项不过就退出码 1，remotion.config.ts 会据此拦住渲染。
 *
 * 这里放的是「改一次就完事」的静态校验。渲染后的像素级校验另跑 scripts/check_gap.py。
 *
 * 用法: node scripts/precheck.js   （或 npm run precheck）
 * 临时跳过: 环境变量 SKIP_PRECHECK=1
 */
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// 项目固定 python（含 numpy/Pillow）；按优先级找第一个存在的
const PYTHON_CANDIDATES = [
  "C:/Users/11273/.workbuddy/binaries/python/envs/default/Scripts/python.exe",
  "python",
];
const PY = PYTHON_CANDIDATES.find((p) =>
  p === "python" ? true : fs.existsSync(p)
);

// [标签, 脚本, 解释器]  —— 解释器省略则用 node
const STEPS = [
  ["素材 / 道具连续性 / 提示词", "scripts/check_props.js"],
  // BrushReveal 目前已停用（插画不再走粉刷揭示），这项校验保留，随时可恢复该效果
  ["笔刷遮罩零缝隙（BrushReveal 停用中，保留）", "scripts/check_mask.js"],
  // 风格一致性：抓色调/绿像素漂移图（用户要求全系列手绘风格统一，必须渲染前拦截）
  // 只查当前渲染的这一集（remotion.config.ts 从命令参数注入 PRECHECK_SLUG），历史集不阻断
  // 户外/夜景合理冷绿的图在 prompts.json 的 _toneExempt 白名单豁免
  ["插画风格一致性（色调/绿像素漂移）", "scripts/check_tone.py", PY, process.env.PRECHECK_SLUG || ""],
];

let failed = 0;
for (const [label, script, interpreter, extraArg] of STEPS) {
  try {
    const cmd = interpreter || process.execPath;
    const args = [path.join(process.cwd(), script)];
    if (extraArg) args.push(extraArg);
    execFileSync(cmd, args, {
      stdio: "inherit",
    });
  } catch {
    failed++;
    console.log(`\n[预检未通过] ${label}`);
  }
}

if (failed) {
  console.log(
    `\n共 ${failed} 项预检未通过。请先修复；确需强行渲染请设 SKIP_PRECHECK=1。`
  );
  process.exit(1);
}
console.log("\n预检全部通过。");
