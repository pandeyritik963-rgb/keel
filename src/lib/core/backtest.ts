// The proof: replay flow-weighted DCA against naive DCA over real historical flow+price data.
// Causal — each interval's multiplier uses only flows up to that day (no look-ahead). The
// headline metric is average cost basis (USD per unit): lower means you accumulated cheaper.
// This is a historical replay, not a promise; the result can be negative in trending regimes.
import { computeSignal } from "./signal";
import { intervalBuyUsd, buyQtyFor } from "./plan";
import type { PricedFlowPoint, SignalConfig, ThesisMode } from "./types";

export interface BacktestInput {
  points: PricedFlowPoint[]; // will be sorted ascending by date
  baseUsd: number;
  mode: ThesisMode;
  config?: Partial<SignalConfig>;
  minHistory?: number; // skip the first N days so the signal has history (default 3)
}

export interface Strategy {
  investedUsd: number;
  qty: number;
  avgCostUsd: number | null;
  buys: number;
}

export interface BacktestResult {
  keel: Strategy;
  naive: Strategy;
  /** (naiveAvgCost - keelAvgCost) / naiveAvgCost. Positive = Keel accumulated cheaper. */
  avgCostImprovementPct: number | null;
  intervals: number;
  fromDate: string | null;
  toDate: string | null;
}

function finalize(investedUsd: number, qty: number, buys: number): Strategy {
  return {
    investedUsd: Math.round(investedUsd * 100) / 100,
    qty,
    avgCostUsd: qty > 0 ? investedUsd / qty : null,
    buys,
  };
}

export function backtest(input: BacktestInput): BacktestResult {
  const pts = [...input.points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const minH = input.minHistory ?? 3;

  let kInv = 0;
  let kQty = 0;
  let kBuys = 0;
  let nInv = 0;
  let nQty = 0;
  let nBuys = 0;
  let fromDate: string | null = null;
  let toDate: string | null = null;

  for (let i = 0; i < pts.length; i++) {
    if (i < minH) continue; // both strategies skip the warm-up window equally, for fairness
    const p = pts[i];
    if (fromDate === null) fromDate = p.date;
    toDate = p.date;

    // naive: fixed base amount every interval
    nInv += input.baseUsd;
    nQty += buyQtyFor(input.baseUsd, p.price);
    nBuys++;

    // keel: multiplier from flows up to and including today
    const flowsSoFar = pts.slice(0, i + 1).map((x) => ({ date: x.date, netInflowUsd: x.netInflowUsd }));
    const sig = computeSignal(flowsSoFar, { mode: input.mode, config: input.config });
    const usd = intervalBuyUsd(input.baseUsd, sig.multiplier);
    kInv += usd;
    kQty += buyQtyFor(usd, p.price);
    kBuys++;
  }

  const keel = finalize(kInv, kQty, kBuys);
  const naive = finalize(nInv, nQty, nBuys);
  const avgCostImprovementPct =
    keel.avgCostUsd != null && naive.avgCostUsd != null && naive.avgCostUsd > 0
      ? (naive.avgCostUsd - keel.avgCostUsd) / naive.avgCostUsd
      : null;

  return { keel, naive, avgCostImprovementPct, intervals: kBuys, fromDate, toDate };
}
