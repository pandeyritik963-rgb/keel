// Domain types for the deterministic core. Framework-free and network-free.

/** One day of ETF net flow for an asset. netInflowUsd < 0 means net outflow. */
export interface FlowPoint {
  date: string; // ISO date, e.g. "2026-07-14"
  netInflowUsd: number;
}

/** A flow point aligned with that day's asset price (for backtests). */
export interface PricedFlowPoint extends FlowPoint {
  price: number;
}

/** Contrarian buys more on outflows/fear; momentum buys more on inflows. */
export type ThesisMode = "contrarian" | "momentum";

export interface SignalConfig {
  base: number; // baseline multiplier (1.0)
  min: number; // floor multiplier
  max: number; // ceiling multiplier
  window: number; // lookback days for trend/magnitude baseline
  streakCap: number; // streak length that saturates the streak factor
  magScale: number; // how many "normal" flows saturate the magnitude factor
  weights: { magnitude: number; streak: number; trend: number };
}

export const DEFAULT_SIGNAL_CONFIG: SignalConfig = {
  base: 1,
  min: 0.5,
  max: 2,
  window: 7,
  streakCap: 5,
  magScale: 3,
  weights: { magnitude: 0.35, streak: 0.3, trend: 0.35 },
};

export type Conviction = "flat" | "low" | "moderate" | "high";
export type Stance = "accumulate-more" | "steady" | "ease-off";

export interface SignalResult {
  mode: ThesisMode;
  /** true when there is too little flow history to act on; multiplier falls back to base. */
  insufficientData: boolean;
  /** composite flow score in [-1, 1]; positive = institutions accumulating (inflows). */
  flowScore: number;
  factors: { magnitude: number; streak: number; trend: number };
  conviction: Conviction;
  /** buy-size multiplier in [min, max], applied to the plan's base amount. */
  multiplier: number;
  stance: Stance;
  /** signed consecutive-day streak: +3 = three inflow days, -2 = two outflow days. */
  streakDays: number;
  latestNetInflowUsd: number | null;
  asOfDate: string | null;
  /** human-readable basis lines, each traceable to a real datapoint. */
  reasons: string[];
}
