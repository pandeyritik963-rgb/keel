"use client";

// "What changed since last visit": the home page passes today's live per-asset signal;
// this compares it against the snapshot saved on the previous visit (localStorage) and
// then replaces the snapshot. Diffs only — no data is fetched here, and the strip stays
// silent until there is a previous visit to compare against.
import { useEffect, useState } from "react";
import { z } from "zod";
import { formatMultiplier, formatPercent } from "@/lib/format";

const KEY = "keel.lastSeen.v1";

export interface AssetSnapshot {
  assetId: string;
  symbol: string;
  multiplier: number | null;
  stance: string | null;
  price: number | null;
}

const storedSchema = z.object({
  v: z.literal(1),
  ts: z.number(),
  assets: z.array(
    z.object({
      assetId: z.string(),
      symbol: z.string(),
      multiplier: z.number().nullable(),
      stance: z.string().nullable(),
      price: z.number().nullable(),
    }),
  ),
});

interface Change {
  key: string;
  text: string;
}

function diff(prev: AssetSnapshot[], now: AssetSnapshot[]): Change[] {
  const changes: Change[] = [];
  const prevById = new Map(prev.map((a) => [a.assetId, a]));
  for (const cur of now) {
    const old = prevById.get(cur.assetId);
    if (!old) continue;
    if (old.multiplier !== null && cur.multiplier !== null && old.multiplier !== cur.multiplier) {
      changes.push({
        key: `${cur.assetId}-mult`,
        text: `${cur.symbol} buy multiplier ${formatMultiplier(old.multiplier)} → ${formatMultiplier(cur.multiplier)}${
          cur.stance && cur.stance !== old.stance ? ` (now ${cur.stance.replace("-", " ")})` : ""
        }`,
      });
    }
    if (old.price !== null && cur.price !== null && old.price > 0) {
      const move = cur.price / old.price - 1;
      if (Math.abs(move) >= 0.005) {
        changes.push({
          key: `${cur.assetId}-px`,
          text: `${cur.symbol} price ${formatPercent(move, { signed: true })} since your last visit`,
        });
      }
    }
  }
  return changes;
}

export function WhatChanged({ current }: { current: AssetSnapshot[] }) {
  const [state, setState] = useState<{ kind: "hidden" } | { kind: "first" } | { kind: "diff"; since: number; changes: Change[] }>(
    { kind: "hidden" },
  );

  useEffect(() => {
    let prev: { ts: number; assets: AssetSnapshot[] } | null = null;
    const raw = window.localStorage.getItem(KEY);
    if (raw !== null) {
      try {
        const parsed = storedSchema.safeParse(JSON.parse(raw));
        if (parsed.success) prev = { ts: parsed.data.ts, assets: parsed.data.assets };
      } catch {
        prev = null; // unreadable snapshot: treat as first visit, it gets rewritten below
      }
    }

    // Save today's view as the new baseline only when it carries live signal data,
    // so an offline render never erases a real snapshot.
    const hasSignal = current.some((a) => a.multiplier !== null);
    if (hasSignal) {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, ts: Date.now(), assets: current }));
    }

    if (prev === null) {
      setState(hasSignal ? { kind: "first" } : { kind: "hidden" });
      return;
    }
    const changes = diff(prev.assets, current);
    setState({ kind: "diff", since: prev.ts, changes });
  }, [current]);

  if (state.kind === "hidden") return null;

  if (state.kind === "first") {
    return (
      <p className="rounded-md border border-border bg-ink-50 px-4 py-2.5 text-body text-muted">
        First visit — today&apos;s signal is saved as your baseline. Next time, what changed shows up here.
      </p>
    );
  }

  const sinceLabel = new Date(state.since).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3">
      <p className="text-micro font-semibold uppercase tracking-wide text-accent">Since your last visit ({sinceLabel})</p>
      {state.changes.length === 0 ? (
        <p className="mt-1 text-body text-muted">No change in signal or price worth flagging.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5 text-body text-foreground">
          {state.changes.map((c) => (
            <li key={c.key}>{c.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
