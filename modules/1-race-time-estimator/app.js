console.log("app.js loaded");

// ---- DOM ----
const distanceEl = document.querySelector("#distance-inputs");
const hoursEl = document.querySelector("#hours");
const minutesEl = document.querySelector("#minutes");
const secondsEl = document.querySelector("#seconds");
const btnEl = document.querySelector("#calculate-btn");
const outputValueEl = document.querySelector("#output-value");
const timeGroupEl = document.querySelector("#race-time-estimator .rte-time");

// ---- Helpers ----
function toIntOrZero(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function formatHMMSS(totalSeconds) {
  const sec = Math.max(0, Math.round(totalSeconds));

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${h}:${mm}:${ss}`;
}

function setOutput(text) {
  if (!outputValueEl) return;
  outputValueEl.textContent = text;
  popOutput();
}

function popOutput() {
  if (!outputValueEl) return;
  outputValueEl.classList.remove("rte-pop");
  // force reflow so animation re-triggers
  void outputValueEl.offsetWidth;
  outputValueEl.classList.add("rte-pop");
  window.setTimeout(() => outputValueEl.classList.remove("rte-pop"), 180);
}

function shakeTimeGroup() {
  if (!timeGroupEl) return;
  timeGroupEl.classList.remove("rte-shake");
  void timeGroupEl.offsetWidth;
  timeGroupEl.classList.add("rte-shake");
  window.setTimeout(() => timeGroupEl.classList.remove("rte-shake"), 320);
}

function setLoading(isLoading) {
  if (!btnEl) return;
  if (isLoading) {
    btnEl.disabled = true;
    btnEl.dataset.originalText = btnEl.textContent;
    btnEl.textContent = "计算中…";
  } else {
    btnEl.disabled = false;
    btnEl.textContent = btnEl.dataset.originalText || "计算";
  }
}

// ---- Validation ----
function validateTime(h, m, s) {
  const total = h * 3600 + m * 60 + s;
  if (total <= 0) return { ok: false, msg: "请填写正确的完赛时间（不能为 0）" };

  if (h < 0) return { ok: false, msg: "小时不能为负数" };
  if (m < 0 || m > 59) return { ok: false, msg: "分钟需要在 0–59 之间" };
  if (s < 0 || s > 59) return { ok: false, msg: "秒数需要在 0–59 之间" };

  const distance = distanceEl.value;

  // Basic sanity checks (lightweight)
  if (distance === "10k") {
    if (total < 20 * 60) return { ok: false, msg: "这个 10K 时间看起来不太合理，请再确认一次" };
    if (total > 3 * 3600) return { ok: false, msg: "这个 10K 时间看起来不太合理，请再确认一次" };
  }
  if (distance === "half") {
    if (total < 50 * 60) return { ok: false, msg: "这个半马时间看起来不太合理，请再确认一次" };
    if (total > 6 * 3600) return { ok: false, msg: "这个半马时间看起来不太合理，请再确认一次" };
  }

  return { ok: true, total };
}

// ---- Core calc ----
// Returns { minSec, maxSec } or { error }
function estimateMarathonRange(distance, raceSeconds) {
  if (distance === "half") {
    const minSec = raceSeconds * 2 + 10 * 60;
    const maxSec = raceSeconds * 2 + 20 * 60;
    return { minSec, maxSec };
  }

  if (distance === "10k") {
    const center = raceSeconds * 5 - 10 * 60;
    if (center <= 0) return { error: "这个 10K 时间无法用于该公式，请检查输入" };

    const band = 5 * 60; // ±5 minutes
    const minSec = Math.max(0, center - band);
    const maxSec = Math.max(0, center + band);
    return { minSec, maxSec };
  }

  return { error: "请选择距离" };
}

// ---- Handler ----
function handleCalculate() {
  if (!outputValueEl) {
    console.warn("#output-value not found. Did you update the HTML output container?");
    return;
  }

  // Loading state (short, feels premium)
  setLoading(true);

  window.setTimeout(() => {
    const distance = distanceEl.value;

    const h = toIntOrZero(hoursEl.value);
    const m = toIntOrZero(minutesEl.value);
    const s = toIntOrZero(secondsEl.value);

    const v = validateTime(h, m, s);
    if (!v.ok) {
      shakeTimeGroup();
      setOutput(v.msg);
      setLoading(false);
      return;
    }

    const result = estimateMarathonRange(distance, v.total);
    if (result.error) {
      shakeTimeGroup();
      setOutput(result.error);
      setLoading(false);
      return;
    }

    const minStr = formatHMMSS(result.minSec);
    const maxStr = formatHMMSS(result.maxSec);

    setOutput(`${minStr} – ${maxStr}`);
    setLoading(false);
  }, 300);
}

// ---- Events ----
btnEl.addEventListener("click", handleCalculate);

[hoursEl, minutesEl, secondsEl].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleCalculate();
  });
});
