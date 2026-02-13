// modules/4-progress-trendline/app.js
console.log("module4 app.js loaded");

import {
  paceAfterWeeks,
  scenarioRates,
  getBlockDecayByLevel,
  getMaxTotalImprovementByLevel,
} from "./growthModel.js";

const LS_KEY = "mrt_pt_v1";

// ===========================
// WP Cloud Sync (WooCommerce / WordPress logged-in users)
// - Uses window.MRT injected by plugin:
//   window.MRT = { restUrl, nonce, isLoggedIn }
// - REST endpoints:
//   GET  /wp-json/mrt/v1/progress-trendline
//   POST /wp-json/mrt/v1/progress-trendline
// ===========================
const WP = window.MRT || {};
const IS_LOGGED_IN = !!WP.isLoggedIn;
const REST_ENDPOINT = WP.restUrl ? `${WP.restUrl}mrt/v1/progress-trendline` : null;

function debounce(fn, wait = 800) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

async function fetchServerPayload() {
  if (!IS_LOGGED_IN || !REST_ENDPOINT) return null;
  try {
    const res = await fetch(REST_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
      headers: { "X-WP-Nonce": WP.nonce || "" },
    });
    if (!res.ok) return null;
    return await res.json(); // { version, state: {config, checkins}, updatedAt }
  } catch {
    return null;
  }
}

async function postServerPayload(payload) {
  if (!IS_LOGGED_IN || !REST_ENDPOINT) return false;
  try {
    const res = await fetch(REST_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": WP.nonce || "",
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ✅ immediate server clear helper
async function clearServerPayloadNow() {
  if (!IS_LOGGED_IN || !REST_ENDPOINT) return false;
  const payload = {
    version: 1,
    state: { config: null, checkins: [] },
    updatedAt: Date.now(),
  };
  return await postServerPayload(payload);
}

// ===========================
// DOM
// ===========================
const root = document.querySelector("#pt-root");
const $ = (id) => root?.querySelector(`#pt-${id}`);

// Extra cards (outside pt-checkin)
const chartCardEl = $("chart-card"); // <div id="pt-chart-card">
const dataCardEl = $("data-card"); // <div id="pt-data-card">

// Warning msg
const dateWarnEl = root?.querySelector("#pt-date-warn");

// Setup panel
const setupBox = $("setup");
const raceDateEl = $("race-date");
const goalPaceEl = $("goal-pace");
const levelWrapEl = $("level-wrap");
const startBtn = $("start-btn");

// Check-in panel
const checkinBox = $("checkin");
const checkinDateEl = $("checkin-date");

// Option A: direct pace
const paceInputEl = $("pace");

// Option B: run -> pace
const distEl = $("dist-km");
const hEl = $("h");
const mEl = $("m");
const sEl = $("s");
const calcPaceBtn = $("calc-pace-btn");

// Add/save
const addBtn = $("add-btn");
const listEl = $("list");
const chartEl = $("chart");
const errorEl = $("error");

// Edit settings (inside check-in screen)
const editRaceDateEl = $("edit-race-date");
const editGoalPaceEl = $("edit-goal-pace");
const editLevelWrapEl = $("edit-level-wrap");
const saveSettingsBtn = $("save-settings-btn");

// Clear guest data
const clearBtn = $("clear-btn");

// ===========================
// Make "Calculate pace" + "Add check-in" centered + wider (JS-applied)
// ===========================
function applyPrimaryActionLayout() {
  if (!root) return;

  const actionsEl =
    calcPaceBtn?.closest(".pt-actions") ||
    addBtn?.closest(".pt-actions") ||
    null;
  if (!actionsEl || !calcPaceBtn || !addBtn) return;

  actionsEl.style.display = "flex";
  actionsEl.style.justifyContent = "center";
  actionsEl.style.alignItems = "center";
  actionsEl.style.gap = "12px";
  actionsEl.style.flexWrap = "wrap";

  const isMobile = window.matchMedia("(max-width: 520px)").matches;

  [calcPaceBtn, addBtn].forEach((b) => {
    b.style.display = "block";
    b.style.margin = "0";
    b.style.width = isMobile ? "100%" : "48%";
    b.style.maxWidth = "520px";
    b.style.minWidth = "240px";
  });
}
window.addEventListener("resize", applyPrimaryActionLayout);

// ===========================
// State + Persistence (Local + Cloud)
// ===========================
function normalizeStateShape(s) {
  const obj = s && typeof s === "object" ? s : null;
  return {
    config: obj?.config ?? null,
    checkins: Array.isArray(obj?.checkins) ? obj.checkins : [],
    updatedAt: Number.isFinite(obj?.updatedAt) ? obj.updatedAt : 0,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return normalizeStateShape(s);
  } catch {
    return { config: null, checkins: [], updatedAt: 0 };
  }
}
let state = loadState();

// Debounced cloud saver (only when logged in)
const saveCloudDebounced = debounce(async () => {
  const payload = {
    version: 1,
    state: { config: state.config, checkins: state.checkins },
    updatedAt: state.updatedAt,
  };
  await postServerPayload(payload);
}, 900);

function saveState({ silentCloud = false } = {}) {
  state.updatedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(state));

  if (IS_LOGGED_IN && !silentCloud) {
    saveCloudDebounced();
  }
}

// ===========================
// UI gating
// ===========================
function setMode(isStarted) {
  if (setupBox) setupBox.style.display = isStarted ? "none" : "block";
  if (checkinBox) checkinBox.style.display = isStarted ? "block" : "none";
  if (chartCardEl) chartCardEl.style.display = isStarted ? "block" : "none";
  if (dataCardEl) dataCardEl.style.display = isStarted ? "block" : "none";
}

// ===========================
// Cloud hydration / merge     
// ===========================
async function hydrateFromCloudIfNeeded() {
  if (!IS_LOGGED_IN) return;

  const server = await fetchServerPayload();
  if (!server || !server.state) return;

  const serverState = normalizeStateShape({
    config: server.state?.config ?? null,
    checkins: server.state?.checkins ?? [],
    updatedAt: typeof server.updatedAt === "number" ? server.updatedAt : 0,
  });

  const localEmpty =
    !state.config && (!state.checkins || state.checkins.length === 0);
  const serverEmpty =
    !serverState.config &&
    (!serverState.checkins || serverState.checkins.length === 0);

  if (serverEmpty && !localEmpty) {
  // Server empty, local has data -> push immediately
  state.updatedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(state));
  await postServerPayload({
    version: 1,
    state: { config: state.config, checkins: state.checkins },
    updatedAt: state.updatedAt,
  });
  return;
}

  if (!serverEmpty && localEmpty) {
    // Local empty; take server
    state = serverState;
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    setMode(!!state.config);
    rerenderAll();
    return;
  }

  if (!serverEmpty && !localEmpty) {
    // Both have data; choose newest updatedAt
    const serverNewer = (serverState.updatedAt || 0) >= (state.updatedAt || 0);
    if (serverNewer) {
      state = serverState;
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setMode(!!state.config);
      rerenderAll();
    } else {
      // Local newer -> upload (debounced)
      saveState();
    }
  }
}

// ===========================
// Defaults
// ===========================
(function setDefaults() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const iso = `${yyyy}-${mm}-${dd}`;
  if (checkinDateEl && !checkinDateEl.value) checkinDateEl.value = iso;
})();

// ===========================
// Helpers
// ===========================
function toIntOrNull(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function parseDateToMs(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const t = Date.parse(`${yyyyMmDd}T00:00:00`);
  return Number.isFinite(t) ? t : null;
}

function weeksBetweenMs(aMs, bMs) {
  const w = (bMs - aMs) / (1000 * 60 * 60 * 24 * 7);
  return Math.max(0, w);
}

function parsePaceToSeconds(paceStr) {
  const s = String(paceStr).trim().replace(".", ":");
  if (!s) return null;

  if (/^\d{1,2}$/.test(s)) {
    const min = toIntOrNull(s);
    return min === null ? null : min * 60;
  }

  const m = s.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (!m) return null;

  const min = toIntOrNull(m[1]);
  const sec = toIntOrNull(m[2]);
  if (min === null || sec === null) return null;
  if (sec < 0 || sec >= 60) return null;

  return min * 60 + sec;
}

function formatPace(secPerKm) {
  const sInt = Math.round(secPerKm);
  const m = Math.floor(sInt / 60);
  const s = String(sInt % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function getLevel() {
  const checked = levelWrapEl?.querySelector('input[name="level"]:checked');
  return checked ? checked.value : "beginner";
}

function getEditLevel() {
  const checked = editLevelWrapEl?.querySelector(
    'input[name="edit-level"]:checked'
  );
  return checked ? checked.value : "beginner";
}

function setEditLevelUI(level) {
  if (!editLevelWrapEl) return;
  const el = editLevelWrapEl.querySelector(
    `input[name="edit-level"][value="${level}"]`
  );
  if (el) el.checked = true;
}

function clearError() {
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.style.display = "none";
}

function showError(msg) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}

function showDateWarn(msg) {
  if (!dateWarnEl) return;
  dateWarnEl.textContent = msg;
  dateWarnEl.style.display = "block";
}
function clearDateWarn() {
  if (!dateWarnEl) return;
  dateWarnEl.textContent = "";
  dateWarnEl.style.display = "none";
}

function calcPaceFromRun(distKm, hh, mm, ss) {
  if (!(distKm > 0)) return null;
  const total = hh * 3600 + mm * 60 + ss;
  if (!(total > 0)) return null;
  return Math.round(total / distKm);
}

checkinDateEl?.addEventListener("input", () => {
  clearDateWarn();
  if (!state.config) return;

  const date = checkinDateEl.value?.trim() ?? "";
  const checkinMs = parseDateToMs(date);
  const raceMs = parseDateToMs(state.config.raceDate);

  if (!date || !checkinMs || !raceMs) return;

  if (checkinMs > raceMs) {
    showDateWarn("⚠️ 这个日期在比赛日之后：趋势线只接受比赛日当天及之前的打卡。请改成比赛日前的日期。");
  }
});
// ===========================
// Sync setting fields
// ===========================
function syncSettingsUI() {
  if (!state.config) return;

  if (editRaceDateEl) editRaceDateEl.value = state.config.raceDate;

  if (editGoalPaceEl) {
    editGoalPaceEl.value = state.config.goalPaceSec
      ? formatPace(state.config.goalPaceSec)
      : "";
  }

  setEditLevelUI(state.config.level || "beginner");
}

// ===========================
// Projection helpers (list preview)
// ===========================
function projectToRace({ paceSecPerKm, checkinDate, config }) {
  const raceMs = parseDateToMs(config.raceDate);
  const checkinMs = parseDateToMs(checkinDate);
  if (!raceMs || !checkinMs) return null;

  const weeksRemain = weeksBetweenMs(checkinMs, raceMs);

  const rates = scenarioRates(config.level);
  const decay = getBlockDecayByLevel(config.level);
  const maxImp = getMaxTotalImprovementByLevel(config.level);

  const conservative = paceAfterWeeks({
    currentSecPerKm: paceSecPerKm,
    rate: rates.conservative,
    weeks: weeksRemain,
    decay,
    maxTotalImprovement: maxImp,
  });

  const optimistic = paceAfterWeeks({
    currentSecPerKm: paceSecPerKm,
    rate: rates.optimistic,
    weeks: weeksRemain,
    decay,
    maxTotalImprovement: maxImp,
  });

  const bandLow = Math.max(conservative, optimistic);
  const bandHigh = Math.min(conservative, optimistic);

  return {
    weeksRemain,
    pctLow: rates.pctLow,
    pctHigh: rates.pctHigh,
    bandLow,
    bandHigh,
  };
}

// ===========================
// Render list
// ===========================
function renderList() {
  if (!listEl) return;

  const config = state.config;
  const items = [...state.checkins].sort((a, b) => (a.date > b.date ? 1 : -1));

  if (!items.length) {
    listEl.innerHTML = `<div class="pt-empty">暂无打卡记录。</div>`;
    return;
  }

  listEl.innerHTML = items
    .map((c) => {
      const proj = config
        ? projectToRace({
            paceSecPerKm: c.paceSecPerKm,
            checkinDate: c.date,
            config,
          })
        : null;

      const projText = proj
        ? `→ 预计比赛日区间：${formatPace(proj.bandLow)}–${formatPace(
            proj.bandHigh
          )} /km（每 8 周 ${proj.pctLow}–${proj.pctHigh}%）`
        : "";

      return `
      <div class="pt-row" data-id="${c.id}">
        <div class="pt-date">${c.date}</div>
        <div class="pt-pace">${formatPace(c.paceSecPerKm)} /km</div>
        <div class="pt-proj">${projText}</div>
        <button class="pt-del" type="button">删除</button>
      </div>
    `;
    })
    .join("");

  listEl.querySelectorAll(".pt-del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest(".pt-row");
      const id = row?.dataset?.id;
      if (!id) return;

      state.checkins = state.checkins.filter((x) => x.id !== id);
      saveState();
      rerenderAll();
    });
  });
}

// ===========================
// Chart helpers
// ===========================
function getMonthTicks(minMs, maxMs) {
  const ticks = [];
  const d = new Date(minMs);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);

  const end = new Date(maxMs);
  while (d <= end) {
    ticks.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}

function niceStepSeconds(rangeSec) {
  if (rangeSec <= 30) return 5;
  if (rangeSec <= 60) return 10;
  if (rangeSec <= 120) return 15;
  if (rangeSec <= 240) return 30;
  if (rangeSec <= 480) return 60;
  return 120;
}

function addWeeksMs(ms, weeks) {
  return ms + weeks * 7 * 24 * 3600 * 1000;
}

function buildProjectionSeries({
  startMs,
  startPaceSec,
  raceMs,
  rate,
  decay,
  maxTotalImprovement,
  stepWeeks = 1,
}) {
  const totalWeeks = weeksBetweenMs(startMs, raceMs);
  if (!(totalWeeks > 0)) return [];

  const points = [];
  const steps = Math.max(1, Math.ceil(totalWeeks / stepWeeks));

  for (let i = 0; i <= steps; i++) {
    const w = Math.min(totalWeeks, i * stepWeeks);

    const pace = paceAfterWeeks({
      currentSecPerKm: startPaceSec,
      rate,
      weeks: w,
      decay,
      maxTotalImprovement,
    });

    if (!Number.isFinite(pace)) continue;

    const ms = addWeeksMs(startMs, w);
    points.push({ ms, pace });
  }

  const endPace = paceAfterWeeks({
    currentSecPerKm: startPaceSec,
    rate,
    weeks: totalWeeks,
    decay,
    maxTotalImprovement,
  });

  if (Number.isFinite(endPace)) {
    points[points.length - 1] = { ms: raceMs, pace: endPace };
  }

  return points;
}

function drawPolyline(ctx, points, xScale, yScale) {
  if (!points.length) return;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xScale(p.ms);
    const y = yScale(p.pace);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// ===========================
// Render chart
// ===========================
function renderChart() {
  if (!chartEl) return;
  const ctx = chartEl.getContext("2d");

  const rect = chartEl.getBoundingClientRect();
  const cssW = Math.max(320, Math.floor(rect.width));
  const cssH = Math.max(280, Math.floor(rect.height || 320));
  const dpr = window.devicePixelRatio || 1;

  chartEl.width = Math.floor(cssW * dpr);
  chartEl.height = Math.floor(cssH * dpr);
  chartEl.style.width = `${cssW}px`;
  chartEl.style.height = `${cssH}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const frame = 10;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#E5E7EB";
  ctx.strokeRect(frame, frame, cssW - frame * 2, cssH - frame * 2);

  if (!state.config) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText("请先设置比赛日期并点击“开始趋势线”。", frame + 8, frame + 24);
    return;
  }

  const raceMs = parseDateToMs(state.config.raceDate);
  if (!raceMs) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText("比赛日期无效。", frame + 8, frame + 24);
    return;
  }

  const level = state.config.level || "beginner";
  const maxImp = getMaxTotalImprovementByLevel(level);

  let goalSec = null;
  const rawGoal = state.config.goalPaceSec;

  if (Number.isFinite(rawGoal)) {
    goalSec = rawGoal;
  } else if (typeof rawGoal === "string" && rawGoal.trim()) {
    goalSec = parsePaceToSeconds(rawGoal.trim());
  }

  if (goalSec !== null && !Number.isFinite(rawGoal)) {
    state.config.goalPaceSec = goalSec;
    saveState();
  }

  const pts = [...state.checkins]
    .map((c) => ({ ms: parseDateToMs(c.date), pace: c.paceSecPerKm }))
    .filter((p) => Number.isFinite(p.ms) && Number.isFinite(p.pace))
    .sort((a, b) => a.ms - b.ms);

  const nowMs = Date.now();
  const minXRaw = pts.length ? pts[0].ms : nowMs;
  const maxX = raceMs;
  const safeMinX = Math.min(minXRaw, raceMs - 7 * 24 * 3600 * 1000);

  const rates = scenarioRates(level);
  const decay = getBlockDecayByLevel(level);

  const yVals = [];
  if (goalSec !== null) yVals.push(goalSec);
  pts.forEach((p) => yVals.push(p.pace));

  if (pts.length) {
    const last = pts[pts.length - 1];
    const w = weeksBetweenMs(last.ms, raceMs);
    yVals.push(
      paceAfterWeeks({
        currentSecPerKm: last.pace,
        rate: rates.conservative,
        weeks: w,
        decay,
        maxTotalImprovement: maxImp,
      }),
      paceAfterWeeks({
        currentSecPerKm: last.pace,
        rate: rates.optimistic,
        weeks: w,
        decay,
        maxTotalImprovement: maxImp,
      })
    );
  }

  let minY = Math.min(...yVals);
  let maxY = Math.max(...yVals);
  const yPad = Math.max(8, Math.round((maxY - minY) * 0.1));
  minY -= yPad;
  maxY += yPad;

  const isMobile = cssW < 520;
  const sidePad = isMobile ? 8 : 10;
  const yLabelGutter = isMobile ? 28 : 34;
  const monthLabelZone = isMobile ? 62 : 28;
  const legendZone = isMobile ? 52 : 34;
  const bottomPad = 10;

  const left = frame + sidePad + yLabelGutter;
  const right = cssW - frame - sidePad;
  const top = frame + 12;
  const bottom = cssH - frame - (monthLabelZone + legendZone + bottomPad);

  const xScale = (ms) =>
    left + ((ms - safeMinX) / (maxX - safeMinX)) * (right - left);
  const yScale = (sec) =>
    bottom - ((sec - minY) / (maxY - minY)) * (bottom - top);

  const step = niceStepSeconds(maxY - minY);
  const tickStart = Math.ceil(minY / step) * step;
  const tickEnd = Math.floor(maxY / step) * step;

  ctx.font = isMobile ? "11px system-ui" : "12px system-ui";
  ctx.fillStyle = "#6B7280";
  ctx.strokeStyle = "#E5E7EB";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let v = tickStart; v <= tickEnd + 0.0001; v += step) {
    const y = yScale(v);
    if (y < top - 0.5 || y > bottom + 0.5) continue;

    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillText(formatPace(v), left - 6, y);
  }

  const monthTicks = getMonthTicks(safeMinX, maxX);

  monthTicks.forEach((d) => {
    const ms = d.getTime();
    if (ms < safeMinX || ms > maxX) return;

    const x = xScale(ms);

    ctx.strokeStyle = "#E5E7EB";
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    ctx.fillStyle = "#6B7280";

    if (isMobile) {
      const yCenter = bottom + monthLabelZone / 2;
      ctx.save();
      ctx.translate(x, yCenter);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    } else {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(label, x, bottom + 20);
    }
  });

  {
    const xRace = xScale(raceMs);
    ctx.strokeStyle = "#9CA3AF";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(xRace, top);
    ctx.lineTo(xRace, bottom);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (goalSec !== null) {
    const yG = yScale(goalSec);

    ctx.strokeStyle = "#2563EB";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(left, yG);
    ctx.lineTo(right, yG);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.fillStyle = "#2563EB";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `目标：${formatPace(goalSec)}/km`,
      right - 4,
      Math.max(top + 12, yG - 14)
    );
    ctx.restore();
  }

  const colorConservative = "#F59E0B";
  const colorOptimistic = "#10B981";
  const sampleLen = 24;

  ctx.font = "12px system-ui";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#374151";
  ctx.lineWidth = 3;

  const leftText = "保守预估（橙色）";
  const rightText = "乐观预估（绿色）";

  if (!isMobile) {
    const legendY = bottom + monthLabelZone + legendZone / 2;

    ctx.save();
    ctx.font = "12px system-ui";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#374151";
    ctx.lineWidth = 3;

    const gap = 20;
    const leftW = ctx.measureText(leftText).width;
    const rightW = ctx.measureText(rightText).width;
    const groupW = sampleLen + 8 + leftW + gap + sampleLen + 8 + rightW;

    let startX = (left + right) / 2 - groupW / 2;
    startX = Math.max(startX, frame + 8);

    ctx.strokeStyle = colorConservative;
    ctx.beginPath();
    ctx.moveTo(startX, legendY);
    ctx.lineTo(startX + sampleLen, legendY);
    ctx.stroke();
    ctx.fillText(leftText, startX + sampleLen + 8, legendY);

    startX += sampleLen + 8 + leftW + gap;

    ctx.strokeStyle = colorOptimistic;
    ctx.beginPath();
    ctx.moveTo(startX, legendY);
    ctx.lineTo(startX + sampleLen, legendY);
    ctx.stroke();
    ctx.fillText(rightText, startX + sampleLen + 8, legendY);

    ctx.restore();
  } else {
    const y1 = bottom + monthLabelZone + 16;
    const y2 = y1 + 22;

    ctx.save();
    ctx.font = "12px system-ui";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#374151";
    ctx.lineWidth = 3;

    const gap = 14;

    const leftWText = ctx.measureText(leftText).width;
    const rightWText = ctx.measureText(rightText).width;

    const row1W = sampleLen + gap + leftWText;
    const row2W = sampleLen + gap + rightWText;

    const startX1 = Math.max((cssW - row1W) / 2, frame + 8);
    const startX2 = Math.max((cssW - row2W) / 2, frame + 8);

    ctx.strokeStyle = colorConservative;
    ctx.beginPath();
    ctx.moveTo(startX1, y1);
    ctx.lineTo(startX1 + sampleLen, y1);
    ctx.stroke();
    ctx.fillText(leftText, startX1 + sampleLen + gap, y1);

    ctx.strokeStyle = colorOptimistic;
    ctx.beginPath();
    ctx.moveTo(startX2, y2);
    ctx.lineTo(startX2 + sampleLen, y2);
    ctx.stroke();
    ctx.fillText(rightText, startX2 + sampleLen + gap, y2);

    ctx.restore();
  }

  ctx.lineWidth = 2;

  if (!pts.length) return;

  ctx.strokeStyle = "#111827";
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = xScale(p.ms);
    const y = yScale(p.pace);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.globalAlpha = 1;

  const last = pts[pts.length - 1];

  const conSeries = buildProjectionSeries({
    startMs: last.ms,
    startPaceSec: last.pace,
    raceMs,
    rate: rates.conservative,
    decay,
    maxTotalImprovement: maxImp,
    stepWeeks: 1,
  });

  const optSeries = buildProjectionSeries({
    startMs: last.ms,
    startPaceSec: last.pace,
    raceMs,
    rate: rates.optimistic,
    decay,
    maxTotalImprovement: maxImp,
    stepWeeks: 1,
  });

  if (conSeries.length) {
    ctx.strokeStyle = colorConservative;
    drawPolyline(ctx, conSeries, xScale, yScale);
  }

  if (optSeries.length) {
    ctx.strokeStyle = colorOptimistic;
    drawPolyline(ctx, optSeries, xScale, yScale);
  }

  const lastIdx = pts.length - 1;
  pts.forEach((p, i) => {
    const x = xScale(p.ms);
    const y = yScale(p.pace);

    if (i !== lastIdx) {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x, y, 3.0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(x, y, 5.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// ===========================
// Clear all guest data
// ===========================
clearBtn?.addEventListener("click", async () => {
  const ok = confirm("这将永久删除所有访客数据（比赛设置 + 打卡记录）。确定继续？");
  if (!ok) return;

  localStorage.removeItem(LS_KEY);
  state = { config: null, checkins: [], updatedAt: 0 };

  if (raceDateEl) raceDateEl.value = "";
  if (goalPaceEl) goalPaceEl.value = "";
  if (editRaceDateEl) editRaceDateEl.value = "";
  if (editGoalPaceEl) editGoalPaceEl.value = "";
  if (paceInputEl) paceInputEl.value = "";
  if (checkinDateEl) checkinDateEl.value = "";
  if (distEl) distEl.value = "";
  if (hEl) hEl.value = "";
  if (mEl) mEl.value = "";
  if (sEl) sEl.value = "";

  if (IS_LOGGED_IN) {
    await clearServerPayloadNow(); // ✅ await
  }

  setMode(false);
  rerenderAll();
});

// ===========================
// Save settings
// ===========================
saveSettingsBtn?.addEventListener("click", () => {
  clearError();
  if (!state.config) return;

  const raceDate = editRaceDateEl?.value?.trim() ?? "";
  if (!raceDate || !parseDateToMs(raceDate)) {
    showError("请输入有效的比赛日期。");
    return;
  }

  const goalRaw = editGoalPaceEl?.value?.trim() ?? "";
  const goalSec = goalRaw ? parsePaceToSeconds(goalRaw) : null;
  if (goalRaw && goalSec === null) {
    showError("目标配速格式应为 m:ss（例如 5:00）或整数分钟（例如 5）。");
    return;
  }

  state.config.raceDate = raceDate;
  state.config.goalPaceSec = goalSec;
  state.config.level = getEditLevel();

  saveState();
  rerenderAll();
});

// ===========================
// Start Trendline
// ===========================
startBtn?.addEventListener("click", () => {
  clearError();

  const raceDate = raceDateEl?.value?.trim() ?? "";
  if (!raceDate || !parseDateToMs(raceDate)) {
    showError("请先输入有效的比赛日期（YYYY-MM-DD），再开始趋势线。");
    return;
  }

  const goalRaw = goalPaceEl?.value?.trim() ?? "";
  const goalPaceSec = goalRaw ? parsePaceToSeconds(goalRaw) : null;
  if (goalRaw && goalPaceSec === null) {
    showError("目标配速格式应为 m:ss（例如 5:00）或整数分钟（例如 5）。");
    return;
  }

  state.config = {
    raceDate,
    goalPaceSec,
    level: getLevel(),
  };

  saveState();
  setMode(true);
  rerenderAll();
});

// ===========================
// Run → Pace calculator
// ===========================
calcPaceBtn?.addEventListener("click", () => {
  clearError();

  const distKm = Number(distEl?.value ?? 0);
  const hh = Number(hEl?.value ?? 0);
  const mm = Number(mEl?.value ?? 0);
  const ss = Number(sEl?.value ?? 0);

  const paceSec = calcPaceFromRun(distKm, hh, mm, ss);
  if (paceSec === null) {
    showError("请输入有效的距离（km）和完成时间，以计算配速。");
    return;
  }

  if (paceInputEl) paceInputEl.value = formatPace(paceSec);
});

// ===========================
// Add check-in
// ===========================
addBtn?.addEventListener("click", () => {
  clearError();
  clearDateWarn();

  if (!state.config) {
    showError("请先设置比赛日期并开始趋势线。");
    return;
  }

  const date = checkinDateEl?.value?.trim() ?? "";
  const checkinMs = parseDateToMs(date);
  if (!date || !checkinMs) {
    showError("请输入有效的打卡日期（YYYY-MM-DD）。");
    return;
  }

  const raceMs = parseDateToMs(state.config.raceDate);
  if (raceMs && checkinMs > raceMs) {
    showDateWarn("⚠️ 打卡日期在比赛日之后，请改成比赛日前或比赛日当天。");
    showError("打卡日期必须早于或等于比赛日期。");
    return;
  }

  const exists = state.checkins.some((c) => c.date === date);
  if (exists) {
    showError("该日期已有打卡记录。请先删除该记录或选择新的日期。");
    return;
  }

  const paceRaw = paceInputEl?.value?.trim() ?? "";
  const paceSecPerKm = parsePaceToSeconds(paceRaw);
  if (paceSecPerKm === null) {
    showError("请输入当前可持续配速（m:ss /km），或使用跑步计算器自动填入。");
    return;
  }

  state.checkins.push({
    id: crypto.randomUUID(),
    date,
    paceSecPerKm,
    source: "pace",
  });

  if (paceInputEl) paceInputEl.value = "";

  saveState();
  rerenderAll();
});

// ===========================
// Rerender
// ===========================
function rerenderAll() {
  applyPrimaryActionLayout();
  syncSettingsUI();

  if (!state.config) return;

  renderList();
  renderChart();
}

// init
(async function init() {
  setMode(!!state.config);
  rerenderAll();
  await hydrateFromCloudIfNeeded();
})();
