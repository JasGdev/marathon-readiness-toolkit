// modules/4-progress-trendline/app.js
console.log("module4 app.js loaded");

import { paceAfterWeeks, scenarioRates } from './growthModel.js'


const LS_KEY = "mrt_pt_v1";

// ===========================
// DOM (IDs you should match in HTML)
// ===========================
const root = document.querySelector("#pt-root");
const $ = (id) => root?.querySelector(`#pt-${id}`);

// edit information
const editRaceDateEl = $("edit-race-date");
const editGoalPaceEl = $("edit-goal-pace");
const saveSettingsBtn = $("save-settings-btn");
const clearBtn = $("clear-btn"); // you didn't show this in your JS snippet but you need it

clearBtn?.addEventListener("click", () => {
  const ok = confirm("This will permanently delete ALL guest data (race settings + check-ins). Continue?");
  if (!ok) return;

  // wipe storage
  localStorage.removeItem(LS_KEY);

  // reset state
  state = { config: null, checkins: [] };

  // clear inputs (setup + check-in)
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

  // go back to setup screen
  setMode(false);
  rerenderAll();
});


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

  saveState();
  rerenderAll();
});




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

(function setDefaults() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const iso = `${yyyy}-${mm}-${dd}`;

  if (checkinDateEl && !checkinDateEl.value) checkinDateEl.value = iso;
})();



// Sync setting fields when started

function syncSettingsUI() {
  if (!state.config) return;
  if (editRaceDateEl) editRaceDateEl.value = state.config.raceDate;
  if (editGoalPaceEl) {
    editGoalPaceEl.value = state.config.goalPaceSec ? formatPace(state.config.goalPaceSec) : "";
  }
}

// ===========================
// Persistence (guest localStorage now)
// later: swap these with WP REST
// ===========================


function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s && typeof s === "object"
      ? s
      : { config: null, checkins: [] };
  } catch {
    return { config: null, checkins: [] };
  }
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

let state = loadState();

// ===========================
// Helpers (same style as Module 3)
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

// Accepts "5:10", "05:10", or "5" => 5:00
function parsePaceToSeconds(paceStr) {
  const s = String(paceStr).trim();
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
  const m = Math.floor(secPerKm / 60);
  const s = String(secPerKm % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function getLevel() {
  const checked = levelWrapEl?.querySelector('input[name="level"]:checked');
  return checked ? checked.value : "beginner";
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
  const total = (hh * 3600) + (mm * 60) + ss;
  if (!(total > 0)) return null;
  return Math.round(total / distKm); // sec per km
}

// ===========================
// UI gating
// ===========================
function setMode(isStarted) {
  if (setupBox) setupBox.style.display = isStarted ? "none" : "block";
  if (checkinBox) checkinBox.style.display = isStarted ? "block" : "none";
}

// ===========================
// Derived projection (Module 3 formula applied to race date)
// ===========================
function projectToRace({ paceSecPerKm, checkinDate, config }) {
  const raceMs = parseDateToMs(config.raceDate);
  const checkinMs = parseDateToMs(checkinDate);
  if (!raceMs || !checkinMs) return null;

  const weeksRemain = weeksBetweenMs(checkinMs, raceMs);
  const rates = scenarioRates(config.level);

  const conservative = paceAfterWeeks({ currentSecPerKm: paceSecPerKm, rate: rates.conservative, weeks: weeksRemain });
  const typical = paceAfterWeeks({ currentSecPerKm: paceSecPerKm, rate: rates.typical, weeks: weeksRemain });
  const optimistic = paceAfterWeeks({ currentSecPerKm: paceSecPerKm, rate: rates.optimistic, weeks: weeksRemain });

  // low/high band at race day (slower/faster bound)
  const bandLow = Math.max(conservative, optimistic);
  const bandHigh = Math.min(conservative, optimistic);

  return {
    weeksRemain,
    pctLow: rates.pctLow,
    pctHigh: rates.pctHigh,
    conservative,
    typical,
    optimistic,
    bandLow,   // slower
    bandHigh,  // faster
  };
}

// ===========================
// Render list (and later: chart)
// ===========================
function renderList() {
  if (!listEl) return;

  const config = state.config;
  const items = [...state.checkins].sort((a, b) => (a.date > b.date ? 1 : -1));

  if (!items.length) {
    listEl.innerHTML = `<div class="pt-empty">No check-ins yet.</div>`;
    return;
  }

  listEl.innerHTML = items.map((c) => {
    const proj = config ? projectToRace({ paceSecPerKm: c.paceSecPerKm, checkinDate: c.date, config }) : null;

    const projText = proj
      ? `→ Race-day range: ${formatPace(proj.bandLow)}–${formatPace(proj.bandHigh)} /km (${proj.pctLow}–${proj.pctHigh}%)`
      : "";

    return `
      <div class="pt-row" data-id="${c.id}">
        <div class="pt-date">${c.date}</div>
        <div class="pt-pace">${formatPace(c.paceSecPerKm)} /km</div>
        <div class="pt-proj">${projText}</div>
        <button class="pt-del" type="button">Delete</button>
      </div>
    `;
  }).join("");

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

// For Render Chart Functions

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
function ceilToStep(x, step) { return Math.ceil(x / step) * step; }
function floorToStep(x, step) { return Math.floor(x / step) * step; }


function renderChart() {
  if (!chartEl) return;
  const ctx = chartEl.getContext("2d");

  // =========================
  // Canvas sizing (DPR-safe)
  // =========================
  const rect = chartEl.getBoundingClientRect();
  const cssW = Math.max(320, Math.floor(rect.width));
  const cssH = Math.max(260, Math.floor(rect.height || 260));
  const dpr = window.devicePixelRatio || 1;

  chartEl.width = Math.floor(cssW * dpr);
  chartEl.height = Math.floor(cssH * dpr);
  chartEl.style.width = `${cssW}px`;
  chartEl.style.height = `${cssH}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  // frame
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#E5E7EB";
  ctx.strokeRect(10, 10, cssW - 20, cssH - 20);

  // must have config (race date)
  if (!state.config) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Set race date and click Start Trendline.", 18, 34);
    return;
  }

  const raceMs = parseDateToMs(state.config.raceDate);
  if (!raceMs) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Race date invalid.", 18, 34);
    return;
  }

  const goalSec = Number.isFinite(state.config.goalPaceSec)
    ? state.config.goalPaceSec
    : null;

  // =========================
  // Build points
  // =========================
  const pts = [...state.checkins]
    .map((c) => ({ ms: parseDateToMs(c.date), pace: c.paceSecPerKm, date: c.date }))
    .filter((p) => Number.isFinite(p.ms) && Number.isFinite(p.pace))
    .sort((a, b) => a.ms - b.ms);

  // =========================
  // X range: RIGHT EDGE = race date always
  // LEFT EDGE = oldest datapoint (no blank space)
  // If no points: left edge = today
  // =========================
  const nowMs = Date.now();
  const safeMinX = pts.length ? pts[0].ms : nowMs;
  const maxX = raceMs;

  // guard if someone sets race date earlier than oldest checkin
  const minX = Math.min(safeMinX, maxX - 7 * 24 * 3600 * 1000);

  // =========================
  // Y range
  // include goal + points + projection endpoints
  // =========================
  const yVals = [];
  if (goalSec !== null) yVals.push(goalSec);
  pts.forEach((p) => yVals.push(p.pace));

  const rates = scenarioRates(state.config.level);
  for (let i = 0; i < pts.length; i++) {
    const start = pts[i];
    const nextMs = (i < pts.length - 1) ? pts[i + 1].ms : raceMs;
    const endClamped = Math.min(nextMs, raceMs);
    if (endClamped <= start.ms) continue;

    const w = weeksBetweenMs(start.ms, endClamped);
    const endCon = paceAfterWeeks({ currentSecPerKm: start.pace, rate: rates.conservative, weeks: w });
    const endOpt = paceAfterWeeks({ currentSecPerKm: start.pace, rate: rates.optimistic, weeks: w });

    if (Number.isFinite(endCon)) yVals.push(endCon);
    if (Number.isFinite(endOpt)) yVals.push(endOpt);
  }

  if (!yVals.length) yVals.push(360, 240);

  let minY = Math.min(...yVals);
  let maxY = Math.max(...yVals);

  const yPad = Math.max(10, Math.round((maxY - minY) * 0.12));
  minY -= yPad;
  maxY += yPad;

  // =========================
  // Plot area (space for axes)
  // =========================
  const left = 10 + 18 + 52;      // y labels
  const right = cssW - 10 - 18;
  const top = 10 + 18;
  const bottom = cssH - 10 - 38;  // x labels

  function xScale(ms) {
    if (maxX === minX) return left;
    return left + ((ms - minX) / (maxX - minX)) * (right - left);
  }

  function yScale(secPerKm) {
    if (maxY === minY) return bottom;
    const t = (secPerKm - minY) / (maxY - minY);
    return bottom - t * (bottom - top);
  }

  // =========================
  // Y axis pace ticks
  // =========================
  const yRange = maxY - minY;
  const step = niceStepSeconds(yRange);
  const tickMin = floorToStep(minY, step);
  const tickMax = ceilToStep(maxY, step);

  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.strokeStyle = "#E5E7EB";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let v = tickMin; v <= tickMax; v += step) {
    const y = yScale(v);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillText(formatPace(v), left - 8, y);
  }

  // =========================
  // X axis month ticks
  // =========================
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const monthTicks = getMonthTicks(minX, maxX);

  monthTicks.forEach((d) => {
    const ms = d.getTime();
    if (ms < minX || ms > maxX) return;

    const x = xScale(ms);

    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    ctx.fillText(label, x, bottom + 20);
  });

  // =========================
  // Race marker
  // =========================
  const xRace = xScale(raceMs);
  ctx.strokeStyle = "#9CA3AF";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(xRace, top);
  ctx.lineTo(xRace, bottom);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#6B7280";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Race: ${state.config.raceDate}`, Math.min(right - 160, xRace - 70), top - 6);

  // =========================
  // Goal pace line
  // =========================
  if (goalSec !== null) {
    const yG = yScale(goalSec);
    ctx.strokeStyle = "#2563EB";
    ctx.globalAlpha = 0.70;
    ctx.beginPath();
    ctx.moveTo(left, yG);
    ctx.lineTo(right, yG);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#2563EB";
    ctx.textAlign = "left";
    ctx.fillText(`Goal: ${formatPace(goalSec)}`, left, Math.max(top + 12, yG - 6));
  }

  // =========================
  // Legend (on-chart)
  // =========================
  const colorConservative = "#F59E0B"; // orange/amber
  const colorOptimistic = "#10B981";   // green

  const lx = left + 6;
  const ly = top + 10;

  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 1;

  // orange sample line
  ctx.strokeStyle = colorConservative;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx + 26, ly);
  ctx.stroke();
  ctx.fillStyle = "#374151";
  ctx.fillText("Low-end estimate (orange)", lx + 34, ly);

  // green sample line
  ctx.strokeStyle = colorOptimistic;
  ctx.beginPath();
  ctx.moveTo(lx, ly + 18);
  ctx.lineTo(lx + 26, ly + 18);
  ctx.stroke();
  ctx.fillStyle = "#374151";
  ctx.fillText("High-end estimate (green)", lx + 34, ly + 18);

  // reset line width for normal drawing
  ctx.lineWidth = 2;

  // =========================
  // If no check-ins: baseline only
  // =========================
  if (!pts.length) {
    ctx.fillStyle = "#6B7280";
    ctx.textAlign = "left";
    ctx.fillText("Add a check-in to start the projection lines.", left, bottom + 20);
    return;
  }

  // =========================
  // Connect check-ins with a neutral history line
  // =========================
  ctx.strokeStyle = "#111827";
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = xScale(p.ms);
    const y = yScale(p.pace);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.globalAlpha = 1;

  // =========================
  // Projections: piecewise 2-line per segment
  // =========================
  ctx.lineWidth = 2;

  for (let i = 0; i < pts.length; i++) {
    const start = pts[i];
    const nextMs = (i < pts.length - 1) ? pts[i + 1].ms : raceMs;
    const endClamped = Math.min(nextMs, raceMs);
    if (endClamped <= start.ms) continue;

    const w = weeksBetweenMs(start.ms, endClamped);

    const endCon = paceAfterWeeks({
      currentSecPerKm: start.pace,
      rate: rates.conservative,
      weeks: w,
    });

    const endOpt = paceAfterWeeks({
      currentSecPerKm: start.pace,
      rate: rates.optimistic,
      weeks: w,
    });

    const x0 = xScale(start.ms);
    const y0 = yScale(start.pace);
    const x1 = xScale(endClamped);

    if (Number.isFinite(endCon)) {
      ctx.strokeStyle = colorConservative;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, yScale(endCon));
      ctx.stroke();
    }

    if (Number.isFinite(endOpt)) {
      ctx.strokeStyle = colorOptimistic;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, yScale(endOpt));
      ctx.stroke();
    }
  }

  // =========================
  // Points: past black, latest highlighted
  // =========================
  const lastIdx = pts.length - 1;

  pts.forEach((p, i) => {
    const x = xScale(p.ms);
    const y = yScale(p.pace);

    if (i !== lastIdx) {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x, y, 3.25, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // latest
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(x, y, 5.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#2563EB";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `Latest: ${formatPace(p.pace)}`,
      Math.min(right - 120, x + 10),
      Math.max(top + 12, y - 10)
    );
  });

  // restore
  ctx.globalAlpha = 1;
}



// ===========================
// Start Trendline (setup step)
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
    goalPaceSec, // can be null
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
// Add check-in (single pace)
// ===========================
addBtn?.addEventListener("click", () => {
  clearError();

  if (!state.config) {
    showError("Please start the trendline first by setting your race date.");
    return;
  }

  const date = checkinDateEl?.value?.trim() ?? "";
  if (!date || !parseDateToMs(date)) {
    showError("Please enter a valid check-in date (YYYY-MM-DD).");
    return;
  }

  const paceRaw = paceInputEl?.value?.trim() ?? "";
  const paceSecPerKm = parsePaceToSeconds(paceRaw);
  if (paceSecPerKm === null) {
    showError("Please enter your current pace (m:ss /km), or use the run calculator to fill it.");
    return;
  }

  state.checkins.push({
    id: crypto.randomUUID(),
    date,
    paceSecPerKm,
    source: "pace",
  });

  saveState();
  rerenderAll();
});

// ===========================
// Rerender
// ===========================
function rerenderAll() {
  syncSettingsUI();
  renderList();
  renderChart();
}

// init
setMode(!!state.config);
rerenderAll();