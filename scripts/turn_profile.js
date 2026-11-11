// @ts-check
/**
 * 翻页运动曲线分析器。
 *
 * 参数直接从 src/components/PageTurn.tsx 解析，避免两处漂移。
 * 输出每个 p 下"下一页已露出多少百分比"，用来判断运动是否摊匀，
 * 而不是靠反复渲染去猜（一次渲染 25 秒，这个脚本 0 秒）。
 *
 * 用法: node scripts/turn_profile.js [--try BASE,CURL,P]
 */
const fs = require("fs");
const path = require("path");

const W = 1080;
const src = fs.readFileSync(
  path.join(process.cwd(), "src", "components", "PageTurn.tsx"),
  "utf8"
);
const get = (name) => {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)\\s*;`).exec(src);
  if (!m) throw new Error(`无法从 PageTurn.tsx 解析 ${name}`);
  return Number(m[1]);
};
const SLICES = get("SLICES");
const P = get("SPINE_P");
const B = get("BASE");
const CURL = get("CURL");

const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

/** 返回下一页已露出的宽度（px） */
function revealed(e, base, curl, persp) {
  const sw = W / SLICES;
  const rad = (d) => (d * Math.PI) / 180;
  let x = 0;
  let z = 0;
  let maxProj = 0;
  for (let i = 0; i < SLICES; i++) {
    const u = (i + 0.5) / SLICES;
    const beta = e * (base + curl * Math.pow(u, 1.5));
    const ex = x + sw * Math.cos(rad(beta));
    const ez = z + sw * Math.sin(rad(beta));
    if (ez < persp - 1) maxProj = Math.max(maxProj, (ex * persp) / (persp - ez));
    x = ex;
    z = ez;
  }
  return Math.max(0, W - maxProj);
}

function report(label, base, curl, persp) {
  const row = [];
  for (let i = 0; i <= 10; i++) {
    const p = i / 10;
    row.push(((revealed(easeInOutSine(p), base, curl, persp) / W) * 100).toFixed(0).padStart(3));
  }
  // 相邻 10% 之间的最大跃变 —— 越大说明越"一次性塌掉"
  const nums = row.map((s) => Number(s));
  let jump = 0;
  for (let i = 1; i < nums.length; i++) jump = Math.max(jump, nums[i] - nums[i - 1]);
  console.log(`${label.padEnd(30)} p:0  10  20  30  40  50  60  70  80  90 100  最大跃变`);
  console.log(`${"".padEnd(30)}   ${row.join(" ")}  ${String(jump).padStart(6)}`);
}

console.log(`当前参数：SLICES=${SLICES} SPINE_P=${P} BASE=${B} CURL=${CURL}\n`);
report("当前", B, CURL, P);

const tryArg = process.argv.indexOf("--try");
if (tryArg > -1 && process.argv[tryArg + 1]) {
  const [b, c, p] = process.argv[tryArg + 1].split(",").map(Number);
  console.log("");
  report(`候选 BASE=${b} CURL=${c} P=${p}`, b, c, p);
}

if (process.argv.includes("--scan")) {
  console.log("");
  console.log("硬约束：e=1 时靠书脊那一片必须转过 90°（BASE ≥ 90），否则旧页永远走不干净。");
  let best = null;
  for (const persp of [2600, 3600, 4600, 6000, 9000]) {
    for (const base of [90, 96, 104, 112]) {
      for (const curl of [70, 88, 110, 132, 155]) {
        const nums = [];
        for (let i = 0; i <= 10; i++) {
          nums.push((revealed(easeInOutSine(i / 10), base, curl, persp) / W) * 100);
        }
        let jump = 0;
        for (let i = 1; i < nums.length; i++) jump = Math.max(jump, nums[i] - nums[i - 1]);
        const tail = nums[10]; // 收尾时露出多少，必须接近 100
        const at40 = nums[4];
        // 追：跃变小 + 收尾干净；p=0.4 前别露太多（否则前半段没戏看）
        const score =
          jump + Math.max(0, 100 - tail) * 2 + Math.max(0, at40 - 30) * 1.2;
        if (!best || score < best.score) {
          best = { score, base, curl, persp, jump, tail, at40 };
        }
      }
    }
  }
  console.log(
    `推荐：BASE=${best.base} CURL=${best.curl} SPINE_P=${best.persp}\n` +
      `      最大跃变 ${best.jump.toFixed(0)}% / p=1 露出 ${best.tail.toFixed(0)}% / p=0.4 露出 ${best.at40.toFixed(0)}%`
  );
  console.log("");
  report(
    `候选 BASE=${best.base} CURL=${best.curl} P=${best.persp}`,
    best.base,
    best.curl,
    best.persp
  );
}
