// app.js — Goal Pace Converter (only show result after button click)

console.log("app.js loaded (Goal Pace Converter)");

// ---------- DOM ----------
const distanceEl = document.querySelector("#gpc-distance");
const hoursEl = document.querySelector("#gpc-hours");
const minutesEl = document.querySelector("#gpc-minutes");
const secondsEl = document.querySelector("#gpc-seconds");
const btnEl = document.querySelector("#gpc-calc-btn");
const outputEl = document.querySelector("#gpc-output");
const noteEl = document.querySelector("#gpc-note");

// ---------- Data ----------
const DIST_KM = {
    "5k": 5,
    "10k": 10,
    "half": 21.0975,
    "full": 42.195,
};

// ---------- State ----------
// Only show results after user explicitly clicks calculate
let hasCalculatedOnce = false;

// ---------- Helpers ----------
function toIntOrZero(value) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatPace(secondsPerKm) {
    if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "—";
    const total = Math.round(secondsPerKm);
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    return `${mm}:${pad2(ss)} / km`;
}

function formatTime(h, m, s) {
    const total = h * 3600 + m * 60 + s;
    if (total <= 0) return "—";
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    return `${hh}:${pad2(mm)}:${pad2(ss)}`;
}

function getTotalSeconds() {
    const h = clamp(toIntOrZero(hoursEl.value), 0, 999);
    const m = clamp(toIntOrZero(minutesEl.value), 0, 59);
    const s = clamp(toIntOrZero(secondsEl.value), 0, 59);

    // normalize only if user typed something
    if (hoursEl.value !== "") hoursEl.value = h ? String(h) : "0";
    if (minutesEl.value !== "") minutesEl.value = String(m);
    if (secondsEl.value !== "") secondsEl.value = String(s);

    return { h, m, s, total: h * 3600 + m * 60 + s };
}

function hideOutput() {
    // Hide the whole output area until calculation happens
    outputEl.textContent = "—";
    noteEl.textContent = "";
    outputEl.closest(".gpc-output").style.display = "none";
}

function showOutput() {
    outputEl.closest(".gpc-output").style.display = "block";
}

function setError(message) {
    outputEl.textContent = "—";
    noteEl.textContent = message;
}

function setResult(paceText, noteText) {
    outputEl.textContent = paceText;
    noteEl.textContent = noteText;
}

// Fancy button behavior: delay results until the "loading" finishes
function runButtonLoading() {
    btnEl.disabled = true;
    const originalText = btnEl.textContent;
    btnEl.textContent = "计算中…";
    btnEl.style.opacity = "0.9";

    return new Promise((resolve) => {
        window.setTimeout(() => {
            btnEl.disabled = false;
            btnEl.textContent = originalText;
            btnEl.style.opacity = "";
            resolve();
        }, 260); // delay length (keep this synced with your desired feel)
    });
}

// ---------- Core calc ----------
function calculateAndRender() {
    const distKey = distanceEl.value;
    const distKm = DIST_KM[distKey];

    if (!distKm) {
        setError("先选择比赛距离。");
        return;
    }

    const { h, m, s, total } = getTotalSeconds();
    if (total <= 0) {
        setError("请输入目标完赛时间（至少 1 秒）。");
        return;
    }

    const paceSecPerKm = total / distKm;
    const paceText = formatPace(paceSecPerKm);
    const noteText = `目标时间 ${formatTime(h, m, s)} ｜距离 ${distKm} km`;

    setResult(paceText, noteText);
}

// ---------- Events ----------
btnEl.addEventListener("click", async () => {
    // First click: reveal output area (but only after loading delay)
    await runButtonLoading();

    hasCalculatedOnce = true;
    showOutput();
    calculateAndRender();
});

// IMPORTANT: No auto-calc on input changes.
// We only allow updates AFTER user has clicked calculate at least once.
// (This keeps your "only show results when button clicked" promise.)
[distanceEl, hoursEl, minutesEl, secondsEl].forEach((el) => {
    el.addEventListener("input", () => {
        if (!hasCalculatedOnce) return;
        // If they've already calculated once, we still don't update automatically.
        // Keep it strict: results update only on button clicks.
    });
});

// Optional: Enter key triggers calculation, but still respects the delay
[hoursEl, minutesEl, secondsEl].forEach((el) => {
    el.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();

        await runButtonLoading();
        hasCalculatedOnce = true;
        showOutput();
        calculateAndRender();
    });
});

// ---------- Init ----------
hideOutput(); // output stays hidden until first calculate
