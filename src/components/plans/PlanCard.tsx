"use client";

// One plan: its configuration, today's live sizing for its thesis, the cadence clock,
// and the entry to the buy confirmation. Deleting is a two-step click, no browser modal.
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, ValueWithProvenance } from "@/components/ui";
import { intervalBuyUsd, nextDue } from "@/lib/core";
import { deletePlan, lastBuyForPlan, type BuyRecord, type Plan } from "@/lib/plans";
import { formatMultiplier, formatUsd } from "@/lib/format";
import { getAsset } from "@/lib/assets/catalog";
import { BuyDialog } from "./BuyDialog";
import { useSignalQuery } from "./useSignalQuery";

export function PlanCard({ plan, buys }: { plan: Plan; buys: BuyRecord[] }) {
  const asset = getAsset(plan.assetId);
  const signal = useSignalQuery(plan.assetId, plan.mode);
  const [confirming, setConfirming] = useState(false);
  const [removeArmed, setRemoveArmed] = useState(false);

  if (!asset) {
    return (
      <Card>
        <ErrorState
          message={`Plan references unknown asset "${plan.assetId}"`}
          detail="The asset catalog no longer contains it."
          action={
            <Button variant="secondary" onClick={() => deletePlan(plan.id)}>
              Remove plan
            </Button>
          }
        />
      </Card>
    );
  }

  const lastBuy = lastBuyForPlan(buys, plan.id);
  const due = nextDue(plan, lastBuy?.tsMs ?? null, Date.now());
  const flow = signal.data?.flow;
  const multiplier = flow?.state === "ok" ? flow.multiplier : null;
  const buyUsd = multiplier !== null ? intervalBuyUsd(plan.baseUsd, multiplier) : null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/assets/${asset.id}`} className="text-lead font-semibold text-foreground hover:text-accent">
            {asset.name}
          </Link>
          <p className="mt-0.5 text-micro text-faint">
            {formatUsd(plan.baseUsd)} base · {plan.cadence} · {plan.mode}
          </p>
        </div>
        <Badge variant={due.due ? "accent" : "neutral"}>
          {due.due ? (due.overdueDays > 0 ? `due · ${due.overdueDays}d overdue` : "due now") : `due in ${due.daysUntilDue}d`}
        </Badge>
      </div>

      {signal.isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}

      {signal.isError && (
        <ErrorState
          message="Couldn't load today's sizing"
          detail={`${signal.error.message}. Retry below.`}
          action={
            <Button variant="secondary" onClick={() => signal.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {signal.isSuccess && flow?.state === "ok" && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-micro uppercase tracking-wide text-faint">Today&apos;s buy</p>
            <p className="font-mono text-stat font-semibold text-accent">
              {formatUsd(buyUsd)} <span className="text-body text-muted">at {formatMultiplier(multiplier)}</span>
            </p>
            <p className="mt-0.5 text-micro text-muted">
              <ValueWithProvenance value={flow.reasons[0]} source="SoSoValue /etfs/summary-history" asOf={flow.asOf} freshness="recent" />
            </p>
          </div>
        </div>
      )}

      {signal.isSuccess && flow && flow.state !== "ok" && (
        <EmptyState
          title={flow.state === "not_configured" ? "Signal offline (no SoSoValue key)" : flow.state === "empty" ? "No flow data for this asset" : "Flow read failed"}
          hint="The buy confirmation cannot size an order while the signal is offline; it will hold the buy rather than guess."
        />
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="text-micro text-faint">
          {lastBuy
            ? `Last buy ${formatUsd(lastBuy.buyUsd)} on ${new Date(lastBuy.tsMs).toISOString().slice(0, 10)}`
            : "No buys yet"}
        </div>
        <div className="flex gap-2">
          {removeArmed ? (
            <>
              <Button variant="ghost" onClick={() => setRemoveArmed(false)}>
                Keep
              </Button>
              <Button variant="secondary" className="text-down" onClick={() => deletePlan(plan.id)}>
                Confirm remove
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setRemoveArmed(true)}>
              Remove
            </Button>
          )}
          <Button disabled={!signal.isSuccess} onClick={() => setConfirming(true)}>
            Review buy
          </Button>
        </div>
      </div>

      {confirming && signal.data && <BuyDialog plan={plan} signal={signal.data} onClose={() => setConfirming(false)} />}
    </Card>
  );
}
