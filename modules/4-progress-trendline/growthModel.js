// modules/4-progress-trendline/growthModel.js

/**
 * Growth model (Module 4)
 * -----------------------
 * We model improvement in 8-week training blocks, but with diminishing returns:
 *
 * - Each runner level has an improvement "band" per 8 weeks (low/high).
 * - Over multiple blocks, the improvement rate decays slightly each block
 *   (early gains are bigger; later gains are smaller).
 * - This avoids hard "caps" that can look artificial on long timelines,
 *   while still keeping projections conservative and realistic.
 *
 * IMPORTANT:
 * - This is still NON-compounding in the "pace" sense (we don't multiply pace each week),
 *   but the total improvement is accumulated as a *decaying* sum of block gains.
 * - A safety floorFactor prevents impossible outcomes (e.g., 30%+ pace drops).
 */

export const BLOCK_WEEKS = 8;

export function getImprovementBandByLevel(level) {
  // per 8 weeks (as you listed)
  if (level === "advanced") return { low: 0.02, high: 0.02 };
  if (level === "intermediate") return { low: 0.03, high: 0.04 };
  return { low: 0.04, high: 0.06 }; // beginner
}

/**
 * How fast gains "taper" from one 8-week block to the next.
 * Example: decay=0.95 means block 2 gets 95% of block 1's improvement, etc.
 */
export function getBlockDecayByLevel(level) {
  if (level === "advanced") return 0.97;
  if (level === "intermediate") return 0.95;
  return 0.94; // beginner
}

/**
 * Diminishing-returns model (decaying blocks)
 * ------------------------------------------
 * blocks = weeks / 8
 * totalImprovement ≈ rate * (1 + decay + decay^2 + ... ) across blocks
 * pace_after = current * (1 - totalImprovement)
 *
 * Supports fractional blocks:
 * - Full blocks add full decayed gains
 * - Remaining fraction adds a proportional part of the next decayed block
 */
export function paceAfterWeeks({
  currentSecPerKm,
  rate, // per 8 weeks, e.g. 0.04
  weeks,
  decay = 0.95, // per-block taper
  floorFactor = 0.70, // safety: never allow factor to drop below this
}) {
  if (!(currentSecPerKm > 0)) return null;
  if (!(rate > 0 && rate < 1)) return null;
  if (!(weeks > 0)) return Math.round(currentSecPerKm);

  const blocks = weeks / BLOCK_WEEKS;
  const fullBlocks = Math.floor(blocks);
  const frac = blocks - fullBlocks;

  // Sum decayed gains per block: rate * decay^i
  let totalImprovement = 0;

  for (let i = 0; i < fullBlocks; i++) {
    totalImprovement += rate * Math.pow(decay, i);
  }

  // Partial next block (if any)
  if (frac > 0) {
    totalImprovement += frac * rate * Math.pow(decay, fullBlocks);
  }

  const factor = 1 - totalImprovement;

  // Safety: never allow negative / too tiny factor
  const safeFactor = Math.max(factor, floorFactor);

  return currentSecPerKm * safeFactor;
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
