// @ts-check
/**
 * 图片 / 道具 / 提示词 一致性校验器。
 *
 * 背景：曾经出过「小马背上的麦子袋一会儿有一会儿没有」和「布袋上印出英文 WHEAT」两次返工。
 * 根因都不是手滑，而是**没有可检查的事实来源**。于是把两件事变成声明式文件 + 自动校验：
 *   - props.json   图片 -> 道具状态，以及允许发生状态变化的幕
 *   - prompts.json 每张图出图时的完整提示词
 *
 * 状态取值分两类：
 *   A. 三态（默认，向后兼容）：yes / no / hidden
 *   B. 枚举态：道具本身有多个成长/变化阶段时用（如蝌蚪的腿：none → hind → four → frog）。
 *      在 props.json 的该道具上写成 { "desc": "...", "values": [...], "absent": [...] } 即可。
 *      此时合法值 = values + hidden（hidden 永远合法，表示构图看不到、不参与判定），
 *      yes / no 不再适用（会明确报错并列出可用值）。
 *      `absent` 列出「画面里其实没有这个东西」的阶段值（如 none），只用于决定要不要
 *      要求提示词写「没有任何文字图案」；不写则视为所有阶段都看得见。
 *
 * 校验内容：
 *   1. 分镜引用的图片、配音文件是否真实存在
 *   2. 每张被引用的图是否都在 props.json 登记（漏登记直接报错，逼你显式声明）
 *   3. 每张图是否有提示词留档，且提示词必须带「无文字，无字母，无水印」
 *   4. 道具状态为「存在类」的图，提示词必须显式约束道具本身不带字（防 WHEAT 类字样）
 *   5. 道具连续性：状态能否在某一幕翻转，只取决于该幕是否在 allowChangeAt 里
 *   6. 枚举态额外校验：每个阶段值都必须在某一幕真实出现过（防止写了阶段却没用上，
 *      那样说明分镜漏了一环成长）
 *
 * 用法: node scripts/check_props.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const STORIES = path.join(ROOT, "src", "stories");
const CARD_VARIANTS = new Set(["title", "moral", "interact"]);
/** 三态写法，仅用于未声明 values 的道具 */
const TRISTATE = ["yes", "no", "hidden"];

const problems = [];
const warnings = [];
const fail = (m) => problems.push(m);
const warn = (m) => warnings.push(m);

/**
 * 把 props.json 里的道具定义归一化成
 * { name, desc, values, absent, isEnum, textClause } 。
 *   "sack": "小马背上的粗布袋"                      -> 三态
 *   { "desc": "...", "values": [...], "absent": [...] } -> 枚举态
 * textClause: 是否要求提示词写「没有任何文字图案」。默认 true（防 WHEAT 类问题）；
 *   腿、尾巴这类不可能印字的道具可写 "textClause": false 关掉，避免无意义的约束。
 */
function normalizeProp(name, def) {
  if (typeof def === "string") {
    return { name, desc: def, values: null, absent: [], isEnum: false, textClause: true, transient: false };
  }
  const values = Array.isArray(def.values) ? def.values : null;
  return {
    name,
    desc: def.desc || def.label || "",
    values,
    absent: Array.isArray(def.absent) ? def.absent : [],
    isEnum: !!values,
    textClause: def.textClause !== false,
    /** transient: 一次性道具（如随行礼盒）——只在登记 yes 的幕出现，其后转 no 是「退场」而非断裂 */
    transient: def.transient === true,
  };
}

/** 某道具的全部合法取值 */
const legalValues = (prop) =>
  prop.isEnum ? [...prop.values, "hidden"] : TRISTATE;

/** 该取值是否表示「道具确实在画面里看得见」——决定要不要查提示词的无字约束 */
const isPresent = (prop, v) => {
  if (v === "hidden") return false;
  if (prop.isEnum) return !prop.absent.includes(v);
  return v === "yes";
};

function parseScenes(src) {
  const hits = [];
  const re = /key:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) hits.push({ key: m[1], at: m.index });

  return hits.map((h, i) => {
    const block = src.slice(h.at, i + 1 < hits.length ? hits[i + 1].at : src.length);
    const img = /image:\s*`\$\{[A-Z]\}\/([^`]+)`/.exec(block);
    const variant = /variant:\s*"([^"]+)"/.exec(block);
    const audio = /audio:\s*(null|`\$\{[A-Z]\}\/([^`]+)`)/.exec(block);
    return {
      key: h.key,
      image: img ? img[1] : null,
      variant: variant ? variant[1] : null,
      audio: audio ? (audio[1] === "null" ? null : audio[2]) : null,
    };
  });
}

function checkStory(dir) {
  const slug = path.basename(dir);
  const constPath = path.join(dir, "constants.ts");
  if (!fs.existsSync(constPath)) return null;

  const src = fs.readFileSync(constPath, "utf8");
  const assetDir = /const\s+[A-Z]\s*=\s*"([^"]+)"/.exec(src);
  const assets = assetDir ? assetDir[1] : slug;
  const scenes = parseScenes(src);

  if (!scenes.length) {
    fail(`[${slug}] constants.ts 里没解析到任何 scene（key/image 结构变了）`);
    return null;
  }

  // ---- 声明式文件必须存在 ----
  const propsPath = path.join(dir, "props.json");
  const promptsPath = path.join(dir, "prompts.json");
  for (const [p, label] of [
    [propsPath, "props.json（图片->道具状态清单）"],
    [promptsPath, "prompts.json（提示词留档）"],
  ]) {
    if (!fs.existsSync(p)) {
      fail(
        `[${slug}] 缺少 ${label}。这是防返工的强制声明文件，不能省。\n` +
          `        建好后重跑；确需临时跳过请设 SKIP_PRECHECK=1`
      );
      return null;
    }
  }

  const manifest = JSON.parse(fs.readFileSync(propsPath, "utf8"));
  const promptBook = JSON.parse(fs.readFileSync(promptsPath, "utf8"));
  const rawProps = manifest.props || {};
  const props = Object.keys(rawProps).map((n) => normalizeProp(n, rawProps[n]));
  const propNames = props.map((p) => p.name);
  const inventory = manifest.images || {};
  const prompts = promptBook.images || {};
  const allowChange = new Map(
    (manifest.allowChangeAt || []).map((a) => [a.scene, a.why])
  );
  const noTextClause = promptBook._noTextClause || "无文字，无字母，无水印";
  const propClause = promptBook._propClause || "没有任何文字图案";

  const publicDir = path.join(ROOT, "public", "assets", assets);
  const usedImages = new Set();

  // ---- 逐幕检查素材与声明 ----
  const rows = [];
  scenes.forEach((s, i) => {
    const n = i + 1;
    if (!s.image) {
      fail(`[${slug}] 第 ${n} 幕（${s.key}）没解析到 image`);
      return;
    }
    usedImages.add(s.image);

    if (!fs.existsSync(path.join(publicDir, s.image))) {
      fail(`[${slug}] 第 ${n} 幕图片不存在：public/assets/${assets}/${s.image}`);
    }
    if (s.audio && !fs.existsSync(path.join(publicDir, s.audio))) {
      fail(`[${slug}] 第 ${n} 幕配音不存在：public/assets/${assets}/${s.audio}`);
    }

    const inv = inventory[s.image];
    if (!inv) {
      fail(
        `[${slug}] 第 ${n} 幕的 ${s.image} 未在 props.json 登记。` +
          `每张图都要显式写清道具状态（没有就写空对象），不允许漏。`
      );
    }

    const prompt = prompts[s.image];
    if (!prompt) {
      fail(`[${slug}] 第 ${n} 幕的 ${s.image} 没有提示词留档（prompts.json）`);
    } else {
      if (!prompt.includes(noTextClause)) {
        fail(
          `[${slug}] ${s.image} 的提示词缺少「${noTextClause}」，会出现英文字/水印`
        );
      }
      for (const prop of props) {
        if (!prop.textClause) continue;
        if (inv && isPresent(prop, inv[prop.name]) && !prompt.includes(propClause)) {
          fail(
            `[${slug}] ${s.image} 画面里有道具「${prop.name}」，但提示词没有约束它不带字。` +
              `必须写明「${propClause}」，否则袋子上会印出 WHEAT 这类英文。`
          );
        }
      }
    }

    rows.push({
      n,
      key: s.key,
      image: s.image,
      variant: s.variant,
      exempt: CARD_VARIANTS.has(s.variant || ""),
      states: propNames.map((p) => (inv ? inv[p] : undefined)),
    });
  });

  // ---- 道具连续性 ----
  const triggered = new Set();
  /** 枚举态道具：记录每个阶段值是否真实出现过 */
  const seenStages = new Map(props.filter((p) => p.isEnum).map((p) => [p.name, new Set()]));

  for (let pi = 0; pi < propNames.length; pi++) {
    const prop = props[pi];
    const legal = legalValues(prop);
    let cur = null;
    for (const r of rows) {
      const st = r.states[pi];
      if (st !== undefined) {
        if (!legal.includes(st)) {
          fail(
            `[${slug}] 第 ${r.n} 幕 ${r.image} 的道具「${prop.name}」取值非法：${st}\n` +
              `        → 合法值：${legal.join(" / ")}`
          );
          continue;
        }
        if (prop.isEnum && st !== "hidden") seenStages.get(prop.name).add(st);
      }
      if (r.exempt) continue; // 卡片幕（钩子/寓意/互动）不算叙事时间线
      if (st === "hidden") continue; // 构图看不到，不参与判定
      if (cur === null) {
        cur = st;
        continue;
      }
      if (st !== cur) {
        if (allowChange.has(r.n)) {
          triggered.add(r.n);
          cur = st;
        } else if (
          prop.transient &&
          cur === "yes" &&
          st === "no" &&
          !rows.slice(0, r.n).some(
            (prev, i) => !prev.exempt && prev.states[pi] === "yes" &&
              rows.slice(i + 1, r.n - 1).some((mid) => !mid.exempt && mid.states[pi] === "yes")
          ) === false
        ) {
          // transient 道具：yes → no 视为退场。仅当此前 yes 是「最后一段连续出现」时放行。
          fail(
            `[${slug}] 道具退场后又出现：第 ${r.n} 幕（${r.key} / ${r.image}）` +
              `道具「${prop.name}」是 transient（一次性）道具，退场后不应再回到画面。`
          );
          cur = st;
        } else if (prop.transient && cur === "yes" && st === "no") {
          triggered.add(r.n); // 合法退场，静默放行
          cur = st;
        } else {
          fail(
            `[${slug}] 道具连续性断裂：第 ${r.n} 幕（${r.key} / ${r.image}）` +
              `道具「${prop.name}」从 ${cur} 变成 ${st}，但这一幕不在 allowChangeAt 里。\n` +
              `        → 要么换一张道具状态正确的图，要么确认这是剧情事件并在 props.json 里显式豁免`
          );
          cur = st;
        }
      }
    }
  }

  // ---- 枚举态：每个阶段都必须在某一幕真实出现过 ----
  for (const prop of props.filter((p) => p.isEnum)) {
    const seen = seenStages.get(prop.name);
    const missing = prop.values.filter((v) => !seen.has(v));
    if (missing.length) {
      fail(
        `[${slug}] 道具「${prop.name}」声明了阶段 ${prop.values.join(" → ")}，` +
          `但 ${missing.join(" / ")} 从未在分镜里出现。\n` +
          `        → 说明分镜漏了这一环成长（或声明写错了），连续性检查会形同虚设`
      );
    }
    // 阶段顺序必须与声明顺序一致，不能倒着长回去
    const order = prop.values;
    const seq = [];
    for (const r of rows) {
      if (r.exempt) continue;
      const st = r.states[propNames.indexOf(prop.name)];
      if (st === undefined || st === "hidden") continue;
      if (seq[seq.length - 1] !== st) seq.push(st);
    }
    for (let i = 1; i < seq.length; i++) {
      if (order.indexOf(seq[i]) < order.indexOf(seq[i - 1])) {
        fail(
          `[${slug}] 道具「${prop.name}」的阶段倒退了：` +
            `${seq[i - 1]} → ${seq[i]}（声明顺序是 ${order.join(" → ")}）。\n` +
            `        → 成长类道具不能逆序，检查分镜或 props.json`
        );
        break;
      }
    }
  }

  for (const [scene, why] of allowChange) {
    if (!triggered.has(scene)) {
      warn(`[${slug}] allowChangeAt 里的第 ${scene} 幕（${why}）实际没触发状态变化，可以删掉`);
    }
  }
  for (const img of Object.keys(inventory)) {
    if (!usedImages.has(img)) warn(`[${slug}] props.json 里的 ${img} 没被任何一幕引用`);
  }
  for (const img of Object.keys(prompts)) {
    if (!usedImages.has(img)) warn(`[${slug}] prompts.json 里的 ${img} 没被任何一幕引用`);
  }

  return { slug, rows, props };
}

// ---------------- main ----------------
if (!fs.existsSync(STORIES)) {
  console.log("没有 src/stories 目录，跳过道具校验");
  process.exit(0);
}

const results = [];
for (const name of fs.readdirSync(STORIES)) {
  const dir = path.join(STORIES, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const r = checkStory(dir);
  if (r) results.push(r);
}

for (const { slug, rows, props } of results) {
  console.log(`\n=== ${slug} 道具连续性 ===`);
  for (const p of props) {
    if (p.isEnum) {
      console.log(`  道具「${p.name}」阶段：${p.values.join(" → ")}  （hidden = 构图看不到）`);
    }
  }
  console.log(
    `幕  图片                        variant     卡片豁免  ` +
    props.map((p) => p.name).join("  ")
  );
  for (const r of rows) {
    console.log(
      `${String(r.n).padStart(2, " ")}  ${r.image.padEnd(26, " ")}  ` +
        `${(r.variant || "-").padEnd(10, " ")}  ${r.exempt ? "  是   " : "  否   "}  ` +
        r.states.map((s) => String(s ?? "!未登记").padEnd(6, " ")).join("  ")
    );
  }
}

console.log("");
for (const w of warnings) console.log(`提示: ${w}`);
if (problems.length) {
  console.log("");
  for (const p of problems) console.log(`错误: ${p}`);
  console.log(`\n预检失败：${problems.length} 项。`);
  process.exit(1);
}
console.log("道具 / 提示词校验通过。");
