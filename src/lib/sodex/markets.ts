// SoDEX spot market data — public reads, live from the data network (mainnet by default).
// The spot symbol name is the internal form, e.g. "vBTC_vUSDC".
import { getDataNetwork, spotUrl, type SodexNetwork } from "./config";
import { getJson, type SodexResult } from "./http";
import { klinesSchema, spotSymbolsSchema, spotTickersSchema, type Kline, type SpotSymbol, type SpotTicker } from "./schemas";

export function getSpotSymbols(network: SodexNetwork = getDataNetwork()): Promise<SodexResult<SpotSymbol[]>> {
  return getJson(spotUrl("/markets/symbols", {}, network), spotSymbolsSchema);
}

export async function getSpotSymbol(name: string, network: SodexNetwork = getDataNetwork()): Promise<SodexResult<SpotSymbol>> {
  const res = await getJson(spotUrl("/markets/symbols", { symbol: name }, network), spotSymbolsSchema);
  if (!res.ok) return res;
  const match = res.data.find((s) => s.name === name) ?? res.data[0];
  if (!match) return { ok: false, error: { kind: "upstream", message: `spot symbol ${name} not found` } };
  return { ok: true, data: match, asOf: res.asOf };
}

export async function getSpotTicker(name: string, network: SodexNetwork = getDataNetwork()): Promise<SodexResult<SpotTicker>> {
  const res = await getJson(spotUrl("/markets/tickers", { symbol: name }, network), spotTickersSchema);
  if (!res.ok) return res;
  const match = res.data.find((t) => t.symbol === name) ?? res.data[0];
  if (!match) return { ok: false, error: { kind: "upstream", message: `no ticker for ${name}` } };
  return { ok: true, data: match, asOf: res.asOf };
}

export function getSpotKlines(
  name: string,
  opts?: { interval?: string; limit?: number; network?: SodexNetwork },
): Promise<SodexResult<Kline[]>> {
  const network = opts?.network ?? getDataNetwork();
  const url = spotUrl(`/markets/${encodeURIComponent(name)}/klines`, { interval: opts?.interval ?? "1d", limit: opts?.limit ?? 90 }, network);
  return getJson(url, klinesSchema);
}
