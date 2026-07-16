// localStorage-backed plan/buy store with an in-memory pub/sub so React surfaces update
// in the same tab. Reads are zod-validated: a corrupt blob is surfaced as `corrupt`
// (rendered as an explicit error state) rather than silently discarded or "fixed".
"use client";

import { buysFileSchema, plansFileSchema, type BuyRecord, type Plan } from "./types";

const PLANS_KEY = "keel.plans.v1";
const BUYS_KEY = "keel.buys.v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

export function subscribePlans(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PLANS_KEY || e.key === BUYS_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export interface StoreRead<T> {
  data: T;
  corrupt: boolean;
}

function readFile<T>(key: string, parse: (raw: unknown) => T | null, empty: T): StoreRead<T> {
  if (typeof window === "undefined") return { data: empty, corrupt: false };
  const raw = window.localStorage.getItem(key);
  if (raw === null) return { data: empty, corrupt: false };
  try {
    const parsed = parse(JSON.parse(raw));
    if (parsed === null) return { data: empty, corrupt: true };
    return { data: parsed, corrupt: false };
  } catch {
    return { data: empty, corrupt: true };
  }
}

export function readPlans(): StoreRead<Plan[]> {
  return readFile(
    PLANS_KEY,
    (raw) => {
      const res = plansFileSchema.safeParse(raw);
      return res.success ? res.data.plans : null;
    },
    [],
  );
}

export function readBuys(): StoreRead<BuyRecord[]> {
  return readFile(
    BUYS_KEY,
    (raw) => {
      const res = buysFileSchema.safeParse(raw);
      return res.success ? res.data.buys : null;
    },
    [],
  );
}

function writePlans(plans: Plan[]): void {
  window.localStorage.setItem(PLANS_KEY, JSON.stringify({ v: 1, plans }));
  emit();
}

function writeBuys(buys: BuyRecord[]): void {
  window.localStorage.setItem(BUYS_KEY, JSON.stringify({ v: 1, buys }));
  emit();
}

export function addPlan(plan: Plan): void {
  const { data } = readPlans();
  writePlans([...data.filter((p) => p.id !== plan.id), plan]);
}

export function updatePlan(id: string, patch: Partial<Omit<Plan, "id">>): void {
  const { data } = readPlans();
  writePlans(data.map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

/** Deletes the plan; its buy records are kept (they are history, not configuration). */
export function deletePlan(id: string): void {
  const { data } = readPlans();
  writePlans(data.filter((p) => p.id !== id));
}

export function addBuy(buy: BuyRecord): void {
  const { data } = readBuys();
  writeBuys([...data, buy]);
}

export function lastBuyForPlan(buys: BuyRecord[], planId: string): BuyRecord | null {
  let last: BuyRecord | null = null;
  for (const b of buys) {
    if (b.planId !== planId || !b.accepted) continue;
    if (last === null || b.tsMs > last.tsMs) last = b;
  }
  return last;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
