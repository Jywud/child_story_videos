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

const STEPS = [
  ["素材 / 道具连续性 / 提示词", "scripts/check_props.js"],
  // BrushReveal 目前已停用（插画不再走粉刷揭示），这项校验保留，随时可恢复该效果
  ["笔刷遮罩零缝隙（BrushReveal 停用中，保留）", "scripts/check_mask.js"],
];

let failed = 0;
for (const [label, script] of STEPS) {
  try {
    execFileSync(process.execPath, [path.join(process.cwd(), script)], {
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
