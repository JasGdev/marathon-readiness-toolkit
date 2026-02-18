// pt/chart.js
import {
	paceAfterWeeks,
	scenarioRates,
	getBlockDecayByLevel,
	getMaxTotalImprovementByLevel,
} from '../growthModel.js';
import { parseDateToMs, weeksBetweenMs, parsePaceToSeconds, formatPace } from './helpers.js';
import { getState, saveState } from './state.js';

function getMonthTicks(minMs, maxMs) {
	const ticks = [];
	const d = new Date(minMs);
	d.setDate(1);
	d.setHours(0, 0, 0, 0);

	const end = new Date(maxMs);
	while (d <= end) {
		ticks.push(new Date(d));
		d.setMonth(d.getMonth() + 1);
	}
	return ticks;
}

function niceStepSeconds(rangeSec) {
	if (rangeSec <= 30) return 5;
	if (rangeSec <= 60) return 10;
	if (rangeSec <= 120) return 15;
	if (rangeSec <= 240) return 30;
	if (rangeSec <= 480) return 60;
	return 120;
}

function addWeeksMs(ms, weeks) {
	return ms + weeks * 7 * 24 * 3600 * 1000;
}

function buildProjectionSeries({
	startMs,
	startPaceSec,
	raceMs,
	rate,
	decay,
	maxTotalImprovement,
	stepWeeks = 1,
}) {
	const totalWeeks = weeksBetweenMs(startMs, raceMs);
	if (!(totalWeeks > 0)) return [];

	const points = [];
	const steps = Math.max(1, Math.ceil(totalWeeks / stepWeeks));

	for (let i = 0; i <= steps; i++) {
		const w = Math.min(totalWeeks, i * stepWeeks);

		const pace = paceAfterWeeks({
			currentSecPerKm: startPaceSec,
			rate,
			weeks: w,
			decay,
			maxTotalImprovement,
		});

		if (!Number.isFinite(pace)) continue;

		const ms = addWeeksMs(startMs, w);
		points.push({ ms, pace });
	}

	const endPace = paceAfterWeeks({
		currentSecPerKm: startPaceSec,
		rate,
		weeks: totalWeeks,
		decay,
		maxTotalImprovement,
	});

	if (Number.isFinite(endPace) && points.length) {
		points[points.length - 1] = { ms: raceMs, pace: endPace };
	}

	return points;
}

function drawPolyline(ctx, points, xScale, yScale) {
	if (!points.length) return;
	ctx.beginPath();
	points.forEach((p, i) => {
		const x = xScale(p.ms);
		const y = yScale(p.pace);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	});
	ctx.stroke();
}

export function renderChart(dom) {
	const state = getState();
	const { chartEl } = dom;

	if (!chartEl) return;
	const ctx = chartEl.getContext('2d');

	const rect = chartEl.getBoundingClientRect();
	const cssW = Math.max(320, Math.floor(rect.width));
	const cssH = Math.max(280, Math.floor(rect.height || 320));

	// ✅ mobile detected early so layout + frame can use it
	const isMobile = cssW < 520;

	const dpr = window.devicePixelRatio || 1;
	chartEl.width = Math.floor(cssW * dpr);
	chartEl.height = Math.floor(cssH * dpr);
	chartEl.style.width = `${cssW}px`;
	chartEl.style.height = `${cssH}px`;

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);

	// ✅ mobile: remove inner frame/border so plot can go full width
	const frame = isMobile ? 0 : 10;

	if (!isMobile) {
		ctx.lineWidth = 1;
		ctx.strokeStyle = '#E5E7EB';
		ctx.strokeRect(frame, frame, cssW - frame * 2, cssH - frame * 2);
	}

	if (!state.config) {
		ctx.fillStyle = '#6B7280';
		ctx.font = '14px system-ui, -apple-system, sans-serif';
		ctx.fillText('请先设置比赛日期并点击“开始趋势线”。', frame + 8, frame + 24);
		return;
	}

	const raceMs = parseDateToMs(state.config.raceDate);
	if (!raceMs) {
		ctx.fillStyle = '#6B7280';
		ctx.font = '14px system-ui, -apple-system, sans-serif';
		ctx.fillText('比赛日期无效。', frame + 8, frame + 24);
		return;
	}

	const level = state.config.level || 'beginner';
	const maxImp = getMaxTotalImprovementByLevel(level);

	let goalSec = null;
	const rawGoal = state.config.goalPaceSec;

	if (Number.isFinite(rawGoal)) {
		goalSec = rawGoal;
	} else if (typeof rawGoal === 'string' && rawGoal.trim()) {
		goalSec = parsePaceToSeconds(rawGoal.trim());
	}

	if (goalSec !== null && !Number.isFinite(rawGoal)) {
		state.config.goalPaceSec = goalSec;
		saveState();
	}

	const pts = [...state.checkins]
		.map((c) => ({ ms: parseDateToMs(c.date), pace: c.paceSecPerKm }))
		.filter((p) => Number.isFinite(p.ms) && Number.isFinite(p.pace))
		.sort((a, b) => a.ms - b.ms);

	const nowMs = Date.now();
	const minXRaw = pts.length ? pts[0].ms : nowMs;
	const maxX = raceMs;
	const safeMinX = Math.min(minXRaw, raceMs - 7 * 24 * 3600 * 1000);

	const rates = scenarioRates(level);
	const decay = getBlockDecayByLevel(level);

	const yVals = [];
	if (goalSec !== null) yVals.push(goalSec);
	pts.forEach((p) => yVals.push(p.pace));

	if (pts.length) {
		const last = pts[pts.length - 1];
		const w = weeksBetweenMs(last.ms, raceMs);
		yVals.push(
			paceAfterWeeks({
				currentSecPerKm: last.pace,
				rate: rates.conservative,
				weeks: w,
				decay,
				maxTotalImprovement: maxImp,
			}),
			paceAfterWeeks({
				currentSecPerKm: last.pace,
				rate: rates.optimistic,
				weeks: w,
				decay,
				maxTotalImprovement: maxImp,
			}),
		);
	}

	let minY = Math.min(...yVals);
	let maxY = Math.max(...yVals);
	const yPad = Math.max(8, Math.round((maxY - minY) * 0.1));
	minY -= yPad;
	maxY += yPad;

	// ✅ tighter layout on mobile (more plot width)
	const sidePad = isMobile ? 0 : 10;
	const yLabelGutter = isMobile ? 22 : 34;
	const monthLabelZone = isMobile ? 52 : 28;

	// ✅ remove legend on mobile
	const legendZone = isMobile ? 0 : 34;

	const bottomPad = isMobile ? 6 : 10;

	const left = frame + sidePad + yLabelGutter;
	const right = cssW - frame - sidePad;
	const top = frame + (isMobile ? 8 : 12);
	const bottom = cssH - frame - (monthLabelZone + legendZone + bottomPad);

	const xScale = (ms) => left + ((ms - safeMinX) / (maxX - safeMinX)) * (right - left);
	const yScale = (sec) => bottom - ((sec - minY) / (maxY - minY)) * (bottom - top);

	const step = niceStepSeconds(maxY - minY);
	const tickStart = Math.ceil(minY / step) * step;
	const tickEnd = Math.floor(maxY / step) * step;

	ctx.font = isMobile ? '11px system-ui' : '12px system-ui';
	ctx.fillStyle = '#6B7280';
	ctx.strokeStyle = '#E5E7EB';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';

	for (let v = tickStart; v <= tickEnd + 0.0001; v += step) {
		const y = yScale(v);
		if (y < top - 0.5 || y > bottom + 0.5) continue;

		ctx.globalAlpha = 0.35;
		ctx.beginPath();
		ctx.moveTo(left, y);
		ctx.lineTo(right, y);
		ctx.stroke();
		ctx.globalAlpha = 1;

		// ✅ bring labels slightly closer on mobile
		ctx.fillText(formatPace(v), left - (isMobile ? 4 : 6), y);
	}

	const monthTicks = getMonthTicks(safeMinX, maxX);

	monthTicks.forEach((d) => {
		const ms = d.getTime();
		if (ms < safeMinX || ms > maxX) return;

		const x = xScale(ms);

		ctx.strokeStyle = '#E5E7EB';
		ctx.globalAlpha = 0.25;
		ctx.beginPath();
		ctx.moveTo(x, top);
		ctx.lineTo(x, bottom);
		ctx.stroke();
		ctx.globalAlpha = 1;

		const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		ctx.fillStyle = '#6B7280';

		if (isMobile) {
			const yCenter = bottom + monthLabelZone / 2;
			ctx.save();
			ctx.translate(x, yCenter);
			ctx.rotate(-Math.PI / 2);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(label, 0, 0);
			ctx.restore();
		} else {
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText(label, x, bottom + 20);
		}
	});

	{
		const xRace = xScale(raceMs);
		ctx.strokeStyle = '#9CA3AF';
		ctx.globalAlpha = 0.85;
		ctx.beginPath();
		ctx.moveTo(xRace, top);
		ctx.lineTo(xRace, bottom);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	if (goalSec !== null) {
		const yG = yScale(goalSec);

		ctx.strokeStyle = '#2563EB';
		ctx.globalAlpha = 0.7;
		ctx.beginPath();
		ctx.moveTo(left, yG);
		ctx.lineTo(right, yG);
		ctx.stroke();
		ctx.globalAlpha = 1;

		ctx.save();
		ctx.fillStyle = '#2563EB';
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		ctx.fillText(`目标：${formatPace(goalSec)}/km`, right - 4, Math.max(top + 12, yG - 14));
		ctx.restore();
	}

	const colorConservative = '#F59E0B';
	const colorOptimistic = '#10B981';
	const sampleLen = 24;

	// ✅ desktop legend only
	if (!isMobile) {
		ctx.font = '12px system-ui';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#374151';
		ctx.lineWidth = 3;

		const leftText = '保守预估（橙色）';
		const rightText = '乐观预估（绿色）';

		const legendY = bottom + monthLabelZone + legendZone / 2;

		ctx.save();
		ctx.font = '12px system-ui';
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		ctx.fillStyle = '#374151';
		ctx.lineWidth = 3;

		const gap = 20;
		const leftW = ctx.measureText(leftText).width;
		const rightW = ctx.measureText(rightText).width;
		const groupW = sampleLen + 8 + leftW + gap + sampleLen + 8 + rightW;

		let startX = (left + right) / 2 - groupW / 2;
		startX = Math.max(startX, frame + 8);

		ctx.strokeStyle = colorConservative;
		ctx.beginPath();
		ctx.moveTo(startX, legendY);
		ctx.lineTo(startX + sampleLen, legendY);
		ctx.stroke();
		ctx.fillText(leftText, startX + sampleLen + 8, legendY);

		startX += sampleLen + 8 + leftW + gap;

		ctx.strokeStyle = colorOptimistic;
		ctx.beginPath();
		ctx.moveTo(startX, legendY);
		ctx.lineTo(startX + sampleLen, legendY);
		ctx.stroke();
		ctx.fillText(rightText, startX + sampleLen + 8, legendY);

		ctx.restore();
	}

	ctx.lineWidth = 2;

	if (!pts.length) return;

	// history line
	ctx.strokeStyle = '#111827';
	ctx.globalAlpha = 0.35;
	ctx.beginPath();
	pts.forEach((p, i) => {
		const x = xScale(p.ms);
		const y = yScale(p.pace);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	});
	ctx.stroke();
	ctx.globalAlpha = 1;

	const last = pts[pts.length - 1];

	const conSeries = buildProjectionSeries({
		startMs: last.ms,
		startPaceSec: last.pace,
		raceMs,
		rate: rates.conservative,
		decay,
		maxTotalImprovement: maxImp,
		stepWeeks: 1,
	});

	const optSeries = buildProjectionSeries({
		startMs: last.ms,
		startPaceSec: last.pace,
		raceMs,
		rate: rates.optimistic,
		decay,
		maxTotalImprovement: maxImp,
		stepWeeks: 1,
	});

	if (conSeries.length) {
		ctx.strokeStyle = colorConservative;
		drawPolyline(ctx, conSeries, xScale, yScale);
	}

	if (optSeries.length) {
		ctx.strokeStyle = colorOptimistic;
		drawPolyline(ctx, optSeries, xScale, yScale);
	}

	// points
	const lastIdx = pts.length - 1;
	pts.forEach((p, i) => {
		const x = xScale(p.ms);
		const y = yScale(p.pace);

		if (i !== lastIdx) {
			ctx.fillStyle = '#111827';
			ctx.beginPath();
			ctx.arc(x, y, 3.0, 0, Math.PI * 2);
			ctx.fill();
			return;
		}

		ctx.fillStyle = '#111827';
		ctx.beginPath();
		ctx.arc(x, y, 5.0, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#2563EB';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(x, y, 7.5, 0, Math.PI * 2);
		ctx.stroke();
	});
}
