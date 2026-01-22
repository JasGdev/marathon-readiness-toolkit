console.log("app.js loaded");

// ===========================
// Module auto-detect (tc or pgc)
// ===========================
const isTC = !!document.querySelector("#tc-form");
const P = isTC ? "tc" : "pgc"; // prefix

function $(id) {
    return document.querySelector(`#${P}-${id}`);
}

// ===========================
// Constants
// ===========================
const BLOCK_WEEKS = 8; // we use 8-week training block assumption

// ===========================
// DOM
// ===========================
const formEl = document.querySelector(`#${P}-form`);
const btnEl = document.querySelector(`#${P}-btn`);

const currentEl = $(`current`);
const goalEl = $(`goal`);
const weeksEl = $(`weeks`);

const outputBoxEl = $(`output-box`);
const gapEl = $(`gap`);
const badgeEl = $(`badge`);
const messageEl = $(`message`);
const metaEl = $(`meta`);

const label1El = document.querySelector(`#${P}-label-window-1`);
const label2El = document.querySelector(`#${P}-label-window-2`);
const label3El = document.querySelector(`#${P}-label-window-3`);

// Hide output until click
if (outputBoxEl) outputBoxEl.style.display = "none";

// ===========================
// Helpers
// ===========================
function getRunnerLevel() {
    const checked = formEl?.querySelector('input[name="level"]:checked');
    return checked ? checked.value : null;
}

function toIntOrNull(v) {
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
}

// Parse pace input to seconds per km
// Accepts:
// - "5:10" → 310
// - "05:10" → 310
// - "5" → 300  (interpreted as 5:00)
function parsePaceToSeconds(paceStr) {
    const s = String(paceStr).trim();
    if (!s) return null;

    // Case 1: whole number like "5" or "6"
    if (/^\d{1,2}$/.test(s)) {
        const min = toIntOrNull(s);
        if (min === null) return null;
        return min * 60;
    }

    // Case 2: m:ss format
    const m = s.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
    if (!m) return null;

    const min = toIntOrNull(m[1]);
    const sec = toIntOrNull(m[2]);

    if (min === null || sec === null) return null;
    if (sec < 0 || sec >= 60) return null;

    return min * 60 + sec;
}

function formatSignedSeconds(n) {
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return `${sign}${Math.abs(n)}`;
}

function formatPaceFromSeconds(secPerKm) {
    const m = Math.floor(secPerKm / 60);
    const s = String(secPerKm % 60).padStart(2, "0");
    return `${m}:${s}`;
}

function formatSignedPaceDiffSeconds(n) {
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return `${sign}${Math.abs(n)} 秒/km`;
}

// ===========================
// Evidence-informed bands (time-trial % improvement)
// - trained ≈ 2%
// - lower training status up to ~6%
// NOTE: Used as a "reference ruler" (scale), not a prediction.
// ===========================
function getImprovementBandByLevel(level) {
    if (level === "advanced") {
        return { low: 0.02, high: 0.02 }; // trained ~2%
    }
    if (level === "intermediate") {
        return { low: 0.03, high: 0.04 }; // conservative middle assumption
    }
    return { low: 0.04, high: 0.06 }; // beginner: ~4–6%
}

// ===========================
// Assumptions text (explicit)
// ===========================
function levelLabel(level) {
    if (level === "advanced") return "高阶";
    if (level === "intermediate") return "进阶";
    return "入门";
}

function buildAssumptionsText(level) {
    const band = getImprovementBandByLevel(level);
    const pctRange = `${Math.round(band.low * 100)}%–${Math.round(band.high * 100)}%`;

    return [
        `假设（用于提供尺度感，不是结果预测）：`,
        `• 你选择的阶段：${levelLabel(level)} → 参考短期表现提升幅度约 ${pctRange} / 训练块`,
        `• 训练块：研究里常见为 6–8 周；本工具统一按 ${BLOCK_WEEKS} 周作为参考窗口`,
        `• 前提：训练相对结构化且一致性较好；个体差异很大`,
    ].join("\n");
}

// ===========================
// New features: fractional-block model + "time needed"
// ===========================

// Pace after N weeks, using an 8-week block assumption.
// Model: pace_after = current * (1 - rate)^(weeks / 8)
// - uses fractional blocks (e.g., 11 weeks = 1.375 blocks)
function paceAfterWeeks({ currentSecPerKm, rate, weeks }) {
    if (!(rate > 0 && rate < 1)) return null;
    if (!(weeks > 0)) return Math.round(currentSecPerKm);

    const blocks = weeks / BLOCK_WEEKS;
    const factor = Math.pow(1 - rate, blocks);
    return Math.round(currentSecPerKm * factor);
}

// How many weeks needed to reach goal, using the same model.
// We solve: current * (1 - rate)^(weeks/8) <= goal
// => weeks >= 8 * ln(goal/current) / ln(1 - rate)
function weeksNeededToReachGoal({ currentSecPerKm, goalSecPerKm, rate, maxWeeks = 208 }) {
    if (currentSecPerKm <= goalSecPerKm) return 0;
    if (!(rate > 0 && rate < 1)) return null;

    const ratio = goalSecPerKm / currentSecPerKm; // < 1 if goal faster
    if (!(ratio > 0 && ratio < 1)) return null;

    const denom = Math.log(1 - rate); // negative
    const numer = Math.log(ratio);    // negative

    const weeks = BLOCK_WEEKS * (numer / denom); // positive
    if (!Number.isFinite(weeks)) return null;

    if (weeks > maxWeeks) return null;
    return Math.ceil(weeks); // round up to be conservative
}

function computeImprovementRange({ currentSecPerKm, goalSecPerKm, level, weeksAvailable }) {
    const band = getImprovementBandByLevel(level);

    // If user didn't enter weeks, default to 8-week reference
    const w =
        Number.isFinite(weeksAvailable) && weeksAvailable > 0
            ? weeksAvailable
            : BLOCK_WEEKS;

    const paceLow = paceAfterWeeks({ currentSecPerKm, rate: band.low, weeks: w });
    const paceHigh = paceAfterWeeks({ currentSecPerKm, rate: band.high, weeks: w });

    const spread = Math.abs(paceLow - paceHigh);

    const remainingLow = paceLow - goalSecPerKm;
    const remainingHigh = paceHigh - goalSecPerKm;

    // Weeks needed to reach goal (low/high rate)
    const needWeeksLow = weeksNeededToReachGoal({
        currentSecPerKm,
        goalSecPerKm,
        rate: band.low,
        maxWeeks: 208, // cap ~4 years
    });

    const needWeeksHigh = weeksNeededToReachGoal({
        currentSecPerKm,
        goalSecPerKm,
        rate: band.high,
        maxWeeks: 208,
    });

    return {
        w,
        rateLow: band.low,
        rateHigh: band.high,
        paceLow,
        paceHigh,
        spread,
        remainingLow,
        remainingHigh,
        needWeeksLow,
        needWeeksHigh,
    };
}

function buildWeeksNeededLine({ needWeeks, label, weeksAvailable }) {
    if (needWeeks === 0) {
        return `${label}：已在目标范围内（无需额外时间）`;
    }
    if (needWeeks === null) {
        return `${label}：按此模型可能需要很久（或并非线性可达）`;
    }

    // show also blocks count
    const blocks = Math.ceil(needWeeks / BLOCK_WEEKS);
    let line = `${label}：约 ${needWeeks} 周（≈ ${blocks} 个训练块，按 ${BLOCK_WEEKS} 周/块）`;

    if (Number.isFinite(weeksAvailable) && weeksAvailable > 0) {
        if (needWeeks <= weeksAvailable) line += ` ✅（在你剩余 ${weeksAvailable} 周内）`;
        else line += ` ⚠️（超过你剩余 ${weeksAvailable} 周）`;
    }

    return line;
}

function buildOutput({ currentSec, goalSec, weeksNum, level }) {
    const gapNow = currentSec - goalSec;
    const assumptions = buildAssumptionsText(level);

    const r = computeImprovementRange({
        currentSecPerKm: currentSec,
        goalSecPerKm: goalSec,
        level,
        weeksAvailable: weeksNum,
    });

    const pctLow = Math.round(r.rateLow * 100);
    const pctHigh = Math.round(r.rateHigh * 100);

    // Badge based on whether their weeks available gets them to goal
    let badge = "参考区间";
    if (r.remainingHigh <= 0 && r.remainingLow <= 0) badge = "目标在区间内";
    else if (r.remainingHigh <= 0 && r.remainingLow > 0) badge = "边缘可达";
    else badge = "需要更久";

    // Message uses THEIR weeks if provided
    let message = `我们用“${BLOCK_WEEKS}周训练块”作为参考尺度（研究常见为 6–8 周），但下面的结果会按你填写的时间窗口计算（不是固定 8 周）。`;

    if (Number.isFinite(r.w)) {
        const blocks = (r.w / BLOCK_WEEKS).toFixed(2);
        message += ` 你填写还剩 ${r.w} 周 ≈ ${blocks} 个训练块。`;
    }

    const metaLines = [
        `${r.w} 周后（低提升率 ${pctLow}%）：${formatPaceFromSeconds(r.paceLow)} /km`,
        `${r.w} 周后（高提升率 ${pctHigh}%）：${formatPaceFromSeconds(r.paceHigh)} /km`,
        `低/高估差值：${r.spread} 秒/km`,
        ``,
        `与目标差距（低估）：${formatSignedPaceDiffSeconds(r.remainingLow)}`,
        `与目标差距（高估）：${formatSignedPaceDiffSeconds(r.remainingHigh)}`,
        ``,
        `如果在这 ${r.w} 周内仍未达到目标，按相同模型粗略估算达到目标需要：`,
        buildWeeksNeededLine({
            needWeeks: r.needWeeksLow,
            label: `• 低提升率 ${pctLow}%`,
            weeksAvailable: weeksNum,
        }),
        buildWeeksNeededLine({
            needWeeks: r.needWeeksHigh,
            label: `• 高提升率 ${pctHigh}%`,
            weeksAvailable: weeksNum,
        }),
        ``,
        assumptions,
    ];

    return {
        gapNow,
        badge,
        message,
        meta: metaLines.join("\n"),
    };
}

// ===========================
// UX helpers
// ===========================
function setLoading(isLoading) {
    if (!btnEl) return;
    btnEl.disabled = isLoading;
    btnEl.style.opacity = isLoading ? "0.75" : "";
    btnEl.textContent = isLoading ? "计算中…" : "现实检查一下";
}

function renderResult({ gapSecPerKm, badge, message, meta }) {
    gapEl.textContent = formatSignedSeconds(gapSecPerKm);
    badgeEl.textContent = badge;
    messageEl.textContent = message;
    metaEl.textContent = meta;
}

// ===========================
// Main
// ===========================
btnEl?.addEventListener("click", () => {
    const level = getRunnerLevel() || "beginner";

    const currentRaw = currentEl.value.trim();
    const goalRaw = goalEl.value.trim();
    const weeksNum =
        weeksEl.value.trim() === "" ? null : toIntOrNull(weeksEl.value.trim());

    const currentSec = parsePaceToSeconds(currentRaw);
    const goalSec = parsePaceToSeconds(goalRaw);

    // Basic validation
    if (currentSec === null || goalSec === null) {
        outputBoxEl.style.display = "block";
        renderResult({
            gapSecPerKm: 0,
            badge: "输入有误",
            message:
                "请按 m:ss 格式输入配速（例如 5:10）。也支持输入整数分钟（例如 5 代表 5:00）。",
            meta: "示例：当前 5:10，目标 5:00。\n\n" + buildAssumptionsText(level),
        });
        return;
    }

    const out = buildOutput({
        currentSec,
        goalSec,
        weeksNum,
        level,
    });

    // Delay + show
    setLoading(true);
    if (outputBoxEl) outputBoxEl.style.display = "none";

    window.setTimeout(() => {
        if (outputBoxEl) outputBoxEl.style.display = "block";
        renderResult({
            gapSecPerKm: out.gapNow,
            badge: out.badge,
            message: out.message,
            meta: out.meta,
        });
        setLoading(false);
    }, 450);
});
