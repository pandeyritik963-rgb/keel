import Link from "next/link";
import { ASSETS } from "@/lib/assets/catalog";
import { loadAssetSummary } from "@/lib/insight/asset";
import { AssetSignalCard } from "@/components/signal/AssetSignalCard";
import { WhatChanged, type AssetSnapshot } from "@/components/signal/WhatChanged";

// Live signal reads on every request; nothing here is statically cached.
export const dynamic = "force-dynamic";

const STATS = [
  { value: String(ASSETS.length), label: "assets, sized by institutional flow" },
  { value: "Mainnet", label: "real SoDEX prices + SoSoValue flows" },
  { value: "No wallet", label: "the signal is free to read" },
  { value: "Zero", label: "mock numbers — every figure is live or tested" },
];

export default async function Home() {
  const summaries = await Promise.all(ASSETS.map((asset) => loadAssetSummary(asset)));
  const snapshot: AssetSnapshot[] = summaries.map((s) => ({
    assetId: s.asset.id,
    symbol: s.asset.symbol,
    multiplier: s.flow.state === "ok" ? s.flow.signal.multiplier : null,
    stance: s.flow.state === "ok" ? s.flow.signal.stance : null,
    price: s.price,
  }));

  return (
    <div className="flex flex-col gap-14">
      <WhatChanged current={snapshot} />
      <section className="pt-4">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-micro font-semibold uppercase tracking-wide text-accent">
          Flow-driven DCA
        </span>
        <h1 className="mt-4 max-w-3xl text-display font-extrabold tracking-tight text-foreground">
          Stack through the storm.
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-muted">
          Keel dollar-cost-averages into BTC and ETH, but sizes each buy from live SoSoValue
          institutional ETF flows — accumulating more when the market fears, less when it is greedy.
          You sign every buy. Keel never holds your keys.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="#signal"
            className="inline-flex h-9 items-center rounded-full bg-accent px-5 text-body font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            See today&apos;s signal
          </Link>
          <Link
            href={`/assets/${ASSETS[0].id}`}
            className="inline-flex h-9 items-center rounded-full border border-border-strong bg-surface px-5 text-body font-semibold text-foreground transition-colors hover:bg-ink-100"
          >
            How a plan works
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-surface p-4">
            <p className="text-stat font-mono font-semibold text-foreground">{s.value}</p>
            <p className="mt-1 text-micro text-muted">{s.label}</p>
          </div>
        ))}
      </section>

      <section id="signal" className="scroll-mt-20">
        <h2 className="text-lead font-semibold text-foreground">Today&apos;s buy signal</h2>
        <p className="mt-1 max-w-2xl text-body text-muted">
          Each asset&apos;s multiplier is computed from its recent SoSoValue ETF flows under the
          contrarian thesis. Open an asset to see the factor breakdown, the backtest against naive
          DCA, and to start a plan.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {summaries.map((summary) => (
            <AssetSignalCard key={summary.asset.id} summary={summary} />
          ))}
        </div>
      </section>
    </div>
  );
}
