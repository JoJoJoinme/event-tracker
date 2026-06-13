const simpleSchema = {
  layouts: ["big_time_four_fields", "minimal_center", "top_time_grid"],
  backgrounds: ["black", "deep_navy"],
  accentColors: ["cyan", "green", "orange"],
  timeColors: ["white", "soft_white"],
  fieldSets: [
    ["date", "battery", "heart_rate", "steps"],
    ["date", "battery", "weather", "heart_rate"],
    ["date", "battery", "body_battery", "steps"]
  ]
};

const complexSchema = {
  layouts: ["big_time_four_fields", "minimal_center", "top_time_grid", "ring_dashboard", "classic_ticks"],
  backgrounds: ["black", "deep_navy", "graphite", "warm_gray", "white"],
  accentColors: ["cyan", "green", "orange", "blue", "purple", "red"],
  timeColors: ["white", "soft_white", "cyan", "green", "black"],
  fieldSets: [
    ["date", "battery", "heart_rate", "steps"],
    ["date", "battery", "weather", "heart_rate"],
    ["date", "battery", "body_battery", "steps"],
    ["date", "sunset", "heart_rate", "battery"],
    ["battery", "recovery", "weekly_run", "heart_rate"],
    ["date", "steps", "calories", "battery", "heart_rate", "weather"],
    ["date", "battery"],
    ["heart_rate", "pace", "distance", "battery"]
  ]
};

const fieldLabels = {
  date: "日期", battery: "电量", heart_rate: "心率", steps: "步数", weather: "天气",
  body_battery: "身体电量", sunset: "日落", recovery: "恢复", weekly_run: "周跑量",
  calories: "卡路里", pace: "配速", distance: "距离"
};

const fieldValues = {
  date: "6月13日 周六", battery: "76%", heart_rate: "82", steps: "8.6k", weather: "28°",
  body_battery: "63", sunset: "19:08", recovery: "22h", weekly_run: "18.4k",
  calories: "450", pace: "5'42\"", distance: "4.2k"
};

const fieldIcons = {
  date: "CAL", battery: "BAT", heart_rate: "HR", steps: "STP", weather: "WX",
  body_battery: "BB", sunset: "SUN", recovery: "REC", weekly_run: "RUN",
  calories: "KCAL", pace: "PACE", distance: "DIST"
};

const layoutLabels = {
  big_time_four_fields: "大时间 + 四字段",
  minimal_center: "极简居中",
  top_time_grid: "顶部时间 + 网格",
  ring_dashboard: "圆环数据仪表",
  classic_ticks: "传统刻度"
};

const colors = {
  black: "#030406", deep_navy: "#071422", graphite: "#161a20", warm_gray: "#e6dfd4", white: "#f4f4ef",
  cyan: "#35d4ff", green: "#7CFF8A", orange: "#ffb35c", blue: "#6796ff", purple: "#b38cff", red: "#ff6d6d",
  soft_white: "#e8edf3"
};

const bgLabels = { black: "黑底", deep_navy: "深蓝", graphite: "石墨", warm_gray: "暖灰", white: "白底" };
const colorLabels = { cyan: "青蓝", green: "绿色", orange: "橙色", blue: "蓝色", purple: "紫色", red: "红色", white: "白色", soft_white: "柔白", black: "黑色" };

const $ = (id) => document.getElementById(id);
let currentCandidates = [];
let selectedId = null;

function init() {
  $("schemaInput").value = JSON.stringify(complexSchema, null, 2);
  $("generateBtn").addEventListener("click", generate);
  $("resetBtn").addEventListener("click", () => location.reload());
  $("loadSimple").addEventListener("click", () => { $("schemaInput").value = JSON.stringify(simpleSchema, null, 2); generate(); });
  $("loadComplex").addEventListener("click", () => { $("schemaInput").value = JSON.stringify(complexSchema, null, 2); generate(); });
  $("limitSelect").addEventListener("change", renderCards);
  ["scenario", "density", "batteryPriority", "stylePref", "secondsPref"].forEach(id => $(id).addEventListener("change", generate));
  generate();
}

function parseSchema() {
  try {
    const schema = JSON.parse($("schemaInput").value);
    for (const key of ["layouts", "backgrounds", "accentColors", "timeColors", "fieldSets"]) {
      if (!Array.isArray(schema[key])) throw new Error(`${key} must be an array`);
    }
    return schema;
  } catch (e) {
    alert("Schema 格式错误：" + e.message);
    return null;
  }
}

function seededNoise(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return Math.abs(h % 1000) / 1000;
}

function sampleCandidates(schema, max = 260) {
  const all = [];
  let id = 1;
  for (const layout of schema.layouts) {
    for (const bg of schema.backgrounds) {
      for (const ac of schema.accentColors) {
        for (const tc of schema.timeColors) {
          for (const fs of schema.fieldSets) {
            all.push({ id: id++, layout, bg, ac, tc, fs });
          }
        }
      }
    }
  }
  if (all.length <= max) return all;
  return all
    .map(c => ({ ...c, pick: seededNoise(JSON.stringify(c)) }))
    .sort((a, b) => a.pick - b.pick)
    .slice(0, max);
}

function contrastScore(bg, tc) {
  const darkBg = ["black", "deep_navy", "graphite"].includes(bg);
  const lightBg = ["white", "warm_gray"].includes(bg);
  if (darkBg && ["white", "soft_white", "cyan", "green"].includes(tc)) return 96;
  if (lightBg && tc === "black") return 93;
  if (darkBg && tc === "orange") return 82;
  if (lightBg && ["blue", "purple", "red"].includes(tc)) return 72;
  return 42;
}

function scoreCandidate(c) {
  const scenario = $("scenario").value;
  const density = $("density").value;
  const batteryPriority = $("batteryPriority").value;
  const stylePref = $("stylePref").value;
  const secondsPref = $("secondsPref").value;
  const fieldCount = c.fs.length;
  const darkBg = ["black", "deep_navy", "graphite"].includes(c.bg);
  const hasBattery = c.fs.includes("battery");
  const hasDaily = c.fs.includes("date") && (c.fs.includes("weather") || c.fs.includes("steps"));
  const hasRun = c.fs.includes("heart_rate") && (c.fs.includes("pace") || c.fs.includes("distance") || c.fs.includes("weekly_run"));
  const hasHealth = c.fs.includes("heart_rate") || c.fs.includes("body_battery") || c.fs.includes("recovery");

  let readability = contrastScore(c.bg, c.tc);
  if (["big_time_four_fields", "minimal_center"].includes(c.layout)) readability += 10;
  if (fieldCount > 5) readability -= 12;
  if (c.layout === "top_time_grid" && fieldCount <= 4) readability += 3;
  readability = clamp(readability, 0, 100);

  let dataFit = 48;
  if (hasBattery) dataFit += 12;
  if (scenario === "daily" && hasDaily) dataFit += 25;
  if (scenario === "running" && hasRun) dataFit += 32;
  if (scenario === "night" && (c.fs.includes("date") || hasBattery)) dataFit += 14;
  if (scenario === "data" && fieldCount >= 5) dataFit += 25;
  if (hasHealth) dataFit += 8;
  dataFit = clamp(dataFit, 0, 100);

  let densityFit = 70;
  if (density === "minimal") densityFit = fieldCount <= 2 ? 95 : fieldCount <= 4 ? 72 : 35;
  if (density === "balanced") densityFit = fieldCount >= 3 && fieldCount <= 4 ? 96 : fieldCount <= 6 ? 74 : 42;
  if (density === "dense") densityFit = fieldCount >= 5 ? 94 : fieldCount === 4 ? 76 : 38;
  if (c.layout === "minimal_center" && density !== "minimal") densityFit -= 8;
  densityFit = clamp(densityFit, 0, 100);

  let power = darkBg ? 92 : 45;
  if (batteryPriority === "high" && secondsPref === "always") power -= 30;
  if (secondsPref === "off") power += 8;
  if (c.layout === "ring_dashboard") power -= 8;
  if (c.bg === "black") power += 8;
  power = clamp(power, 0, 100);

  let visual = 65;
  if (stylePref === "clean" && ["big_time_four_fields", "minimal_center"].includes(c.layout)) visual += 22;
  if (stylePref === "sport" && ["ring_dashboard", "top_time_grid"].includes(c.layout)) visual += 20;
  if (stylePref === "tech" && ["ring_dashboard", "top_time_grid"].includes(c.layout)) visual += 18;
  if (stylePref === "classic" && c.layout === "classic_ticks") visual += 28;
  if (c.ac === c.tc) visual -= 7;
  if (c.bg === "white" && c.tc !== "black") visual -= 20;
  visual = clamp(visual, 0, 100);

  const total = Math.round(readability * .30 + dataFit * .24 + densityFit * .18 + power * .16 + visual * .12);
  return { total, readability, dataFit, densityFit, power, visual };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function generate() {
  const schema = parseSchema();
  if (!schema) return;
  currentCandidates = sampleCandidates(schema).map(c => ({ ...c, score: scoreCandidate(c) }))
    .sort((a,b) => b.score.total - a.score.total || b.score.readability - a.score.readability)
    .slice(0, 200);
  selectedId = currentCandidates[0]?.id;
  updateSummary();
  renderCards();
  if (currentCandidates[0]) showDetail(currentCandidates[0]);
}

function updateSummary() {
  $("candidateCount").textContent = currentCandidates.length;
  $("topScore").textContent = currentCandidates[0]?.score.total || "-";
  $("bestLabel").textContent = currentCandidates[0] ? layoutLabels[currentCandidates[0].layout] : "未生成";
}

function renderCards() {
  const cards = $("cards");
  cards.classList.remove("empty");
  cards.innerHTML = "";
  const limit = Number($("limitSelect").value);
  const template = $("cardTemplate");

  currentCandidates.slice(0, limit).forEach((c, idx) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("selected", c.id === selectedId);
    node.querySelector(".preview").innerHTML = renderWatch(c);
    node.querySelector(".card-title").textContent = `#${idx + 1} ${layoutLabels[c.layout]}`;
    node.querySelector(".score-pill").textContent = `${c.score.total}`;
    node.querySelector(".card-subtitle").textContent = `${bgLabels[c.bg]} · ${colorLabels[c.ac]}强调 · ${c.fs.length}字段`;
    node.querySelector(".tags").innerHTML = c.fs.slice(0, 4).map(f => `<span class="tag">${fieldLabels[f] || f}</span>`).join("");
    node.addEventListener("click", () => showDetail(c));
    cards.appendChild(node);
  });
}

function showDetail(c) {
  selectedId = c.id;
  document.querySelectorAll(".card").forEach((card, i) => {
    const cc = currentCandidates.slice(0, Number($("limitSelect").value))[i];
    if (cc) card.classList.toggle("selected", cc.id === selectedId);
  });
  const reasons = makeReasons(c);
  const config = makeExportConfig(c);
  $("detailBox").className = "";
  $("detailBox").innerHTML = `
    <div class="detail-preview">${renderWatch(c)}</div>
    <h3>${layoutLabels[c.layout]} · ${c.score.total} 分</h3>
    <div class="score-breakdown">
      ${bar("可读性", c.score.readability)}
      ${bar("数据匹配", c.score.dataFit)}
      ${bar("密度", c.score.densityFit)}
      ${bar("电量友好", c.score.power)}
      ${bar("视觉", c.score.visual)}
    </div>
    <div class="config-list">
      ${configItem("布局", layoutLabels[c.layout])}
      ${configItem("背景", bgLabels[c.bg])}
      ${configItem("时间颜色", colorLabels[c.tc])}
      ${configItem("强调色", colorLabels[c.ac])}
      ${configItem("字段", c.fs.map(f => fieldLabels[f] || f).join(" / "))}
    </div>
    <div class="reason-box"><strong>推荐理由</strong><br>${reasons.good.join("<br>")}</div>
    <div class="reason-box"><strong>注意点</strong><br>${reasons.bad.join("<br>")}</div>
    <div class="detail-actions">
      <button class="primary" id="copyConfig">复制配置 JSON</button>
      <button class="ghost" id="copySteps">复制手动设置步骤</button>
    </div>
    <div class="copy-note" id="copyNote"></div>
  `;
  $("copyConfig").addEventListener("click", () => copyText(JSON.stringify(config, null, 2)));
  $("copySteps").addEventListener("click", () => copyText(makeSteps(config)));
}

function bar(label, value) {
  return `<div class="bar-row"><span>${label}</span><div class="bar"><i style="width:${value}%"></i></div><b>${value}</b></div>`;
}
function configItem(k, v) { return `<div class="config-item"><span>${k}</span><strong>${v}</strong></div>`; }

function makeExportConfig(c) {
  return {
    target: $("watchfaceInput").value,
    device: $("device").value,
    scenario: $("scenario").value,
    layout: c.layout,
    background: c.bg,
    timeColor: c.tc,
    accentColor: c.ac,
    fields: c.fs,
    seconds: $("secondsPref").value,
    score: c.score.total
  };
}

function makeSteps(config) {
  return [
    `目标表盘：${config.target}`,
    `布局：${layoutLabels[config.layout] || config.layout}`,
    `背景：${bgLabels[config.background] || config.background}`,
    `时间颜色：${colorLabels[config.timeColor] || config.timeColor}`,
    `强调色：${colorLabels[config.accentColor] || config.accentColor}`,
    `字段：${config.fields.map(f => fieldLabels[f] || f).join(" / ")}`,
    `秒数：${config.seconds}`
  ].join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    $("copyNote").textContent = "已复制";
  } catch {
    $("copyNote").textContent = "浏览器阻止复制，请手动选择文本";
  }
}

function makeReasons(c) {
  const darkBg = ["black", "deep_navy", "graphite"].includes(c.bg);
  const good = [];
  const bad = [];
  if (c.score.readability >= 85) good.push("时间字号和背景对比度较好，抬腕后第一眼能读时间。");
  if (darkBg) good.push("深色背景更适合 AMOLED，也更接近 Forerunner 265 的日常使用体验。");
  if (c.fs.includes("battery")) good.push("保留电量字段，适合作为全天候日常表盘。");
  if (c.fs.includes("heart_rate")) good.push("保留心率字段，运动和健康感知都比较直接。");
  if (c.fs.length >= 5) bad.push("字段较多，小屏上可能需要牺牲部分可读性。");
  if (!darkBg) bad.push("浅色背景更醒目，但 AMOLED 常亮和夜间使用不如黑底友好。");
  if (c.score.dataFit < 65) bad.push("和当前场景的数据匹配一般，可以考虑换字段组合。");
  if (!bad.length) bad.push("没有明显硬伤，主要看你是否接受这个风格。");
  return { good, bad };
}

function renderWatch(c) {
  const bg = colors[c.bg] || c.bg;
  const accent = colors[c.ac] || c.ac;
  const timeColor = colors[c.tc] || c.tc;
  const darkBg = ["black", "deep_navy", "graphite"].includes(c.bg);
  const muted = darkBg ? "#8b96a6" : "#5a6470";
  const dim = darkBg ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)";

  const frame = `<circle cx="208" cy="208" r="196" fill="#050608"/><circle cx="208" cy="208" r="184" fill="${bg}" stroke="${dim}" stroke-width="2"/>`;
  const clipStart = `<svg class="watch-svg" viewBox="0 0 416 416" role="img"><defs><clipPath id="watchClip"><circle cx="208" cy="208" r="184"/></clipPath></defs>${frame}<g clip-path="url(#watchClip)">`;
  const clipEnd = `</g></svg>`;
  const ticks = renderTicks(accent, dim, c.layout === "classic_ticks");
  let body = "";

  if (c.layout === "minimal_center") {
    body = `${ticks}<text x="208" y="185" text-anchor="middle" fill="${timeColor}" font-size="74" font-weight="800">10:28</text>
      <text x="208" y="224" text-anchor="middle" fill="${muted}" font-size="20">${fieldValues.date}</text>
      <text x="208" y="278" text-anchor="middle" fill="${accent}" font-size="22">${fieldLabelValue(c.fs[1] || "battery")}</text>`;
  } else if (c.layout === "top_time_grid") {
    body = `${ticks}<text x="208" y="105" text-anchor="middle" fill="${timeColor}" font-size="58" font-weight="800">10:28</text>
      <text x="208" y="132" text-anchor="middle" fill="${muted}" font-size="17">${fieldValues.date}</text>
      ${renderGridFields(c.fs, accent, muted, timeColor, 156, 2)}`;
  } else if (c.layout === "ring_dashboard") {
    body = `${renderRings(accent, dim)}<text x="208" y="194" text-anchor="middle" fill="${timeColor}" font-size="64" font-weight="800">10:28</text>
      <text x="208" y="225" text-anchor="middle" fill="${muted}" font-size="18">${fieldValues.date}</text>
      ${renderOrbitFields(c.fs, accent, muted, timeColor)}`;
  } else if (c.layout === "classic_ticks") {
    body = `${ticks}<text x="208" y="173" text-anchor="middle" fill="${timeColor}" font-size="58" font-weight="800">10:28</text>
      <text x="208" y="204" text-anchor="middle" fill="${accent}" font-size="18">${fieldValues.date}</text>
      ${renderGridFields(c.fs.slice(0,4), accent, muted, timeColor, 230, 2)}`;
  } else {
    body = `${ticks}<text x="208" y="132" text-anchor="middle" fill="${muted}" font-size="18">${fieldValues.date}</text>
      <text x="208" y="198" text-anchor="middle" fill="${timeColor}" font-size="76" font-weight="850">10:28</text>
      <text x="208" y="226" text-anchor="middle" fill="${accent}" font-size="18">${secondsLabel()}</text>
      ${renderGridFields(c.fs, accent, muted, timeColor, 260, 2)}`;
  }
  return clipStart + body + clipEnd;
}

function secondsLabel() {
  const pref = $("secondsPref").value;
  if (pref === "off") return "";
  if (pref === "always") return ":42";
  return "gesture seconds";
}

function fieldLabelValue(f) {
  return `${fieldLabels[f] || f} ${fieldValues[f] || "--"}`;
}

function renderTicks(accent, dim, full = false) {
  let out = "";
  const count = full ? 60 : 12;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const r1 = full && i % 5 !== 0 ? 168 : 160;
    const r2 = 174;
    const x1 = 208 + Math.cos(a) * r1;
    const y1 = 208 + Math.sin(a) * r1;
    const x2 = 208 + Math.cos(a) * r2;
    const y2 = 208 + Math.sin(a) * r2;
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${i % 5 === 0 ? accent : dim}" stroke-width="${i % 5 === 0 ? 3 : 1}" stroke-linecap="round"/>`;
  }
  return out;
}

function renderGridFields(fields, accent, muted, timeColor, yStart, cols = 2) {
  const xs = cols === 2 ? [128, 288] : [96, 208, 320];
  const rowGap = 48;
  return fields.slice(0, 6).map((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = xs[col];
    const y = yStart + row * rowGap;
    return `<g><text x="${x}" y="${y}" text-anchor="middle" fill="${accent}" font-size="13" font-weight="700">${fieldIcons[f] || "DAT"}</text>
      <text x="${x}" y="${y + 22}" text-anchor="middle" fill="${timeColor}" font-size="20" font-weight="700">${fieldValues[f] || "--"}</text>
      <text x="${x}" y="${y + 39}" text-anchor="middle" fill="${muted}" font-size="12">${fieldLabels[f] || f}</text></g>`;
  }).join("");
}

function renderOrbitFields(fields, accent, muted, timeColor) {
  const positions = [[208,66], [332,208], [208,344], [84,208]];
  return fields.slice(0, 4).map((f, i) => {
    const [x, y] = positions[i];
    return `<g><circle cx="${x}" cy="${y}" r="32" fill="rgba(255,255,255,.04)" stroke="${accent}" stroke-opacity=".5"/>
      <text x="${x}" y="${y - 2}" text-anchor="middle" fill="${timeColor}" font-size="18" font-weight="800">${fieldValues[f] || "--"}</text>
      <text x="${x}" y="${y + 16}" text-anchor="middle" fill="${muted}" font-size="10">${fieldLabels[f] || f}</text></g>`;
  }).join("");
}

function renderRings(accent, dim) {
  return `<circle cx="208" cy="208" r="150" fill="none" stroke="${dim}" stroke-width="10"/>
    <circle cx="208" cy="208" r="150" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" stroke-dasharray="620 942" transform="rotate(-90 208 208)"/>
    <circle cx="208" cy="208" r="128" fill="none" stroke="${dim}" stroke-width="5"/>
    <circle cx="208" cy="208" r="128" fill="none" stroke="${accent}" stroke-width="5" stroke-opacity=".55" stroke-linecap="round" stroke-dasharray="410 804" transform="rotate(-90 208 208)"/>`;
}

init();
