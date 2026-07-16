"use client";

// The proof, on your own buys: for each asset, what the flow-sized buys cost per unit
// versus what naive base-amount buys at the same moments would have cost. Quantities are
// the estimates recorded at submit time (testnet sandbox fills), and are labeled as such.
// Mark-to-market uses the live SoDEX mainnet price.
import { Card, EmptyState, Stat, ValueWithProvenance } from "@/components/ui";
import { summarizeBuys, unrealizedPnlRatio } from "@/lib/core";
import type { BuyRecord } from "@/lib/plans";
import { getAsset } from "@/lib/assets/catalog";
import { formatPercent, formatPrice, formatQty, formatUsd } from "@/lib/format";
import { isPriceOk } from "@/lib/api/types";
import { useSignalQuery } from "./useSignalQuery";

function AssetHoldings({ assetId, buys }: { assetId: string; buys: BuyRecord[] }) {
  const asset = getAsset(assetId);
  const signal = useSignalQuery(assetId, "contrarian");
  if (!asset) return null;

  const keel = summarizeBuys(buys.map((b) => ({ usd: b.buyUsd, qty: b.estQty })));
  const naive = summarizeBuys(buys.map((b) => ({ usd: b.baseUsd, qty: b.naiveQty })));
  const improvement =
    keel.avgCostUsd !== null && naive.avgCostUsd !== null && naive.avgCostUsd > 0
      ? (naive.avgCostUsd - keel.avgCostUsd) / naive.avgCostUsd
      : null;

  const price = signal.data && isPriceOk(signal.data.price) ? signal.data.price : null;
  const pnl = price !== null ? unrealizedPnlRatio(keel, price.lastPx) : null;
  const keelCheaper = improvement !== null && improvement > 0;

  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-body font-semibold text-foreground">
          {asset.name} · {buys.length} buy{buys.length === 1 ? "" : "s"}
        </p>
        {price !== null ? (
          <ValueWithProvenance
            className="font-mono text-body text-muted"
            value={formatPrice(price.lastPx, { adaptive: true })}
            source={price.source}
            asOf={price.asOf}
            freshness="live"
          />
        ) : (
          <span className="text-micro text-faint">{signal.isPending ? "loading price…" : "price unavailable"}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Accumulated"
          value={formatQty(keel.totalQty, { unit: asset.symbol, dp: 6 })}
          context={`invested ${formatUsd(keel.totalInvestedUsd)} (est. fills)`}
          size="lead"
        />
        <Stat
          label="Your avg cost"
          value={formatPrice(keel.avgCostUsd, { adaptive: true })}
          context={`naive DCA: ${formatPrice(naive.avgCostUsd, { adaptive: true })}`}
          size="lead"
          tone={keelCheaper ? "up" : "neutral"}
        />
        <Stat
          label="vs naive DCA"
          value={improvement === null ? "—" : formatPercent(improvement, { signed: true })}
          context={keelCheaper ? "cheaper cost basis" : improvement === null ? "no basis yet" : "naive is cheaper so far"}
          size="lead"
          tone={keelCheaper ? "up" : improvement !== null && improvement < 0 ? "down" : "neutral"}
        />
        <Stat
          label="Unrealized"
          value={pnl === null ? "—" : formatPercent(pnl, { signed: true })}
          context={price !== null ? `at live ${formatPrice(price.lastPx, { adaptive: true })}` : "needs live price"}
          size="lead"
          tone={pnl !== null && pnl > 0 ? "up" : pnl !== null && pnl < 0 ? "down" : "neutral"}
        />
      </div>
    </div>
  );
}

export function PortfolioCard({ buys }: { buys: BuyRecord[] }) {
  const accepted = buys.filter((b) => b.accepted);
  const byAsset = new Map<string, BuyRecord[]>();
  for (const b of accepted) {
    byAsset.set(b.assetId, [...(byAsset.get(b.assetId) ?? []), b]);
  }

  return (
    <Card
      title="Portfolio — the proof"
      subtitle="flow-sized cost basis vs what naive DCA would have paid at the same moments, from your recorded buys"
    >
      {accepted.length === 0 ? (
        <EmptyState
          title="No buys recorded yet"
          hint="Once a plan's first confirmed buy is accepted by the SoDEX testnet gateway, the cost-basis comparison appears here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[...byAsset.entries()].map(([assetId, assetBuys]) => (
            <AssetHoldings key={assetId} assetId={assetId} buys={assetBuys} />
          ))}
          <p className="text-micro text-faint">
            Testnet sandbox accumulation. Quantities are the estimates recorded when each order was submitted; naive
            counterfactual uses the same submit-time price with the plan&apos;s flat base amount.
          </p>
        </div>
      )}
    </Card>
  );
}
