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

const $ = (id) => document.getElementById(id);
let currentCandidates = [];
let selectedId = null;

function init() {
  $("schemaInput").value = JSON.stringify(complexSchema, null, 2);
  $("generateBtn").addEventListener("click", generate);
  $("resetBtn").addEventListener("click", () => location.reload());
  $("loadSimple").addEventListener("click", () => { $("schemaInput").value = JSON.stringify(simpleSchema, null, 2); });
  $("loadComplex").addEventListener("click", () => { $("schemaInput").value = JSON.stringify(complexSchema, null, 2); });
  $("limitSelect").addEventListener("change", renderCards);
}

function parseSchema() {
  try {
    return JSON.parse($("schemaInput").value);
  } catch (e) {
    alert("Schema error");
    return null;
  }
}

function generate() {
  const schema = parseSchema();
  if (!schema) return;

  const candidates = [];
  let id = 1;

  for (const layout of schema.layouts) {
    for (const bg of schema.backgrounds) {
      for (const ac of schema.accentColors) {
        for (const tc of schema.timeColors) {
          for (const fs of schema.fieldSets) {
            const score = Math.floor(Math.random() * 100);
            candidates.push({ id: id++, layout, bg, ac, tc, fs, score });
          }
        }
      }
    }
  }

  currentCandidates = candidates.sort((a,b)=>b.score-a.score).slice(0, 200);
  selectedId = currentCandidates[0]?.id;
  updateSummary();
  renderCards();
}

function updateSummary() {
  $("candidateCount").textContent = currentCandidates.length;
  $("topScore").textContent = currentCandidates[0]?.score || "-";
  $("bestLabel").textContent = currentCandidates[0]?.layout || "-";
}

function renderCards() {
  const cards = $("cards");
  cards.innerHTML = "";

  const limit = Number($("limitSelect").value);
  currentCandidates.slice(0, limit).forEach(c => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<div class='preview'></div><div class='card-body'><strong>${c.layout}</strong><div>${c.score}</div></div>`;
    div.onclick = () => showDetail(c);
    cards.appendChild(div);
  });
}

function showDetail(c) {
  const box = $("detailBox");
  box.innerHTML = `<pre>${JSON.stringify(c,null,2)}</pre>`;
}

init();
generate();