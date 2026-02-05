// modules/shared/growthModel.js
export const BLOCK_WEEKS = 8;

export function getImprovementBandByLevel(level) {
  if (level === "advanced") return { low: 0.02, high: 0.02 };
  if (level === "intermediate") return { low: 0.03, high: 0.04 };
  return { low: 0.04, high: 0.06 };
}

// pace_after = current * (1 - rate)^(weeks / 8)
export function paceAfterWeeks({ currentSecPerKm, rate, weeks }) {
  if (!(rate > 0 && rate < 1)) return null;
  if (!(weeks > 0)) return Math.round(currentSecPerKm);

  const blocks = weeks / BLOCK_WEEKS;
  const factor = Math.pow(1 - rate, blocks);
  return Math.round(currentSecPerKm * factor);
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