// Durable-cache + business layer over SoSoValue. Uses the Next Data Cache (cross-instance) so a
// cold serverless instance never re-burns the per-minute budget. The raw flow series is cached
// mode-independently; the signal is computed per request for the chosen thesis. Transient
// failures throw (nothing bad is cached and the next request retries); an unsupported symbol is
// cached as a stable "empty" outcome.
import { unstable_cache } from "next/cache";
import { computeSignal, type FlowPoint, type SignalResult, type ThesisMode } from "@/lib/core";
import { filterNewsByCurrency, getEtfSummaryHistory, getFeaturedNews, type NewsItem } from "@/lib/sosovalue";
import type { SsvError } from "@/lib/sosovalue";

const REVALIDATE_SEC = 600;

type SeriesOutcome =
  | { kind: "ok"; series: FlowPoint[]; latestAum: number | null; asOf: string }
  | { kind: "unsupported" };

function isUnsupported(error: SsvError): boolean {
  return error.status === 400 || /invalid|not support|param|no data|40003/i.test(error.message ?? "");
}

async function fetchEtfSeries(symbol: string): Promise<SeriesOutcome> {
  const res = await getEtfSummaryHistory(symbol, { limit: 90 });
  if (res.ok) {
    const sorted = [...res.data].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const series: FlowPoint[] = sorted.map((r) => ({ date: r.date, netInflowUsd: r.total_net_inflow }));
    const latestAum = sorted.length ? (sorted[sorted.length - 1].total_net_assets ?? null) : null;
    return { kind: "ok", series, latestAum, asOf: res.asOf.toISOString() };
  }
  if (res.error.kind === "upstream" && isUnsupported(res.error)) return { kind: "unsupported" };
  throw new Error(res.error.kind); // transient / not_configured -> do not cache
}

const cachedEtfSeries = (symbol: string): Promise<SeriesOutcome> =>
  unstable_cache(() => fetchEtfSeries(symbol), ["keel-etf-series-v1", symbol], { revalidate: REVALIDATE_SEC })();

export type FlowSignal =
  | { state: "ok"; signal: SignalResult; latestAum: number | null; asOf: string; series: FlowPoint[] }
  | { state: "empty" }
  | { state: "not_configured" }
  | { state: "error"; error: string };

export async function getFlowSignal(symbol: string, mode: ThesisMode = "contrarian"): Promise<FlowSignal> {
  try {
    const outcome = await cachedEtfSeries(symbol);
    if (outcome.kind === "unsupported") return { state: "empty" };
    const signal = computeSignal(outcome.series, { mode });
    return { state: "ok", signal, latestAum: outcome.latestAum, asOf: outcome.asOf, series: outcome.series };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return msg === "not_configured" ? { state: "not_configured" } : { state: "error", error: msg };
  }
}

/** Raw flow series (for aligning with prices in a backtest). Same cache as the signal. */
export async function getFlowSeries(symbol: string): Promise<SeriesOutcome> {
  return cachedEtfSeries(symbol);
}

const cachedFeaturedNews = unstable_cache(
  async () => {
    const res = await getFeaturedNews({ pageSize: 40 });
    if (res.ok) return { items: res.data, asOf: res.asOf.toISOString() };
    throw new Error(res.error.kind);
  },
  ["keel-featured-news-v1"],
  { revalidate: REVALIDATE_SEC },
);

export type FlowNews =
  | { state: "ok"; item: NewsItem; asOf: string }
  | { state: "none" }
  | { state: "not_configured" }
  | { state: "error" };

export async function getTopFlowNews(symbol: string): Promise<FlowNews> {
  try {
    const { items, asOf } = await cachedFeaturedNews();
    const matched = filterNewsByCurrency(items, symbol)
      .filter((n) => n.title && n.sourceLink)
      .sort((a, b) => b.releaseTime - a.releaseTime);
    return matched.length ? { state: "ok", item: matched[0], asOf } : { state: "none" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return msg === "not_configured" ? { state: "not_configured" } : { state: "error" };
  }
}
