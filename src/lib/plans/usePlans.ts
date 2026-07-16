// React binding for the localStorage plan store. useSyncExternalStore keeps every
// mounted surface consistent after a write and hydration-safe on the server
// (server snapshot = empty, client re-reads on mount).
"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readBuys, readPlans, subscribePlans, type StoreRead } from "./store";
import type { BuyRecord, Plan } from "./types";

const EMPTY_PLANS: StoreRead<Plan[]> = { data: [], corrupt: false };
const EMPTY_BUYS: StoreRead<BuyRecord[]> = { data: [], corrupt: false };

let plansCache: StoreRead<Plan[]> | null = null;
let buysCache: StoreRead<BuyRecord[]> | null = null;

function invalidate(): void {
  plansCache = null;
  buysCache = null;
}

export function usePlanStore(): {
  plans: StoreRead<Plan[]>;
  buys: StoreRead<BuyRecord[]>;
  hydrated: boolean;
} {
  const subscribe = useCallback((onChange: () => void) => {
    return subscribePlans(() => {
      invalidate();
      onChange();
    });
  }, []);

  const plans = useSyncExternalStore(
    subscribe,
    () => (plansCache ??= readPlans()),
    () => EMPTY_PLANS,
  );
  const buys = useSyncExternalStore(
    subscribe,
    () => (buysCache ??= readBuys()),
    () => EMPTY_BUYS,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return { plans, buys, hydrated };
}
