"use client";

// Client composition for /plans: the plan list, the portfolio proof, and the local-store
// states (hydrating, corrupt, empty). Plans and buys live only in this browser.
import Link from "next/link";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { usePlanStore } from "@/lib/plans";
import { ASSETS } from "@/lib/assets/catalog";
import { PlanCard } from "./PlanCard";
import { PortfolioCard } from "./PortfolioCard";

export function PlansBoard() {
  const { plans, buys, hydrated } = usePlanStore();

  if (!hydrated) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (plans.corrupt || buys.corrupt) {
    return (
      <Card>
        <ErrorState
          message="Stored plan data is unreadable"
          detail={`This browser's ${plans.corrupt ? "plan list" : "buy history"} failed validation (keel.${plans.corrupt ? "plans" : "buys"}.v1 in localStorage). It was written by a different version or edited by hand. Clear that key in devtools to start fresh; Keel will not overwrite it silently.`}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {plans.data.length === 0 ? (
        <Card>
          <EmptyState
            title="No plans yet"
            hint="A plan accumulates one asset on a schedule, with each buy sized 0.50x-2.00x by the live ETF-flow signal."
            action={
              <Link
                href={`/assets/${ASSETS[0].id}`}
                className="inline-flex h-9 items-center rounded-full bg-accent px-5 text-body font-semibold text-on-accent transition-colors hover:bg-accent-strong"
              >
                Set up your first plan
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.data.map((plan) => (
            <PlanCard key={plan.id} plan={plan} buys={buys.data} />
          ))}
        </div>
      )}

      <PortfolioCard buys={buys.data} />
    </div>
  );
}
