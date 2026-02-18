// pt/events.js
import { auth, clearLocalOnly, clearServerPayloadNow, getState, saveState } from './state.js';
import { parseDateToMs, readPaceFromInputs, writePaceToInputs, calcPaceFromRun } from './helpers.js';
import { clearError, showError, clearDateWarn, showDateWarn } from './ui.js';

export function bindEvents(dom, { setMode, rerenderAll, getLevel, getEditLevel }) {
	const state = getState();

	// resize layout
	window.addEventListener('resize', () => {
		// layout is handled by rerenderAll() calling applyPrimaryActionLayout
		rerenderAll();
	});

	// defaults: checkin date = today (if empty)
	(function setDefaults() {
		const today = new Date();
		const yyyy = today.getFullYear();
		const mm = String(today.getMonth() + 1).padStart(2, '0');
		const dd = String(today.getDate()).padStart(2, '0');
		const iso = `${yyyy}-${mm}-${dd}`;
		if (dom.checkinDateEl && !dom.checkinDateEl.value) dom.checkinDateEl.value = iso;
	})();

	// warn if check-in date > race date
	dom.checkinDateEl?.addEventListener('input', () => {
		clearDateWarn(dom);
		const st = getState();
		if (!st.config) return;

		const date = dom.checkinDateEl.value?.trim() ?? '';
		const checkinMs = parseDateToMs(date);
		const raceMs = parseDateToMs(st.config.raceDate);

		if (!date || !checkinMs || !raceMs) return;

		if (checkinMs > raceMs) {
			showDateWarn(dom, '⚠️ 这个日期在比赛日之后：趋势线只接受比赛日当天及之前的打卡。请改成比赛日前的日期。');
		}
	});

	// Clear all guest data
	dom.clearBtn?.addEventListener('click', async () => {
		const ok = confirm('这将永久删除所有访客数据（比赛设置 + 打卡记录）。确定继续？');
		if (!ok) return;

		clearLocalOnly();

		if (dom.raceDateEl) dom.raceDateEl.value = '';
		if (dom.editRaceDateEl) dom.editRaceDateEl.value = '';

		// Clear goal pace inputs (setup + edit)
		if (dom.goalMinEl) dom.goalMinEl.value = '';
		if (dom.goalSecEl) dom.goalSecEl.value = '';
		if (dom.editGoalMinEl) dom.editGoalMinEl.value = '';
		if (dom.editGoalSecEl) dom.editGoalSecEl.value = '';

		// Clear check-in pace inputs
		if (dom.paceMinEl) dom.paceMinEl.value = '';
		if (dom.paceSecEl) dom.paceSecEl.value = '';
		if (dom.checkinDateEl) dom.checkinDateEl.value = '';
		if (dom.distEl) dom.distEl.value = '';
		if (dom.hEl) dom.hEl.value = '';
		if (dom.mEl) dom.mEl.value = '';
		if (dom.sEl) dom.sEl.value = '';

		if (auth.IS_LOGGED_IN) {
			await clearServerPayloadNow();
		}

		setMode(false);
		rerenderAll();
	});

	// Save settings
	dom.saveSettingsBtn?.addEventListener('click', () => {
		clearError(dom);
		const st = getState();
		if (!st.config) return;

		const raceDate = dom.editRaceDateEl?.value?.trim() ?? '';
		if (!raceDate || !parseDateToMs(raceDate)) {
			showError(dom, '请输入有效的比赛日期。');
			return;
		}

		const goalPaceSec = readPaceFromInputs(dom.editGoalMinEl, dom.editGoalSecEl, {
			allowBlank: true,
		});

		const goalHasAny =
			!!String(dom.editGoalMinEl?.value ?? '').trim() || !!String(dom.editGoalSecEl?.value ?? '').trim();

		if (goalHasAny && goalPaceSec === null) {
			showError(dom, '目标配速请输入有效的 m:ss（秒数需 0–59）。例如：5:00');
			return;
		}

		st.config.raceDate = raceDate;
		st.config.goalPaceSec = goalPaceSec;
		st.config.level = getEditLevel();

		saveState();
		rerenderAll();
	});

	// Start Trendline
	dom.startBtn?.addEventListener('click', () => {
		clearError(dom);

		const raceDate = dom.raceDateEl?.value?.trim() ?? '';
		if (!raceDate || !parseDateToMs(raceDate)) {
			showError(dom, '请先输入有效的比赛日期（YYYY-MM-DD），再开始趋势线。');
			return;
		}

		const goalSec = readPaceFromInputs(dom.editGoalMinEl, dom.editGoalSecEl, {
			allowBlank: true,
		});

		const goalHasAny =
			!!String(dom.editGoalMinEl?.value ?? '').trim() || !!String(dom.editGoalSecEl?.value ?? '').trim();

		if (goalHasAny && goalSec === null) {
			showError(dom, '目标配速请输入有效的 m:ss（秒数需 0–59）。例如：5:00');
			return;
		}

		const st = getState();
		st.config = {
			raceDate,
			goalPaceSec: goalSec,
			level: getLevel(),
		};

		saveState();
		setMode(true);
		rerenderAll();
	});

	// Run → Pace calculator
	dom.calcPaceBtn?.addEventListener('click', () => {
		clearError(dom);

		const distKm = Number(dom.distEl?.value ?? 0);
		const hh = Number(dom.hEl?.value ?? 0);
		const mm = Number(dom.mEl?.value ?? 0);
		const ss = Number(dom.sEl?.value ?? 0);

		const paceSec = calcPaceFromRun(distKm, hh, mm, ss);
		if (paceSec === null) {
			showError(dom, '请输入有效的距离（km）和完成时间，以计算配速。');
			return;
		}

		writePaceToInputs(dom.paceMinEl, dom.paceSecEl, paceSec);
	});

	// Add check-in
	dom.addBtn?.addEventListener('click', () => {
		clearError(dom);
		clearDateWarn(dom);

		const st = getState();

		if (!st.config) {
			showError(dom, '请先设置比赛日期并开始趋势线。');
			return;
		}

		const date = dom.checkinDateEl?.value?.trim() ?? '';
		const checkinMs = parseDateToMs(date);
		if (!date || !checkinMs) {
			showError(dom, '请输入有效的打卡日期（YYYY-MM-DD）。');
			return;
		}

		const raceMs = parseDateToMs(st.config.raceDate);
		if (raceMs && checkinMs > raceMs) {
			showDateWarn(dom, '⚠️ 打卡日期在比赛日之后，请改成比赛日前或比赛日当天。');
			showError(dom, '打卡日期必须早于或等于比赛日期。');
			return;
		}

		const exists = st.checkins.some((c) => c.date === date);
		if (exists) {
			showError(dom, '该日期已有打卡记录。请先删除该记录或选择新的日期。');
			return;
		}

		const paceSecPerKm = readPaceFromInputs(dom.paceMinEl, dom.paceSecEl, {
			allowBlank: false,
		});

		const paceHasAny = !!String(dom.paceMinEl?.value ?? '').trim() || !!String(dom.paceSecEl?.value ?? '').trim();

		if (!paceHasAny || paceSecPerKm === null) {
			showError(dom, '请输入当前可持续配速（m:ss /km）（秒数需 0–59），或使用跑步计算器自动填入。');
			return;
		}

		st.checkins.push({
			id: crypto.randomUUID(),
			date,
			paceSecPerKm,
			source: 'pace',
		});

		if (dom.paceMinEl) dom.paceMinEl.value = '';
		if (dom.paceSecEl) dom.paceSecEl.value = '';

		saveState();
		rerenderAll();
	});
}
