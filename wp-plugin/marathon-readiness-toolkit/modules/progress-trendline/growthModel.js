// modules/4-progress-trendline/growthModel.js

export const BLOCK_WEEKS = 8;

export function getImprovementBandByLevel(level) {
  if (level === "advanced") return { low: 0.02, high: 0.02 };
  if (level === "intermediate") return { low: 0.03, high: 0.04 };
  return { low: 0.04, high: 0.06 }; // beginner
}

export function getBlockDecayByLevel(level) {
  if (level === "advanced") return 0.97;
  if (level === "intermediate") return 0.95;
  return 0.94; // beginner
}

// ✅ add this back (you had it earlier)
export function getMaxTotalImprovementByLevel(level) {
  if (level === "advanced") return 0.06;      // ~6% max total
  if (level === "intermediate") return 0.10;  // ~10%
  return 0.14;                                // ~14% beginner
}

/**
 * Diminishing-returns + smooth cap
 * - rawImprovement: decayed block sum
 * - cappedImprovement: asymptotically approaches maxTotalImprovement
 *   so it never flatlines and never collapses both lines to the same clamp
 */
export function paceAfterWeeks({
  currentSecPerKm,
  rate,
  weeks,
  decay = 0.95,
  maxTotalImprovement = 0.14, // ✅ new
}) {
  if (!(currentSecPerKm > 0)) return null;
  if (!(rate > 0 && rate < 1)) return null;
  if (!(weeks > 0)) return Math.round(currentSecPerKm);

  const blocks = weeks / BLOCK_WEEKS;
  const fullBlocks = Math.floor(blocks);
  const frac = blocks - fullBlocks;

  // raw decayed sum: Σ rate * decay^i
  let raw = 0;

  for (let i = 0; i < fullBlocks; i++) {
    raw += rate * Math.pow(decay, i);
  }

  if (frac > 0) {
    raw += frac * rate * Math.pow(decay, fullBlocks);
  }

  // ✅ smooth cap (never hard-plateaus)
  // Maps raw -> [0, maxTotalImprovement)
  const maxImp = Math.max(0, Math.min(0.5, maxTotalImprovement)); // sanity
  const capped = maxImp <= 0 ? 0 : maxImp * (1 - Math.exp(-raw / maxImp));

  const factor = 1 - capped;

  return currentSecPerKm * factor;
}

export function scenarioRates(level) {
  const band = getImprovementBandByLevel(level);
  return {
    conservative: band.low,
    typical: (band.low + band.high) / 2,
    optimistic: band.high,
    pctLow: Math.round(band.low * 100),
    pctHigh: Math.round(band.high * 100),
  };
}
