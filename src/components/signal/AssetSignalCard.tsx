import Link from "next/link";
import { Badge, Card, EmptyState, ErrorState, Stat, ValueWithProvenance, type BadgeVariant } from "@/components/ui";
import { formatCompactUsd, formatMultiplier, formatPercent, formatPrice } from "@/lib/format";
import type { Stance } from "@/lib/core";
import type { AssetSummary } from "@/lib/insight/asset";

function stanceMeta(stance: Stance): { label: string; variant: BadgeVariant } {
  switch (stance) {
    case "accumulate-more":
      return { label: "accumulate more", variant: "accent" };
    case "ease-off":
      return { label: "ease off", variant: "warn" };
    default:
      return { label: "steady", variant: "neutral" };
  }
}

export function AssetSignalCard({ summary }: { summary: AssetSummary }) {
  const { asset, flow } = summary;

  const priceBlock = (
    <div className="text-right">
      {summary.price != null ? (
        <ValueWithProvenance
          className="justify-end font-mono text-body font-semibold text-foreground"
          value={formatPrice(summary.price, { adaptive: true })}
          source="SoDEX spot (mainnet)"
          asOf={summary.priceAsOf ?? undefined}
          freshness="live"
        />
      ) : (
        <span className="text-body text-muted">price unavailable</span>
      )}
      {summary.priceChangePct != null && (
        <div className={`text-micro ${summary.priceChangePct >= 0 ? "text-up" : "text-down"}`}>
          {formatPercent(summary.priceChangePct, { asPercentPoints: true, signed: true, timeframe: "24h" })}
        </div>
      )}
    </div>
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/assets/${asset.id}`} className="text-lead font-semibold text-foreground transition-colors hover:text-accent">
            {asset.name}
          </Link>
          <p className="text-micro uppercase tracking-wide text-faint">{asset.symbol} · spot</p>
        </div>
        {priceBlock}
      </div>

      {flow.state === "ok" && (
        <>
          <div className="flex items-end justify-between">
            <Stat label="Today's buy · contrarian" value={formatMultiplier(flow.signal.multiplier)} tone="accent" context="on your base amount" />
            <Badge variant={stanceMeta(flow.signal.stance).variant}>{stanceMeta(flow.signal.stance).label}</Badge>
          </div>
          <div className="text-body text-muted">
            <ValueWithProvenance
              value={`Latest flow ${formatCompactUsd(flow.signal.latestNetInflowUsd, { signed: true })}`}
              source="SoSoValue /etfs/summary-history"
              asOf={flow.asOf}
              freshness="recent"
            />{" "}
            · {flow.signal.conviction} conviction
          </div>
          <p className="text-micro text-faint">{flow.signal.reasons[1]}</p>
        </>
      )}

      {flow.state === "empty" && <EmptyState title={`No ETF-flow data for ${asset.symbol}`} hint="SoSoValue does not publish spot-ETF flows for this asset yet." />}
      {flow.state === "not_configured" && (
        <EmptyState title="Signal offline" hint="Set SOSOVALUE_API_KEY to compute the flow-weighted buy signal. Prices above are live from SoDEX." />
      )}
      {flow.state === "error" && <ErrorState message="Couldn't load ETF flows" detail={`SoSoValue request failed (${flow.error}). The price is still live above.`} />}

      <Link href={`/assets/${asset.id}`} className="mt-auto text-body font-semibold text-accent transition-colors hover:text-accent-strong">
        Set up a plan →
      </Link>
    </Card>
  );
}
