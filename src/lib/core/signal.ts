// The signal engine: turn a series of ETF net-flow days into a buy-size multiplier.
// Pure and deterministic. Three factors, each in [-1, 1] in a "flow direction" frame
// (+1 = strong inflows, -1 = strong outflows), combined into a composite flow score.
// The thesis mode then maps that score to a multiplier:
//   contrarian -> buy MORE on outflows (negative score), LESS on inflows.
//   momentum   -> the mirror: buy MORE on inflows.
import {
  DEFAULT_SIGNAL_CONFIG,
  type Conviction,
  type FlowPoint,
  type SignalConfig,
  type SignalResult,
  type Stance,
  type ThesisMode,
} from "./types";

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const sign = (x: number): number => (x > 0 ? 1 : x < 0 ? -1 : 0);
const round2 = (x: number): number => Math.round(x * 100) / 100;
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function resolveConfig(partial?: Partial<SignalConfig>): SignalConfig {
  return {
    ...DEFAULT_SIGNAL_CONFIG,
    ...partial,
    weights: { ...DEFAULT_SIGNAL_CONFIG.weights, ...partial?.weights },
  };
}

/**
 * Map a composite flow score to a buy multiplier under the chosen thesis.
 * Contrarian frame: s <= 0 (outflows) buys more, up to `max`; s > 0 buys less, down to `min`.
 * Momentum negates the score first, so inflows drive the "buy more" side.
 */
export function multiplierFromScore(
  score: number,
  mode: ThesisMode,
  cfg: SignalConfig = DEFAULT_SIGNAL_CONFIG,
): number {
  const s = mode === "momentum" ? -score : score;
  const m = s <= 0 ? cfg.base + -s * (cfg.max - cfg.base) : cfg.base - s * (cfg.base - cfg.min);
  return clamp(round2(m), cfg.min, cfg.max);
}

function convictionOf(absScore: number): Conviction {
  if (absScore >= 0.6) return "high";
  if (absScore >= 0.35) return "moderate";
  if (absScore >= 0.12) return "low";
  return "flat";
}

function stanceOf(multiplier: number, base: number): Stance {
  if (multiplier > base + 0.1) return "accumulate-more";
  if (multiplier < base - 0.1) return "ease-off";
  return "steady";
}

function usdM(x: number): string {
  const sgn = x > 0 ? "+" : x < 0 ? "-" : "";
  return `${sgn}$${(Math.abs(x) / 1e6).toFixed(0)}M`;
}

function buildReasons(
  latest: FlowPoint,
  streakDays: number,
  trend: number,
  window: number,
): string[] {
  const streakLine =
    streakDays === 0
      ? "ETF flows flat day-over-day"
      : `${Math.abs(streakDays)}-day ${streakDays > 0 ? "inflow" : "outflow"} streak`;
  const trendLine =
    trend > 0.05
      ? `${window}-day net flow positive (accumulation)`
      : trend < -0.05
        ? `${window}-day net flow negative (distribution)`
        : `${window}-day net flow roughly balanced`;
  return [`Latest ETF net flow ${usdM(latest.netInflowUsd)} on ${latest.date}`, streakLine, trendLine];
}

export function computeSignal(
  flows: FlowPoint[],
  opts?: { mode?: ThesisMode; config?: Partial<SignalConfig> },
): SignalResult {
  const mode: ThesisMode = opts?.mode ?? "contrarian";
  const cfg = resolveConfig(opts?.config);
  const series = [...flows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const n = series.length;

  if (n === 0) {
    return {
      mode,
      insufficientData: true,
      flowScore: 0,
      factors: { magnitude: 0, streak: 0, trend: 0 },
      conviction: "flat",
      multiplier: cfg.base,
      stance: "steady",
      streakDays: 0,
      latestNetInflowUsd: null,
      asOfDate: null,
      reasons: ["No ETF flow data available"],
    };
  }

  const latest = series[n - 1];
  const w = Math.min(cfg.window, n);
  const windowPts = series.slice(n - w);

  // Not enough history to act on: fall back to base, flag it, but still surface latest datapoint.
  if (n < 3) {
    return {
      mode,
      insufficientData: true,
      flowScore: 0,
      factors: { magnitude: 0, streak: 0, trend: 0 },
      conviction: "flat",
      multiplier: cfg.base,
      stance: "steady",
      streakDays: 0,
      latestNetInflowUsd: latest.netInflowUsd,
      asOfDate: latest.date,
      reasons: [`Only ${n} day(s) of ETF flow history — using base amount`],
    };
  }

  // magnitude: latest flow vs the typical size of recent flows (signed).
  const baselinePts = series.slice(Math.max(0, n - 1 - w), n - 1);
  const baseAbs = baselinePts.length
    ? mean(baselinePts.map((p) => Math.abs(p.netInflowUsd)))
    : Math.abs(latest.netInflowUsd);
  const magnitude =
    baseAbs === 0 ? sign(latest.netInflowUsd) : clamp(latest.netInflowUsd / baseAbs / cfg.magScale, -1, 1);

  // streak: consecutive days sharing the latest day's sign.
  const s0 = sign(latest.netInflowUsd);
  let count = 0;
  if (s0 !== 0) {
    for (let i = n - 1; i >= 0; i--) {
      if (sign(series[i].netInflowUsd) === s0) count++;
      else break;
    }
  }
  const streakDays = s0 * count;
  const streak = clamp(streakDays / cfg.streakCap, -1, 1);

  // trend: net directional bias over the window (all inflows -> +1, all outflows -> -1).
  const sumNet = windowPts.reduce((a, p) => a + p.netInflowUsd, 0);
  const sumAbs = windowPts.reduce((a, p) => a + Math.abs(p.netInflowUsd), 0);
  const trend = sumAbs === 0 ? 0 : clamp(sumNet / sumAbs, -1, 1);

  const { magnitude: wm, streak: ws, trend: wt } = cfg.weights;
  const flowScore = clamp(wm * magnitude + ws * streak + wt * trend, -1, 1);
  const multiplier = multiplierFromScore(flowScore, mode, cfg);

  return {
    mode,
    insufficientData: false,
    flowScore: round2(flowScore),
    factors: { magnitude: round2(magnitude), streak: round2(streak), trend: round2(trend) },
    conviction: convictionOf(Math.abs(flowScore)),
    multiplier,
    stance: stanceOf(multiplier, cfg.base),
    streakDays,
    latestNetInflowUsd: latest.netInflowUsd,
    asOfDate: latest.date,
    reasons: buildReasons(latest, streakDays, trend, w),
  };
}
