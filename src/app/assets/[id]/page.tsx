import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, EmptyState, ErrorState, Stat, ValueWithProvenance, type BadgeVariant } from "@/components/ui";
import { FactorBreakdown } from "@/components/signal/FactorBreakdown";
import { FlowChart } from "@/components/signal/FlowChart";
import { BacktestCard } from "@/components/signal/BacktestCard";
import { PlanForm } from "@/components/plans/PlanForm";
import { getAsset } from "@/lib/assets/catalog";
import { getFlowSignal, getTopFlowNews } from "@/lib/flows";
import { loadAssetBacktest } from "@/lib/insight/backtest";
import { getSpotTicker } from "@/lib/sodex";
import { formatCompactUsd, formatMultiplier, formatPercent, formatPrice } from "@/lib/format";
import type { Stance, ThesisMode } from "@/lib/core";

export const dynamic = "force-dynamic";

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

function ModeToggle({ assetId, mode }: { assetId: string; mode: ThesisMode }) {
  const base = "rounded-full px-3 py-1 text-body font-semibold transition-colors";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1" role="group" aria-label="Thesis mode">
      {(["contrarian", "momentum"] as const).map((m) => (
        <Link
          key={m}
          href={`/assets/${assetId}${m === "contrarian" ? "" : "?mode=momentum"}`}
          className={`${base} ${m === mode ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
          aria-current={m === mode ? "true" : undefined}
        >
          {m}
        </Link>
      ))}
    </div>
  );
}

export default async function AssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const asset = getAsset(id);
  if (!asset) notFound();
  const mode: ThesisMode = sp.mode === "momentum" ? "momentum" : "contrarian";

  const [flow, ticker, bt, news] = await Promise.all([
    getFlowSignal(asset.flowSymbol, mode),
    getSpotTicker(asset.spotSymbol),
    loadAssetBacktest(asset, mode),
    getTopFlowNews(asset.flowSymbol),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-body text-muted">
        <Link href="/" className="hover:text-foreground">
          Signal
        </Link>{" "}
        / <span className="text-foreground">{asset.name}</span>
      </nav>

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display font-extrabold tracking-tight text-foreground">{asset.name}</h1>
          <p className="mt-1 text-body text-muted">
            {asset.symbol} · SoDEX spot {asset.spotSymbol}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {ticker.ok ? (
            <div className="text-right">
              <ValueWithProvenance
                className="justify-end font-mono text-stat font-semibold text-foreground"
                value={formatPrice(ticker.data.lastPx, { adaptive: true })}
                source="SoDEX spot (mainnet)"
                asOf={ticker.asOf.toISOString()}
                freshness="live"
              />
              {ticker.data.changePct != null && (
                <p className={`text-body ${ticker.data.changePct >= 0 ? "text-up" : "text-down"}`}>
                  {formatPercent(ticker.data.changePct, { asPercentPoints: true, signed: true, timeframe: "24h" })}
                </p>
              )}
            </div>
          ) : (
            <ErrorState message="Price unavailable" detail={`SoDEX ticker failed (${ticker.error.kind}). Reload to retry.`} />
          )}
          <ModeToggle assetId={asset.id} mode={mode} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Today's signal" subtitle={`${mode} thesis on US spot-ETF flows`}>
          {flow.state === "ok" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <Stat
                  label="Buy multiplier"
                  value={formatMultiplier(flow.signal.multiplier)}
                  context="applied to your plan's base amount"
                  tone="accent"
                  size="display"
                />
                <Badge variant={stanceMeta(flow.signal.stance).variant}>{stanceMeta(flow.signal.stance).label}</Badge>
              </div>
              {flow.signal.insufficientData && (
                <p className="text-body text-warn">Too little flow history to size the buy — holding the 1.00x base.</p>
              )}
              <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-muted">
                {flow.signal.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="text-micro text-faint">
                <ValueWithProvenance
                  value={`Latest net flow ${formatCompactUsd(flow.signal.latestNetInflowUsd, { signed: true })}${flow.latestAum != null ? ` · AUM ${formatCompactUsd(flow.latestAum)}` : ""}`}
                  source="SoSoValue /etfs/summary-history"
                  asOf={flow.asOf}
                  freshness="recent"
                />
              </p>
            </div>
          )}
          {flow.state === "empty" && (
            <EmptyState title={`No ETF-flow data for ${asset.symbol}`} hint="SoSoValue does not publish spot-ETF flows for this asset yet." />
          )}
          {flow.state === "not_configured" && (
            <EmptyState title="Signal offline" hint="Set SOSOVALUE_API_KEY in .env.local to compute the flow-weighted signal. The price above is live from SoDEX." />
          )}
          {flow.state === "error" && (
            <ErrorState message="Couldn't load ETF flows" detail={`SoSoValue request failed (${flow.error}). Reload to retry.`} />
          )}
        </Card>

        <Card title="Why this multiplier" subtitle="factor scores in a flow-direction frame">
          {flow.state === "ok" ? (
            <FactorBreakdown signal={flow.signal} />
          ) : (
            <EmptyState title="No factors to show" hint="Factors are computed from the live flow series once the signal is online." />
          )}
        </Card>
      </div>

      <Card title="ETF flow history" subtitle="what the signal actually reads">
        {flow.state === "ok" && flow.series.length >= 2 ? (
          <FlowChart series={flow.series} />
        ) : flow.state === "ok" ? (
          <EmptyState title="Not enough history to chart" hint={`Only ${flow.series.length} day(s) of flow data so far.`} />
        ) : (
          <EmptyState title="Flow history unavailable" hint="The chart renders from the same live series as the signal above." />
        )}
      </Card>

      <BacktestCard asset={asset} bt={bt} mode={mode} />

      <Card title="Latest matched news" subtitle={`SoSoValue featured news mentioning ${asset.symbol}`}>
        {news.state === "ok" && (
          <>
            <a href={news.item.sourceLink ?? "#"} target="_blank" rel="noreferrer" className="text-body font-semibold text-accent hover:text-accent-strong">
              {news.item.title}
            </a>
            <p className="mt-1 text-micro text-faint">
              {new Date(news.item.releaseTime).toISOString().slice(0, 16).replace("T", " ")} UTC · source: SoSoValue /news/featured
            </p>
          </>
        )}
        {news.state === "none" && <EmptyState title={`No recent featured news matched ${asset.symbol}`} hint="SoSoValue's featured feed had no item tagged with this asset." />}
        {news.state === "not_configured" && <EmptyState title="News offline" hint="Set SOSOVALUE_API_KEY to pull matched featured news." />}
        {news.state === "error" && <ErrorState message="Couldn't load news" detail="SoSoValue /news/featured request failed. Reload to retry." />}
      </Card>

      <Card title="Start a plan" subtitle={`accumulate ${asset.symbol} on a schedule, sized by this signal`}>
        <PlanForm assetId={asset.id} assetSymbol={asset.symbol} defaultMode={mode} />
      </Card>
    </div>
  );
}
