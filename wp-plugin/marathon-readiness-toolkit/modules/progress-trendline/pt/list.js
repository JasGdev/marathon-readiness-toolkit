// pt/list.js
import { paceAfterWeeks, scenarioRates, getBlockDecayByLevel, getMaxTotalImprovementByLevel } from '../growthModel.js';
import { parseDateToMs, weeksBetweenMs, formatPace } from './helpers.js';
import { saveState, getState } from './state.js';

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

export function renderList(dom, rerenderAll) {
	const state = getState();
	const { listEl } = dom;
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
						proj.bandHigh,
					)} /km（每 8 周 ${proj.pctLow}–${proj.pctHigh}%）`
				: '';

			return `
      <div class="pt-row" data-id="${c.id}">
        <div class="pt-date">${c.date}</div>
        <div class="pt-pace">${formatPace(c.paceSecPerKm)} /km</div>
        <div class="pt-proj">${projText}</div>
        <button class="pt-del" type="button">删除</button>
      </div>
    `;
		})
		.join('');

	listEl.querySelectorAll('.pt-del').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			const row = e.target.closest('.pt-row');
			const id = row?.dataset?.id;
			if (!id) return;

			const st = getState();
			st.checkins = st.checkins.filter((x) => x.id !== id);
			saveState();
			if (rerenderAll) rerenderAll();
		});
	});
}
