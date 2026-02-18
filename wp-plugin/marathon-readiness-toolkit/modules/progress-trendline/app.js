// modules/4-progress-trendline/app.js
console.log('module4 app.js loaded');

import { getDom } from './pt/dom.js';
import { getState, hydrateFromCloudIfNeeded } from './pt/state.js';
import { applyPrimaryActionLayout, setMode, syncSettingsUI } from './pt/ui.js';
import { renderList } from './pt/list.js';
import { renderChart } from './pt/chart.js';
import { bindEvents } from './pt/events.js';

const dom = getDom();

function getLevel() {
	const checked = dom.levelWrapEl?.querySelector('input[name="level"]:checked');
	return checked ? checked.value : 'beginner';
}

function getEditLevel() {
	const checked = dom.editLevelWrapEl?.querySelector('input[name="edit-level"]:checked');
	return checked ? checked.value : 'beginner';
}

function rerenderAll() {
	applyPrimaryActionLayout(dom);
	syncSettingsUI(dom, getState());

	if (!getState().config) return;

	renderList(dom, rerenderAll);
	renderChart(dom);
}

// init
(async function init() {
	setMode(dom, !!getState().config);
	rerenderAll();

	bindEvents(dom, {
		setMode: (isStarted) => setMode(dom, isStarted),
		rerenderAll,
		getLevel,
		getEditLevel,
	});

	await hydrateFromCloudIfNeeded({
		setMode: (isStarted) => setMode(dom, isStarted),
		rerenderAll,
	});
})();
