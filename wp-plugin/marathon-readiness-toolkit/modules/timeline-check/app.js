(() => {
    const root = document.querySelector("#timeline-check");
    if (!root) return;

    // ===========================
    // Module auto-detect (tc or pgc)
    // ===========================
    const isTC = !!root.querySelector("#tc-form");
    const P = isTC ? "tc" : "pgc"; // prefix

    function $(id) {
        return root.querySelector(`#${P}-${id}`);
    }

    // ===========================
    // Constants
    // ===========================
    const BLOCK_WEEKS = 8;

    // ===========================
    // DOM
    // ===========================
    const formEl = root.querySelector(`#${P}-form`);
    const btnEl = root.querySelector(`#${P}-btn`);

    const currentEl = $(`current`);
    const goalEl = $(`goal`);
    const weeksEl = $(`weeks`);

    const rowPaceHighEl = $(`row-pace-high`);
    const rowRemainHighEl = $(`row-remain-high`);
    const rowNeedHighEl = $(`row-need-high`);


    const outputBoxEl = $(`output-box`);

    const errorEl = $(`error`);

    // Headings that must become "X 周..."
    const label1El = $(`label-window-1`);
    const label2El = $(`label-window-2`);
    const label3El = $(`label-window-3`);

    // Section 1
    const gapEl = $(`gap`);

    // Section 2
    const lowLabelEl = $(`low-label`);
    const highLabelEl = $(`high-label`);
    const paceLowEl = $(`pace-low`);
    const paceHighEl = $(`pace-high`);
    const spreadEl = $(`spread`);

    // Section 3
    const remainLowEl = $(`remain-low`);
    const remainHighEl = $(`remain-high`);

    // Section 4
    const needLowLabelEl = $(`need-low-label`);
    const needHighLabelEl = $(`need-high-label`);
    const needLowEl = $(`need-low`);
    const needHighEl = $(`need-high`);

    // Section 5
    const assumptionsEl = $(`assumptions`);

    // Hide output until click
    if (outputBoxEl) outputBoxEl.style.display = "none";

    // ===========================
    // Helpers
    // ===========================
    function getRunnerLevel() {
        // IMPORTANT: scope to THIS form so multiple modules won't conflict
        const checked = formEl?.querySelector('input[name="level"]:checked');
        return checked ? checked.value : "beginner";
    }

    function toIntOrNull(v) {
        const n = parseInt(String(v), 10);
        return Number.isFinite(n) ? n : null;
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

    function formatPaceFromSeconds(secPerKm) {
        const m = Math.floor(secPerKm / 60);
        const s = String(secPerKm % 60).padStart(2, "0");
        return `${m}:${s}`;
    }

    function formatSignedSecondsOnly(n) {
        const sign = n > 0 ? "+" : n < 0 ? "−" : "";
        return `${sign}${Math.abs(n)}`;
    }

    function formatSignedSecPerKm(n) {
        const sign = n > 0 ? "+" : n < 0 ? "−" : "";
        return `${sign}${Math.abs(n)} 秒 / km`;
    }

    function levelLabel(level) {
        if (level === "advanced") return "高阶";
        if (level === "intermediate") return "进阶";
        return "入门";
    }

    function formatPctRange(low, high) {
        const lowPct = Math.round(low * 100);
        const highPct = Math.round(high * 100);

        // single-point case (advanced runner)
        if (lowPct === highPct) {
            return `≈ ${lowPct}%`;
        }

        return `${lowPct}–${highPct}%`;
    }
    function clearError() {
        if (errorEl) {
            errorEl.textContent = "";
            errorEl.style.display = "none";
        }
        if (currentEl) currentEl.removeAttribute("aria-invalid");
        if (goalEl) goalEl.removeAttribute("aria-invalid");
        if (weeksEl) weeksEl.removeAttribute("aria-invalid");
    }

    function shakeButton() {
        if (!btnEl) return;
        btnEl.animate(
            [
                { transform: "translateX(0)" },
                { transform: "translateX(-6px)" },
                { transform: "translateX(6px)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(5px)" },
                { transform: "translateX(-3px)" },
                { transform: "translateX(3px)" },
                { transform: "translateX(0)" },
            ],
            { duration: 260, iterations: 1 }
        );
    }

    function showError({ msg, invalidEl = null }) {
        // IMPORTANT: do NOT show the output panel
        if (outputBoxEl) outputBoxEl.style.display = "none";

        // show inline error message
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = "block";
        }

        // mark field
        if (invalidEl) {
            invalidEl.setAttribute("aria-invalid", "true");
            invalidEl.focus();
            invalidEl.select?.();
        }

        // shake submit button
        shakeButton();
    }



    // ===========================
    // Improvement bands (assumptions)
    // ===========================
    function getImprovementBandByLevel(level) {
        if (level === "advanced") return { low: 0.02, high: 0.02 };
        if (level === "intermediate") return { low: 0.03, high: 0.04 };
        return { low: 0.04, high: 0.06 };
    }

    // ===========================
    // Fractional-block model
    // pace_after = current * (1 - rate)^(weeks / 8)
    // ===========================
    function paceAfterWeeks({ currentSecPerKm, rate, weeks }) {
        if (!(rate > 0 && rate < 1)) return null;
        if (!(weeks > 0)) return Math.round(currentSecPerKm);

        const blocks = weeks / BLOCK_WEEKS;
        const factor = Math.pow(1 - rate, blocks);
        return Math.round(currentSecPerKm * factor);
    }

    // weeks needed to reach goal (same model)
    // weeks >= 8 * ln(goal/current) / ln(1-rate)
    function weeksNeededToReachGoal({
        currentSecPerKm,
        goalSecPerKm,
        rate,
        maxWeeks = 208,
    }) {
        if (currentSecPerKm <= goalSecPerKm) return 0;
        if (!(rate > 0 && rate < 1)) return null;

        const ratio = goalSecPerKm / currentSecPerKm; // <1
        if (!(ratio > 0 && ratio < 1)) return null;

        const denom = Math.log(1 - rate); // negative
        const numer = Math.log(ratio); // negative
        const weeks = BLOCK_WEEKS * (numer / denom);

        if (!Number.isFinite(weeks)) return null;
        if (weeks > maxWeeks) return null;

        return Math.ceil(weeks);
    }

    // ===========================
    // Build UI data
    // ===========================
    function computeAll({ currentSec, goalSec, weeksNum, level }) {
        const band = getImprovementBandByLevel(level);

        const w =
            Number.isFinite(weeksNum) && weeksNum > 0 ? weeksNum : BLOCK_WEEKS;

        const paceLow = paceAfterWeeks({
            currentSecPerKm: currentSec,
            rate: band.low,
            weeks: w,
        });

        const paceHigh = paceAfterWeeks({
            currentSecPerKm: currentSec,
            rate: band.high,
            weeks: w,
        });

        const spread = Math.abs(paceLow - paceHigh);

        const gapNow = currentSec - goalSec; // + means goal faster than current

        const remainLow = paceLow - goalSec; // + means still slower than goal
        const remainHigh = paceHigh - goalSec;

        const needWeeksLow = weeksNeededToReachGoal({
            currentSecPerKm: currentSec,
            goalSecPerKm: goalSec,
            rate: band.low,
        });

        const needWeeksHigh = weeksNeededToReachGoal({
            currentSecPerKm: currentSec,
            goalSecPerKm: goalSec,
            rate: band.high,
        });

        return {
            weeksWindow: w,
            pctLow: Math.round(band.low * 100),
            pctHigh: Math.round(band.high * 100),
            paceLow,
            paceHigh,
            spread,
            gapNow,
            remainLow,
            remainHigh,
            needWeeksLow,
            needWeeksHigh,
            level,
        };
    }

    function weeksLine(needWeeks, weeksAvailable) {
        if (needWeeks === 0) return `已在目标范围内`;
        if (needWeeks === null) return `可能需要很久（或并非线性可达）`;

        const blocks = Math.ceil(needWeeks / BLOCK_WEEKS);
        let s = `约 ${needWeeks} 周（${blocks} 个训练块）`;

        if (Number.isFinite(weeksAvailable) && weeksAvailable > 0) {
            s += needWeeks <= weeksAvailable ? ` ✅` : ` ⚠️`;
        }
        return s;
    }

    function renderAssumptions(level) {
        const band = getImprovementBandByLevel(level);
        const pctRange = formatPctRange(band.low, band.high);

        const items = [
            `${levelLabel(level)}跑者：参考提升幅度 ${pctRange} / 训练块`,
            `训练块：研究常见 6–8 周；本工具统一按 ${BLOCK_WEEKS} 周作为参考尺度`,
            `前提：训练较结构化且一致性良好；个体差异很大（不做承诺）`,
        ];

        // fill <ul>
        if (!assumptionsEl) return;
        assumptionsEl.innerHTML = items.map((t) => `<li>${t}</li>`).join("");
    }

    // ===========================
    // Update the 3 "X 周..." headings
    // ===========================
    function renderWindowLabels(displayWeeks) {
        if (label1El)
            label1El.textContent = `按 ${displayWeeks} 周时间窗口（以 ${BLOCK_WEEKS} 周训练块为参考尺度），可能达到的配速区间`;
        if (label2El) label2El.textContent = `${displayWeeks} 周后，与目标配速仍相差`;
        if (label3El) label3El.textContent = `如果在  ${displayWeeks} 周内未达到目标，大约需要多长时间才能达到目标？`;
    }

    // ===========================
    // Button UX
    // ===========================
    function setLoading(isLoading) {
        if (!btnEl) return;
        btnEl.disabled = isLoading;
        btnEl.style.opacity = isLoading ? "0.75" : "";
        btnEl.textContent = isLoading ? "计算中…" : "现实检查一下";
    }

    // ===========================
    // Render to UI (NEW HTML IDs)
    // ===========================
    function renderUI({ data, weeksNum }) {
        const isSingle = data.pctLow === data.pctHigh;

        // 1) gap now
        if (gapEl) gapEl.textContent = formatSignedSecondsOnly(data.gapNow);

        // 2) improvement range
        if (isSingle) {
            if (lowLabelEl) lowLabelEl.textContent = `预计（提升 ${data.pctLow}%）`;
            if (paceLowEl)
                paceLowEl.textContent = `${formatPaceFromSeconds(data.paceLow)} /km`;

            if (rowPaceHighEl) rowPaceHighEl.style.display = "none";
            if (spreadEl) spreadEl.style.display = "none";
        } else {
            if (rowPaceHighEl) rowPaceHighEl.style.display = "";
            if (spreadEl) spreadEl.style.display = "";

            if (lowLabelEl) lowLabelEl.textContent = `低估（提升 ${data.pctLow}%）`;
            if (highLabelEl) highLabelEl.textContent = `高估（提升 ${data.pctHigh}%）`;

            if (paceLowEl)
                paceLowEl.textContent = `${formatPaceFromSeconds(data.paceLow)} /km`;
            if (paceHighEl)
                paceHighEl.textContent = `${formatPaceFromSeconds(data.paceHigh)} /km`;

            spreadEl.textContent = `低 / 高估差值：${data.spread} 秒 / km`;
        }

        // 3) remaining vs goal
        if (isSingle) {
            if (remainLowEl)
                remainLowEl.textContent = formatSignedSecPerKm(data.remainLow);
            if (rowRemainHighEl) rowRemainHighEl.style.display = "none";
        } else {
            if (rowRemainHighEl) rowRemainHighEl.style.display = "";
            if (remainLowEl)
                remainLowEl.textContent = formatSignedSecPerKm(data.remainLow);
            if (remainHighEl)
                remainHighEl.textContent = formatSignedSecPerKm(data.remainHigh);
        }

        // 4) time needed
        if (isSingle) {
            if (needLowLabelEl)
                needLowLabelEl.textContent = `按提升率（${data.pctLow}%）`;
            if (needLowEl)
                needLowEl.textContent = weeksLine(data.needWeeksLow, weeksNum);

            if (rowNeedHighEl) rowNeedHighEl.style.display = "none";
        } else {
            if (rowNeedHighEl) rowNeedHighEl.style.display = "";

            if (needLowLabelEl)
                needLowLabelEl.textContent = `按低提升率（${data.pctLow}%）`;
            if (needHighLabelEl)
                needHighLabelEl.textContent = `按高提升率（${data.pctHigh}%）`;

            if (needLowEl)
                needLowEl.textContent = weeksLine(data.needWeeksLow, weeksNum);
            if (needHighEl)
                needHighEl.textContent = weeksLine(data.needWeeksHigh, weeksNum);
        }

        // 5) assumptions list
        renderAssumptions(data.level);
    }

    // ===========================
    // Main
    // ===========================
    btnEl?.addEventListener("click", () => {
        clearError();

        const level = getRunnerLevel();

        const currentRaw = currentEl?.value?.trim() ?? "";
        const goalRaw = goalEl?.value?.trim() ?? "";
        const weeksRaw = weeksEl?.value?.trim() ?? "";

        // ---- Required field checks (shake + message) ----
        if (!currentRaw) {
            showError({ msg: "请先填写【当前可持续配速】（例如 5:10 或 5）。", invalidEl: currentEl });
            return;
        }

        if (!goalRaw) {
            showError({ msg: "请先填写【目标配速】（例如 5:00）。", invalidEl: goalEl });
            return;
        }

        if (!weeksRaw) {
            showError({ msg: "请先填写【距离比赛还有多少周】（例如 8）。", invalidEl: weeksEl });
            return;
        }

        const weeksNum = toIntOrNull(weeksRaw);
        if (!Number.isFinite(weeksNum) || weeksNum <= 0) {
            showError({ msg: "【剩余周数】需要是大于 0 的整数（例如 8）。", invalidEl: weeksEl });
            return;
        }

        const currentSec = parsePaceToSeconds(currentRaw);
        const goalSec = parsePaceToSeconds(goalRaw);

        if (currentSec === null) {
            showError({ msg: "【当前配速】请按 m:ss 输入（例如 5:10），或输入 5 表示 5:00。", invalidEl: currentEl });
            return;
        }

        if (goalSec === null) {
            showError({ msg: "【目标配速】请按 m:ss 输入（例如 5:00），或输入 5 表示 5:00。", invalidEl: goalEl });
            return;
        }

        // ---- Goal must be faster than current ----
        if (goalSec >= currentSec) {
            showError({
                msg: "目标配速需要比当前配速更快（数字更小）。例如：当前 5:10，目标 5:00。",
                invalidEl: goalEl,
            });
            return;
        }

        // Update headings immediately
        renderWindowLabels(weeksNum);

        const data = computeAll({
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
            renderUI({ data, weeksNum });
            setLoading(false);
        }, 450);
    });


    
})();
