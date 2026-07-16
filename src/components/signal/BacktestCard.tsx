// The proof surface: flow-weighted DCA replayed against naive DCA over the joined
// real flow+price history. Headline is average cost per unit — lower = accumulated
// cheaper. Always framed as a historical replay, never as a promise.
import { Card, EmptyState, ErrorState, Stat, ValueWithProvenance } from "@/components/ui";
import { formatPercent, formatPrice, formatUsd } from "@/lib/format";
import { BACKTEST_BASE_USD, type AssetBacktest } from "@/lib/insight/backtest";
import type { AssetDef } from "@/lib/assets/catalog";

export function BacktestCard({ asset, bt, mode }: { asset: AssetDef; bt: AssetBacktest; mode: string }) {
  const title = "Replay vs naive DCA";

  if (bt.state === "not_configured") {
    return (
      <Card title={title}>
        <EmptyState title="Backtest offline" hint="Set SOSOVALUE_API_KEY to replay the flow-weighted strategy over real history." />
      </Card>
    );
  }
  if (bt.state === "empty") {
    return (
      <Card title={title}>
        <EmptyState title={`No ETF-flow history for ${asset.symbol}`} hint="SoSoValue does not publish spot-ETF flows for this asset, so there is nothing to replay." />
      </Card>
    );
  }
  if (bt.state === "error") {
    return (
      <Card title={title}>
        <ErrorState message="Couldn't assemble the replay" detail={`${bt.error}. Reload to retry; both series must be live.`} />
      </Card>
    );
  }
  if (bt.state === "insufficient") {
    return (
      <Card title={title}>
        <EmptyState
          title="Not enough overlapping history yet"
          hint={`Only ${bt.matchedDays} days matched between ${bt.flowDays} flow days (SoSoValue) and ${bt.priceDays} price days (SoDEX); at least 10 are needed for an honest replay.`}
        />
      </Card>
    );
  }

  const { result } = bt;
  const improvement = result.avgCostImprovementPct;
  const keelCheaper = improvement !== null && improvement > 0;

  return (
    <Card
      title={title}
      subtitle={`${result.intervals} daily buys of a $${BACKTEST_BASE_USD} base, ${result.fromDate} to ${result.toDate}, ${mode} thesis. Signal uses only flows known on each day.`}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat
          label="Keel avg cost"
          value={formatPrice(result.keel.avgCostUsd, { adaptive: true })}
          context={`per ${asset.symbol}, invested ${formatUsd(result.keel.investedUsd)}`}
          tone={keelCheaper ? "up" : "neutral"}
        />
        <Stat
          label="Naive DCA avg cost"
          value={formatPrice(result.naive.avgCostUsd, { adaptive: true })}
          context={`per ${asset.symbol}, invested ${formatUsd(result.naive.investedUsd)}`}
        />
        <Stat
          label="Cost basis difference"
          value={improvement === null ? "—" : formatPercent(improvement, { signed: true })}
          context={keelCheaper ? "Keel accumulated cheaper" : improvement === null ? "no basis yet" : "naive was cheaper this window"}
          tone={keelCheaper ? "up" : improvement !== null && improvement < 0 ? "down" : "neutral"}
        />
      </div>
      <p className="mt-4 text-micro text-faint">
        <ValueWithProvenance
          value={`Replay of ${bt.matchedDays} days where both series exist.`}
          source={`SoSoValue /etfs/summary-history + ${bt.priceSource}`}
          freshness="recent"
        />{" "}
        Historical replay, not a prediction; a trending market can favor naive DCA.
      </p>
    </Card>
  );
}
