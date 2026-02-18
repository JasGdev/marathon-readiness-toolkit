// pt/ui.js
import { parsePaceToSeconds, writePaceToInputs } from './helpers.js';

export function applyPrimaryActionLayout(dom) {
	const { root, calcPaceBtn, addBtn } = dom;
	if (!root) return;

	const actionsEl = calcPaceBtn?.closest('.pt-actions') || addBtn?.closest('.pt-actions') || null;
	if (!actionsEl || !calcPaceBtn || !addBtn) return;

	actionsEl.style.display = 'flex';
	actionsEl.style.justifyContent = 'center';
	actionsEl.style.alignItems = 'center';
	actionsEl.style.gap = '12px';
	actionsEl.style.flexWrap = 'wrap';

	const isMobile = window.matchMedia('(max-width: 520px)').matches;

	[calcPaceBtn, addBtn].forEach((b) => {
		b.style.display = 'block';
		b.style.margin = '0';
		b.style.width = isMobile ? '100%' : '48%';
		b.style.maxWidth = '520px';
		b.style.minWidth = '240px';
	});
}

export function setMode(dom, isStarted) {
	const { setupBox, checkinBox, chartCardEl, dataCardEl } = dom;
	if (setupBox) setupBox.style.display = isStarted ? 'none' : 'block';
	if (checkinBox) checkinBox.style.display = isStarted ? 'block' : 'none';
	if (chartCardEl) chartCardEl.style.display = isStarted ? 'block' : 'none';
	if (dataCardEl) dataCardEl.style.display = isStarted ? 'block' : 'none';
}

export function clearError(dom) {
	const { errorEl } = dom;
	if (!errorEl) return;
	errorEl.textContent = '';
	errorEl.style.display = 'none';
}

export function showError(dom, msg) {
	const { errorEl } = dom;
	if (!errorEl) return;
	errorEl.textContent = msg;
	errorEl.style.display = 'block';
}

export function showDateWarn(dom, msg) {
	const { dateWarnEl } = dom;
	if (!dateWarnEl) return;
	dateWarnEl.textContent = msg;
	dateWarnEl.style.display = 'block';
}

export function clearDateWarn(dom) {
	const { dateWarnEl } = dom;
	if (!dateWarnEl) return;
	dateWarnEl.textContent = '';
	dateWarnEl.style.display = 'none';
}

export function setEditLevelUI(dom, level) {
	const { editLevelWrapEl } = dom;
	if (!editLevelWrapEl) return;
	const el = editLevelWrapEl.querySelector(`input[name="edit-level"][value="${level}"]`);
	if (el) el.checked = true;
}

export function syncSettingsUI(dom, state) {
	if (!state.config) return;

	const { editRaceDateEl, editGoalMinEl, editGoalSecEl } = dom;

	if (editRaceDateEl) editRaceDateEl.value = state.config.raceDate;

	// Fill edit goal pace inputs
	const g = state.config.goalPaceSec;
	const gSec = Number.isFinite(g) ? g : typeof g === 'string' && g.trim() ? parsePaceToSeconds(g.trim()) : null;
	writePaceToInputs(editGoalMinEl, editGoalSecEl, gSec);

	setEditLevelUI(dom, state.config.level || 'beginner');
}
