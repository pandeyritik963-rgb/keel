// Wire types shared by the route handlers and the client components that call them.
// The routes construct these shapes with `satisfies`, so a drift between server and
// client is a compile error, not a runtime surprise.
import type { Conviction, Stance } from "@/lib/core";

export interface SignalApiFlowOk {
  state: "ok";
  multiplier: number;
  stance: Stance;
  conviction: Conviction;
  flowScore: number;
  insufficientData: boolean;
  reasons: string[];
  latestNetInflowUsd: number | null;
  asOf: string;
  asOfDate: string | null;
}

export interface SignalApiFlowNotOk {
  state: "empty" | "not_configured" | "error";
  error?: string;
}

export type SignalApiFlow = SignalApiFlowOk | SignalApiFlowNotOk;

export interface SignalApiPriceOk {
  lastPx: number;
  askPx: number | null;
  changePct: number | null;
  asOf: string;
  source: string;
}

export interface SignalApiSymbolOk {
  id: number;
  takerFee: number | null;
  pricePrecision: number | null;
  quantityPrecision: number | null;
  minNotional: number | null;
}

export interface SignalApiResponse {
  asset: { id: string; symbol: string; name: string; spotSymbol: string };
  flow: SignalApiFlow;
  price: SignalApiPriceOk | { error: string };
  symbol: SignalApiSymbolOk | { error: string };
  execution: { network: "testnet" | "mainnet"; chainId: number };
}

export interface AccountApiOk {
  network: "testnet" | "mainnet";
  accountId: number;
  balances: { coin: string; total: number; locked?: number }[] | null;
  balancesError: string | null;
  asOf: string;
}

export interface AccountApiError {
  network?: "testnet" | "mainnet";
  error: string;
  message?: string;
  status?: number | null;
}

export interface OrderApiResult {
  network: "testnet" | "mainnet";
  gatewayStatus: number;
  accepted: boolean;
  body: unknown;
}

export function isPriceOk(p: SignalApiResponse["price"]): p is SignalApiPriceOk {
  return "lastPx" in p;
}

export function isSymbolOk(s: SignalApiResponse["symbol"]): s is SignalApiSymbolOk {
  return "id" in s;
}
