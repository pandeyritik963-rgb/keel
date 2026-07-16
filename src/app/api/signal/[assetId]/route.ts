// Live sizing data for one asset: the SoSoValue flow signal for the requested thesis mode
// plus the SoDEX ticker and symbol metadata (fees, precision, minimums) needed to size and
// price a buy. Client surfaces (plans board, buy confirmation) read this; they never call
// upstreams directly, so the SoSoValue key stays server-side.
import { getAsset } from "@/lib/assets/catalog";
import { getFlowSignal } from "@/lib/flows";
import { CHAIN_IDS, getExecNetwork, getSpotSymbol, getSpotTicker } from "@/lib/sodex";
import type { ThesisMode } from "@/lib/core";
import type { SignalApiResponse } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await ctx.params;
  const asset = getAsset(assetId);
  if (!asset) {
    return Response.json({ error: `unknown asset "${assetId}"` }, { status: 404 });
  }
  const modeParam = new URL(req.url).searchParams.get("mode");
  const mode: ThesisMode = modeParam === "momentum" ? "momentum" : "contrarian";

  const execNetwork = getExecNetwork();
  const [flow, ticker, symbol] = await Promise.all([
    getFlowSignal(asset.flowSymbol, mode),
    getSpotTicker(asset.spotSymbol),
    // Fees/precision/minimums come from the execution network — that is where the order goes.
    getSpotSymbol(asset.spotSymbol, execNetwork),
  ]);

  const payload = {
    asset: { id: asset.id, symbol: asset.symbol, name: asset.name, spotSymbol: asset.spotSymbol },
    flow:
      flow.state === "ok"
        ? {
            state: "ok",
            multiplier: flow.signal.multiplier,
            stance: flow.signal.stance,
            conviction: flow.signal.conviction,
            flowScore: flow.signal.flowScore,
            insufficientData: flow.signal.insufficientData,
            reasons: flow.signal.reasons,
            latestNetInflowUsd: flow.signal.latestNetInflowUsd,
            asOf: flow.asOf,
            asOfDate: flow.signal.asOfDate,
          }
        : { state: flow.state, error: flow.state === "error" ? flow.error : undefined },
    price: ticker.ok
      ? { lastPx: ticker.data.lastPx, askPx: ticker.data.askPx ?? null, changePct: ticker.data.changePct ?? null, asOf: ticker.asOf.toISOString(), source: "SoDEX spot (mainnet)" }
      : { error: ticker.error.kind },
    symbol: symbol.ok
      ? {
          id: symbol.data.id,
          takerFee: symbol.data.takerFee ?? null,
          pricePrecision: symbol.data.pricePrecision ?? null,
          quantityPrecision: symbol.data.quantityPrecision ?? null,
          minNotional: symbol.data.minNotional ?? null,
        }
      : { error: symbol.error.kind },
    execution: { network: execNetwork, chainId: CHAIN_IDS[execNetwork] },
  } satisfies SignalApiResponse;
  return Response.json(payload);
}
