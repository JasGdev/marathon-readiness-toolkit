// modules/4-progress-trendline/app.js
console.log("module4 app.js loaded");

import {
  paceAfterWeeks,
  scenarioRates,
  getBlockDecayByLevel,
} from "./growthModel.js";

const LS_KEY = "mrt_pt_v1";

// ===========================
// DOM
// ===========================
const root = document.querySelector("#pt-root");
const $ = (id) => root?.querySelector(`#pt-${id}`);

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

  // ✅ Only target the action row that contains the two main buttons
  const actionsEl =
    calcPaceBtn?.closest(".pt-actions") || addBtn?.closest(".pt-actions") || null;
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
// State + Persistence
// ===========================
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s && typeof s === "object" ? s : { config: null, checkins: [] };
  } catch {
    return { config: null, checkins: [] };
  }
}
let state = loadState();

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
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
  // ✅ be forgiving: allow "5.20" as "5:20"
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
  const sInt = Math.round(secPerKm); // only round when formatting text
  const m = Math.floor(sInt / 60);
  const s = String(sInt % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function getLevel() {
  const checked = levelWrapEl?.querySelector('input[name="level"]:checked');
  return checked ? checked.value : "beginner";
}

function getEditLevel() {
  const checked = editLevelWrapEl?.querySelector('input[name="edit-level"]:checked');
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

function calcPaceFromRun(distKm, hh, mm, ss) {
  if (!(distKm > 0)) return null;
  const total = hh * 3600 + mm * 60 + ss;
  if (!(total > 0)) return null;
  return Math.round(total / distKm);
}

// ===========================
// UI gating
// ===========================
function setMode(isStarted) {
  if (setupBox) setupBox.style.display = isStarted ? "none" : "block";
  if (checkinBox) checkinBox.style.display = isStarted ? "block" : "none";
}

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

  const conservative = paceAfterWeeks({
    currentSecPerKm: paceSecPerKm,
    rate: rates.conservative,
    weeks: weeksRemain,
    decay,
  });

  const optimistic = paceAfterWeeks({
    currentSecPerKm: paceSecPerKm,
    rate: rates.optimistic,
    weeks: weeksRemain,
    decay,
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
    listEl.innerHTML = `<div class="pt-empty">No check-ins yet.</div>`;
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

      // ✅ still show the same "per-8w" reference band text
      const projText = proj
        ? `→ Race-day range: ${formatPace(proj.bandLow)}–${formatPace(
            proj.bandHigh
          )} /km (${proj.pctLow}–${proj.pctHigh}% per 8w)`
        : "";

      return `
      <div class="pt-row" data-id="${c.id}">
        <div class="pt-date">${c.date}</div>
        <div class="pt-pace">${formatPace(c.paceSecPerKm)} /km</div>
        <div class="pt-proj">${projText}</div>
        <button class="pt-del" type="button">Delete</button>
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

/**
 * Build a projection polyline from last check-in to race day.
 * We sample every `stepWeeks` (default 1 week) so diminishing returns shows up as a curve.
 */
function buildProjectionSeries({
  startMs,
  startPaceSec,
  raceMs,
  rate,
  decay,
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
    });

    if (!Number.isFinite(pace)) continue;

    const ms = addWeeksMs(startMs, w);
    points.push({ ms, pace });
  }

  // Ensure we end exactly at race day
  const endPace = paceAfterWeeks({
    currentSecPerKm: startPaceSec,
    rate,
    weeks: totalWeeks,
    decay,
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
    ctx.fillText(
      "Set race date and click Start Trendline.",
      frame + 8,
      frame + 24
    );
    return;
  }

  const raceMs = parseDateToMs(state.config.raceDate);
  if (!raceMs) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Race date invalid.", frame + 8, frame + 24);
    return;
  }

  const goalSec = Number.isFinite(state.config.goalPaceSec)
    ? state.config.goalPaceSec
    : null;

  const pts = [...state.checkins]
    .map((c) => ({ ms: parseDateToMs(c.date), pace: c.paceSecPerKm }))
    .filter((p) => Number.isFinite(p.ms) && Number.isFinite(p.pace))
    .sort((a, b) => a.ms - b.ms);

  const nowMs = Date.now();
  const minXRaw = pts.length ? pts[0].ms : nowMs;
  const maxX = raceMs;
  const safeMinX = Math.min(minXRaw, raceMs - 7 * 24 * 3600 * 1000);

  const rates = scenarioRates(state.config.level);
  const decay = getBlockDecayByLevel(state.config.level);

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
      }),
      paceAfterWeeks({
        currentSecPerKm: last.pace,
        rate: rates.optimistic,
        weeks: w,
        decay,
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

  // Y grid + labels
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

  // Month ticks
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

  // Race marker line only (no label)
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

  // Goal line
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
      `Goal: ${formatPace(goalSec)}/km`,
      right - 4,
      Math.max(top + 12, yG - 14)
    );
    ctx.restore();
  }

  // Legend
  const colorConservative = "#F59E0B";
  const colorOptimistic = "#10B981";
  const sampleLen = 24;

  ctx.font = "12px system-ui";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#374151";
  ctx.lineWidth = 3;

  const leftText = "Low-end estimate (orange)";
  const rightText = "High-end estimate (green)";

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

    const w1 = sampleLen + 8 + ctx.measureText(leftText).width;
    const w2 = sampleLen + 8 + ctx.measureText(rightText).width;
    const x1 = (cssW - w1) / 2;
    const x2 = (cssW - w2) / 2;

    ctx.strokeStyle = colorConservative;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + sampleLen, y1);
    ctx.stroke();
    ctx.fillText(leftText, x1 + sampleLen + 8, y1);

    ctx.strokeStyle = colorOptimistic;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + sampleLen, y2);
    ctx.stroke();
    ctx.fillText(rightText, x2 + sampleLen + 8, y2);
  }

  ctx.lineWidth = 2;

  if (!pts.length) return;

  // History line
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

  // Projection from latest (CURVED via weekly samples)
const last = pts[pts.length - 1];

const conSeries = buildProjectionSeries({
  startMs: last.ms,
  startPaceSec: last.pace,
  raceMs,
  rate: rates.conservative,
  decay,
  stepWeeks: 1, // change to 2 if you want fewer segments
});

const optSeries = buildProjectionSeries({
  startMs: last.ms,
  startPaceSec: last.pace,
  raceMs,
  rate: rates.optimistic,
  decay,
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

  // Points
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
clearBtn?.addEventListener("click", () => {
  const ok = confirm(
    "This will permanently delete ALL guest data (race settings + check-ins). Continue?"
  );
  if (!ok) return;

  localStorage.removeItem(LS_KEY);
  state = { config: null, checkins: [] };

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
    showError("Please enter a valid race date.");
    return;
  }

  const goalRaw = editGoalPaceEl?.value?.trim() ?? "";
  const goalSec = goalRaw ? parsePaceToSeconds(goalRaw) : null;
  if (goalRaw && goalSec === null) {
    showError("Goal pace must be m:ss (e.g. 5:00) or a whole minute (e.g. 5).");
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
    showError("Please enter a valid race date (YYYY-MM-DD) to start the trendline.");
    return;
  }

  const goalRaw = goalPaceEl?.value?.trim() ?? "";
  const goalPaceSec = goalRaw ? parsePaceToSeconds(goalRaw) : null;
  if (goalRaw && goalPaceSec === null) {
    showError("Goal pace must be m:ss (e.g. 5:00) or a whole minute (e.g. 5).");
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
    showError("Please enter a valid distance (km) and completion time to calculate pace.");
    return;
  }

  if (paceInputEl) paceInputEl.value = formatPace(paceSec);
});

// ===========================
// Add check-in
// ===========================
addBtn?.addEventListener("click", () => {
  clearError();

  if (!state.config) {
    showError("Please start the trendline first by setting your race date.");
    return;
  }

  const date = checkinDateEl?.value?.trim() ?? "";
  const checkinMs = parseDateToMs(date);
  if (!date || !checkinMs) {
    showError("Please enter a valid check-in date (YYYY-MM-DD).");
    return;
  }

  // ✅ prevent check-in after race date
  const raceMs = parseDateToMs(state.config.raceDate);
  if (raceMs && checkinMs > raceMs) {
    showError("Check-in date must be on or before your race date.");
    return;
  }

  // ✅ prevent duplicate date check-ins
  const exists = state.checkins.some((c) => c.date === date);
  if (exists) {
    showError("You already have a check-in for this date. Delete it first or choose a new date.");
    return;
  }

  const paceRaw = paceInputEl?.value?.trim() ?? "";
  const paceSecPerKm = parsePaceToSeconds(paceRaw);
  if (paceSecPerKm === null) {
    showError(
      "Please enter your current pace (m:ss /km), or use the run calculator to fill it."
    );
    return;
  }

  state.checkins.push({
    id: crypto.randomUUID(),
    date,
    paceSecPerKm,
    source: "pace",
  });

  // ✅ small UX: clear pace field after adding
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
  renderList();
  renderChart();
}

// init
setMode(!!state.config);
rerenderAll();
