// pt/state.js
import { debounce } from './helpers.js';

const LS_KEY = 'mrt_pt_v1';

// ===========================
// WP Cloud Sync (WooCommerce / WordPress logged-in users)
// - Uses window.MRT injected by plugin:
//   window.MRT = { restUrl, nonce, isLoggedIn }
// - REST endpoints:
//   GET  /wp-json/mrt/v1/progress-trendline
//   POST /wp-json/mrt/v1/progress-trendline
// ===========================
const WP = window.MRT || {};
const IS_LOGGED_IN = !!WP.isLoggedIn;
const REST_ENDPOINT = WP.restUrl ? `${WP.restUrl}mrt/v1/progress-trendline` : null;

async function fetchServerPayload() {
	if (!IS_LOGGED_IN || !REST_ENDPOINT) return null;
	try {
		const res = await fetch(REST_ENDPOINT, {
			method: 'GET',
			credentials: 'same-origin',
			headers: { 'X-WP-Nonce': WP.nonce || '' },
		});
		if (!res.ok) return null;
		return await res.json(); // { version, state: {config, checkins}, updatedAt }
	} catch {
		return null;
	}
}

async function postServerPayload(payload) {
	if (!IS_LOGGED_IN || !REST_ENDPOINT) return false;
	try {
		const res = await fetch(REST_ENDPOINT, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': WP.nonce || '',
			},
			body: JSON.stringify(payload),
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ✅ immediate server clear helper
export async function clearServerPayloadNow() {
	if (!IS_LOGGED_IN || !REST_ENDPOINT) return false;
	const payload = {
		version: 1,
		state: { config: null, checkins: [] },
		updatedAt: Date.now(),
	};
	return await postServerPayload(payload);
}

function normalizeStateShape(s) {
	const obj = s && typeof s === 'object' ? s : null;
	return {
		config: obj?.config ?? null,
		checkins: Array.isArray(obj?.checkins) ? obj.checkins : [],
		updatedAt: Number.isFinite(obj?.updatedAt) ? obj.updatedAt : 0,
	};
}

function loadState() {
	try {
		const raw = localStorage.getItem(LS_KEY);
		const s = raw ? JSON.parse(raw) : null;
		return normalizeStateShape(s);
	} catch {
		return { config: null, checkins: [], updatedAt: 0 };
	}
}

let state = loadState();
export function getState() {
	return state;
}
export function setState(next) {
	state = next;
}

// Debounced cloud saver (only when logged in)
const saveCloudDebounced = debounce(async () => {
	const payload = {
		version: 1,
		state: { config: state.config, checkins: state.checkins },
		updatedAt: state.updatedAt,
	};
	await postServerPayload(payload);
}, 900);

export function saveState({ silentCloud = false } = {}) {
	state.updatedAt = Date.now();
	localStorage.setItem(LS_KEY, JSON.stringify(state));

	if (IS_LOGGED_IN && !silentCloud) {
		saveCloudDebounced();
	}
}

export async function hydrateFromCloudIfNeeded({ setMode, rerenderAll } = {}) {
	if (!IS_LOGGED_IN) return;

	const server = await fetchServerPayload();
	if (!server || !server.state) return;

	const serverState = normalizeStateShape({
		config: server.state?.config ?? null,
		checkins: server.state?.checkins ?? [],
		updatedAt: typeof server.updatedAt === 'number' ? server.updatedAt : 0,
	});

	const localEmpty = !state.config && (!state.checkins || state.checkins.length === 0);
	const serverEmpty = !serverState.config && (!serverState.checkins || serverState.checkins.length === 0);

	if (serverEmpty && !localEmpty) {
		// Server empty, local has data -> push immediately
		state.updatedAt = Date.now();
		localStorage.setItem(LS_KEY, JSON.stringify(state));
		await postServerPayload({
			version: 1,
			state: { config: state.config, checkins: state.checkins },
			updatedAt: state.updatedAt,
		});
		return;
	}

	if (!serverEmpty && localEmpty) {
		// Local empty; take server
		state = serverState;
		localStorage.setItem(LS_KEY, JSON.stringify(state));
		if (setMode) setMode(!!state.config);
		if (rerenderAll) rerenderAll();
		return;
	}

	if (!serverEmpty && !localEmpty) {
		// Both have data; choose newest updatedAt
		const serverNewer = (serverState.updatedAt || 0) >= (state.updatedAt || 0);
		if (serverNewer) {
			state = serverState;
			localStorage.setItem(LS_KEY, JSON.stringify(state));
			if (setMode) setMode(!!state.config);
			if (rerenderAll) rerenderAll();
		} else {
			// Local newer -> upload (debounced)
			saveState();
		}
	}
}

export function clearLocalOnly() {
	localStorage.removeItem(LS_KEY);
	state = { config: null, checkins: [], updatedAt: 0 };
}

export const auth = {
	IS_LOGGED_IN,
};
