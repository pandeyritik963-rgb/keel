"use client";

// Create a DCA plan for one asset. A plan is configuration only — no wallet needed, no
// order placed. Each interval the signal sizes the actual buy between 0.5x and 2x of the
// base amount, and every buy still passes an explicit confirmation before signing.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { CADENCES, type Cadence, type ThesisMode } from "@/lib/core";
import { addPlan, newId } from "@/lib/plans";
import { formatUsd } from "@/lib/format";

const MIN_BASE = 1;
const MAX_BASE = 100_000;

export function PlanForm({ assetId, assetSymbol, defaultMode }: { assetId: string; assetSymbol: string; defaultMode: ThesisMode }) {
  const router = useRouter();
  const [baseUsd, setBaseUsd] = useState("100");
  const [cadence, setCadence] = useState<Cadence>("weekly");
  const [mode, setMode] = useState<ThesisMode>(defaultMode);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function submit() {
    const amount = Number(baseUsd);
    if (!Number.isFinite(amount) || amount < MIN_BASE || amount > MAX_BASE) {
      setFieldError(`Base amount must be between ${formatUsd(MIN_BASE, { dp: 0 })} and ${formatUsd(MAX_BASE, { dp: 0 })}.`);
      return;
    }
    addPlan({
      id: newId(),
      assetId,
      baseUsd: Math.round(amount * 100) / 100,
      cadence,
      mode,
      createdAtMs: Date.now(),
    });
    router.push("/plans");
  }

  const selectClass =
    "h-9 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground focus:outline-none focus-visible:outline-2";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-micro font-semibold uppercase tracking-wide text-faint">Base amount (USD)</span>
          <input
            inputMode="decimal"
            value={baseUsd}
            onChange={(e) => {
              setBaseUsd(e.target.value);
              setFieldError(null);
            }}
            className={`${selectClass} font-mono`}
            aria-label="Base amount in US dollars"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-micro font-semibold uppercase tracking-wide text-faint">Cadence</span>
          <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} className={selectClass}>
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-micro font-semibold uppercase tracking-wide text-faint">Thesis</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as ThesisMode)} className={selectClass}>
            <option value="contrarian">contrarian — buy more on outflows</option>
            <option value="momentum">momentum — buy more on inflows</option>
          </select>
        </label>
      </div>

      {fieldError && <p className="text-body text-down">{fieldError}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit">Create {assetSymbol} plan</Button>
        <p className="text-micro text-faint">
          Stored in this browser only. Buys are sized 0.50x to 2.00x of the base by the live signal and each one
          requires your signature.
        </p>
      </div>
    </form>
  );
}
