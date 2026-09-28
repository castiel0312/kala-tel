import type { RiskLevel, RiskProfilePoint, RiskTrajectoryPoint } from "./wellRisk";

export interface RiskTvdSlice {
  tvdTop: number;
  tvdBottom: number;
  mdTop: number | null;
  mdBottom: number | null;
  maxRisk: number | null;
  meanRisk: number | null;
  level: RiskLevel | null;
}

const SLICE_COUNT = 24;
const LEVEL_THRESHOLDS = { moderate: 25, high: 50, critical: 75 };

function levelForRisk(risk: number): RiskLevel {
  if (risk >= LEVEL_THRESHOLDS.critical) return "critical";
  if (risk >= LEVEL_THRESHOLDS.high) return "high";
  if (risk >= LEVEL_THRESHOLDS.moderate) return "moderate";
  return "low";
}

function nearestProfile(profile: RiskProfilePoint[], md: number): RiskProfilePoint | null {
  let closest: RiskProfilePoint | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const item of profile) {
    if (!Number.isFinite(item.md) || !Number.isFinite(item.score)) continue;
    const candidateDistance = Math.abs(item.md - md);
    if (candidateDistance < distance) {
      closest = item;
      distance = candidateDistance;
    }
  }
  return closest;
}

export function buildRiskTvdSlices(
  trajectory: RiskTrajectoryPoint[],
  profile: RiskProfilePoint[],
  totalDepthTvd: number,
  sliceCount = SLICE_COUNT,
): RiskTvdSlice[] {
  const valid = trajectory.filter((point) =>
    typeof point.tvd === "number" && Number.isFinite(point.tvd) && Number.isFinite(point.md),
  );
  const maxTvd = Math.max(0, totalDepthTvd, ...valid.map((point) => point.tvd ?? 0));
  if (!valid.length || !Number.isFinite(maxTvd) || maxTvd <= 0 || sliceCount <= 0) return [];

  const width = maxTvd / sliceCount;
  return Array.from({ length: sliceCount }, (_, index) => {
    const tvdTop = index * width;
    const tvdBottom = index === sliceCount - 1 ? maxTvd : (index + 1) * width;
    const inSlice = valid.filter((point) => {
      const tvd = point.tvd;
      if (typeof tvd !== "number") return false;
      return index === sliceCount - 1
        ? tvd >= tvdTop && tvd <= tvdBottom
        : tvd >= tvdTop && tvd < tvdBottom;
    });
    const samples = inSlice.flatMap((point) => {
      const matched = nearestProfile(profile, point.md);
      return matched ? [{ md: point.md, score: matched.score, level: matched.level }] : [];
    });
    if (!samples.length) {
      return { tvdTop, tvdBottom, mdTop: null, mdBottom: null, maxRisk: null, meanRisk: null, level: null };
    }
    const riskValues = samples.map((sample) => sample.score);
    const maxRisk = Math.max(...riskValues);
    const meanRisk = riskValues.reduce((sum, value) => sum + value, 0) / riskValues.length;
    const mdValues = samples.map((sample) => sample.md);
    return {
      tvdTop,
      tvdBottom,
      mdTop: Math.min(...mdValues),
      mdBottom: Math.max(...mdValues),
      maxRisk,
      meanRisk,
      level: levelForRisk(maxRisk),
    };
  });
}
