// Composition layer for a single asset: the SoSoValue-derived buy signal + the live SoDEX spot
// price, fetched together. Used by the board and the asset detail page.
import type { AssetDef } from "@/lib/assets/catalog";
import type { ThesisMode } from "@/lib/core";
import { getFlowSignal, type FlowSignal } from "@/lib/flows";
import { getSpotTicker } from "@/lib/sodex";

export interface AssetSummary {
  asset: AssetDef;
  flow: FlowSignal;
  price: number | null;
  priceChangePct: number | null; // already in percent points (e.g. 3.41)
  priceAsOf: string | null;
}

export async function loadAssetSummary(asset: AssetDef, mode: ThesisMode = "contrarian"): Promise<AssetSummary> {
  const [flow, ticker] = await Promise.all([getFlowSignal(asset.flowSymbol, mode), getSpotTicker(asset.spotSymbol)]);
  return {
    asset,
    flow,
    price: ticker.ok ? ticker.data.lastPx : null,
    priceChangePct: ticker.ok ? (ticker.data.changePct ?? null) : null,
    priceAsOf: ticker.ok ? ticker.asOf.toISOString() : null,
  };
}
