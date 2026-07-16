// Assemble the backtest input: SoSoValue daily flows joined with SoDEX daily closes on
// UTC date. Only dates present in BOTH real series are replayed — no interpolation, no
// fill-forward. The join size is surfaced so the UI can say exactly what was replayed.
import { backtest, type BacktestResult, type PricedFlowPoint, type ThesisMode } from "@/lib/core";
import type { AssetDef } from "@/lib/assets/catalog";
import { getFlowSeries } from "@/lib/flows";
import { getSpotKlines } from "@/lib/sodex";

export const BACKTEST_BASE_USD = 100; // avg-cost results are base-invariant; shown "per $100 base"

export type AssetBacktest =
  | { state: "ok"; result: BacktestResult; matchedDays: number; flowDays: number; priceDays: number; priceSource: string }
  | { state: "insufficient"; matchedDays: number; flowDays: number; priceDays: number }
  | { state: "empty" }
  | { state: "not_configured" }
  | { state: "error"; error: string };

const MIN_MATCHED_DAYS = 10;

export async function loadAssetBacktest(asset: AssetDef, mode: ThesisMode): Promise<AssetBacktest> {
  let flows;
  try {
    flows = await getFlowSeries(asset.flowSymbol);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return msg === "not_configured" ? { state: "not_configured" } : { state: "error", error: msg };
  }
  if (flows.kind === "unsupported") return { state: "empty" };

  const klines = await getSpotKlines(asset.spotSymbol, { interval: "1d", limit: 300 });
  if (!klines.ok) return { state: "error", error: `SoDEX klines: ${klines.error.kind}` };

  const closeByDate = new Map<string, number>();
  for (const k of klines.data) {
    closeByDate.set(new Date(k.t).toISOString().slice(0, 10), k.c);
  }

  const points: PricedFlowPoint[] = [];
  for (const f of flows.series) {
    const price = closeByDate.get(f.date);
    if (price !== undefined && price > 0) points.push({ ...f, price });
  }

  const counts = { matchedDays: points.length, flowDays: flows.series.length, priceDays: klines.data.length };
  if (points.length < MIN_MATCHED_DAYS) return { state: "insufficient", ...counts };

  const result = backtest({ points, baseUsd: BACKTEST_BASE_USD, mode });
  return { state: "ok", result, ...counts, priceSource: "SoDEX spot daily close (mainnet)" };
}
