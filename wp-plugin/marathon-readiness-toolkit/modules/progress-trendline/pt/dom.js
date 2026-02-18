// pt/dom.js

export function getDom() {
	const root = document.querySelector('#pt-root');
	const $ = (id) => root?.querySelector(`#pt-${id}`);

	// Extra cards (outside pt-checkin)
	const chartCardEl = $('chart-card');       // <div id="pt-chart-card">
	const dataCardEl = $('data-card');         // <div id="pt-data-card">
	const settingsCardEl = $('settings-card'); // <div id="pt-settings-card">

	// Warning msg
	const dateWarnEl = root?.querySelector('#pt-date-warn');

	// Setup panel
	const setupBox = $('setup');
	const raceDateEl = $('race-date');
	const goalMinEl = root?.querySelector('#pt-goal-min');
	const goalSecEl = root?.querySelector('#pt-goal-sec');
	const levelWrapEl = $('level-wrap');
	const startBtn = $('start-btn');

	// Check-in panel
	const checkinBox = $('checkin');
	const checkinDateEl = $('checkin-date');

	// Option B: run -> pace
	const distEl = $('dist-km');
	const hEl = $('h');
	const mEl = $('m');
	const sEl = $('s');
	const calcPaceBtn = $('calc-pace-btn');

	// Add/save
	const addBtn = $('add-btn');
	const listEl = $('list');
	const chartEl = $('chart');
	const errorEl = $('error');

	// Check-in pace m:ss inputs
	const paceMinEl = root?.querySelector('#pt-pace-min');
	const paceSecEl = root?.querySelector('#pt-pace-sec');

	// Edit settings (now inside settings card)
	const editRaceDateEl = $('edit-race-date');
	const editLevelWrapEl = $('edit-level-wrap');
	const saveSettingsBtn = $('save-settings-btn');

	// Edit goal pace m:ss inputs
	const editGoalMinEl = root?.querySelector('#pt-edit-goal-min');
	const editGoalSecEl = root?.querySelector('#pt-edit-goal-sec');

	// Clear guest data
	const clearBtn = $('clear-btn');

	return {
		root,
		$,
		chartCardEl,
		dataCardEl,
		settingsCardEl,
		dateWarnEl,
		setupBox,
		raceDateEl,
		goalMinEl,
		goalSecEl,
		levelWrapEl,
		startBtn,
		checkinBox,
		checkinDateEl,
		distEl,
		hEl,
		mEl,
		sEl,
		calcPaceBtn,
		addBtn,
		listEl,
		chartEl,
		errorEl,
		paceMinEl,
		paceSecEl,
		editRaceDateEl,
		editLevelWrapEl,
		saveSettingsBtn,
		editGoalMinEl,
		editGoalSecEl,
		clearBtn,
	};
}
