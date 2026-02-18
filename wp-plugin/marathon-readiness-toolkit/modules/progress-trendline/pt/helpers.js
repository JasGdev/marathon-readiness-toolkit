// pt/helpers.js

export function debounce(fn, wait = 800) {
	let t = null;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), wait);
	};
}

export function toIntOrNull(v) {
	const n = parseInt(String(v), 10);
	return Number.isFinite(n) ? n : null;
}

export function parseDateToMs(yyyyMmDd) {
	if (!yyyyMmDd) return null;
	const t = Date.parse(`${yyyyMmDd}T00:00:00`);
	return Number.isFinite(t) ? t : null;
}

export function weeksBetweenMs(aMs, bMs) {
	const w = (bMs - aMs) / (1000 * 60 * 60 * 24 * 7);
	return Math.max(0, w);
}

export function parsePaceToSeconds(paceStr) {
	const s = String(paceStr).trim().replace('.', ':');
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

export function formatPace(secPerKm) {
	const sInt = Math.round(secPerKm);
	const m = Math.floor(sInt / 60);
	const s = String(sInt % 60).padStart(2, '0');
	return `${m}:${s}`;
}

export function readPaceFromInputs(minEl, secEl, { allowBlank = true } = {}) {
	const minRaw = String(minEl?.value ?? '').trim();
	const secRaw = String(secEl?.value ?? '').trim();

	const bothBlank = !minRaw && !secRaw;
	if (bothBlank) return allowBlank ? null : null;

	const min = toIntOrNull(minRaw);
	const sec = secRaw === '' ? 0 : toIntOrNull(secRaw);

	if (min === null || sec === null) return null;
	if (min < 0) return null;
	if (sec < 0 || sec >= 60) return null;

	return min * 60 + sec;
}

export function writePaceToInputs(minEl, secEl, paceSec) {
	if (!minEl || !secEl) return;

	if (!Number.isFinite(paceSec)) {
		minEl.value = '';
		secEl.value = '';
		return;
	}

	const sInt = Math.round(paceSec);
	const m = Math.floor(sInt / 60);
	const s = String(sInt % 60).padStart(2, '0');

	minEl.value = String(m);
	secEl.value = s;
}

export function calcPaceFromRun(distKm, hh, mm, ss) {
	if (!(distKm > 0)) return null;
	const total = hh * 3600 + mm * 60 + ss;
	if (!(total > 0)) return null;
	return Math.round(total / distKm);
}
