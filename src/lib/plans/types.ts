// Plan + buy record shapes, persisted client-side only (localStorage). Keel is
// non-custodial: there is no server account, so the plan ledger lives in the browser.
// Every stored number is copied from a live source at write time (signal, ticker,
// gateway response) — nothing here is invented after the fact.
import { z } from "zod";
import { CADENCES, type Cadence } from "@/lib/core";

export const planSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  baseUsd: z.number().positive(),
  cadence: z.enum(CADENCES as [Cadence, ...Cadence[]]),
  mode: z.enum(["contrarian", "momentum"]),
  createdAtMs: z.number().int().positive(),
});
export type Plan = z.infer<typeof planSchema>;

export const buyRecordSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  assetId: z.string().min(1),
  tsMs: z.number().int().positive(),
  mode: z.enum(["contrarian", "momentum"]),
  // signal snapshot at buy time (provenance for "why this size")
  multiplier: z.number(),
  flowScore: z.number(),
  reasons: z.array(z.string()),
  flowAsOf: z.string().nullable(),
  // sizing
  baseUsd: z.number().positive(),
  buyUsd: z.number().positive(),
  /** SoDEX ask price used to estimate quantity at submit time */
  estPrice: z.number().positive(),
  estQty: z.number().positive(),
  /** counterfactual: qty a naive base-amount buy would have acquired at the same price */
  naiveQty: z.number().positive(),
  feeUsd: z.number().nonnegative().nullable(),
  // execution
  network: z.enum(["testnet", "mainnet"]),
  clOrdId: z.string().min(1),
  gatewayStatus: z.number().int(),
  accepted: z.boolean(),
});
export type BuyRecord = z.infer<typeof buyRecordSchema>;

export const plansFileSchema = z.object({ v: z.literal(1), plans: z.array(planSchema) });
export const buysFileSchema = z.object({ v: z.literal(1), buys: z.array(buyRecordSchema) });
