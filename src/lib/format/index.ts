// Central number formatting for Keel. Every price/percent/amount in the UI goes through here
// so units, signs, and null-handling are consistent. Missing data renders as an en-dash, never
// a fabricated "0". USD amounts display to cents via Intl; dnum is used at the on-chain sizing
// boundary (not here) where 18-decimal token precision matters.
import { toNumber as dnToNumber, type Dnum } from "dnum";

export const MISSING = "—";
export type Maybe<T> = T | null | undefined;
export type Money = Dnum | number;

const isNil = (v: unknown): v is null | undefined => v === null || v === undefined;
const isDnum = (v: unknown): v is Dnum =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === "bigint";
const toNum = (v: Money): number => (isDnum(v) ? dnToNumber(v) : Number(v));

/** Wrap a formatter so a null/undefined input always yields MISSING, never "0". */
export function withMissing<A, R>(fn: (value: A) => R): (value: Maybe<A>) => R | typeof MISSING {
  return (value) => (isNil(value) ? MISSING : fn(value as A));
}

// ---------- USD ----------
export function formatUsd(
  value: Maybe<Money>,
  opts: { dp?: number; signed?: boolean; compact?: boolean; noSymbol?: boolean } = {},
): string {
  if (isNil(value)) return MISSING;
  const num = toNum(value);
  if (!Number.isFinite(num)) return MISSING;
  const { dp = 2, signed = false, compact = false, noSymbol = false } = opts;
  const abs = Math.abs(num);
  const body = compact
    ? abs.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: Math.max(dp, 1) })
    : abs.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const sym = noSymbol ? "" : "$";
  const sign = num < 0 ? "-" : signed ? "+" : "";
  return `${sign}${sym}${body}`;
}

export const formatCompactUsd = (value: Maybe<Money>, opts: { signed?: boolean } = {}) =>
  formatUsd(value, { ...opts, compact: true });

export const formatSignedUsd = (value: Maybe<Money>, opts: { dp?: number } = {}) =>
  formatUsd(value, { ...opts, signed: true });

// ---------- Percent / bps ----------
// Input is a ratio by default (0.024 -> "2.40%"). Pass asPercentPoints for already-scaled input.
export function formatPercent(
  value: Maybe<number>,
  opts: { dp?: number; signed?: boolean; asPercentPoints?: boolean; timeframe?: string } = {},
): string {
  if (isNil(value) || !Number.isFinite(value)) return MISSING;
  const { dp = 2, signed = false, asPercentPoints = false, timeframe } = opts;
  const pct = asPercentPoints ? value : value * 100;
  const sign = pct > 0 && signed ? "+" : "";
  const body = `${sign}${pct.toFixed(dp)}%`;
  return timeframe ? `${body} (${timeframe})` : body;
}

export function formatBps(
  value: Maybe<number>,
  opts: { dp?: number; signed?: boolean; asBps?: boolean } = {},
): string {
  if (isNil(value) || !Number.isFinite(value)) return MISSING;
  const { dp = 0, signed = false, asBps = false } = opts;
  const bps = asBps ? value : value * 10000;
  const sign = bps > 0 && signed ? "+" : "";
  return `${sign}${bps.toFixed(dp)} bps`;
}

// ---------- Price / quantity ----------
// Picks digit count by magnitude so a sub-dollar asset never rounds to "$0".
export function adaptivePriceDigits(n: number): number {
  const a = Math.abs(n);
  if (!Number.isFinite(a) || a === 0) return 2;
  if (a >= 1000) return 0;
  if (a >= 1) return 2;
  if (a >= 0.01) return 4;
  if (a >= 0.0001) return 6;
  return 8;
}

export function formatPrice(
  value: Maybe<number>,
  opts: { dp?: number; noSymbol?: boolean; adaptive?: boolean } = {},
): string {
  if (isNil(value) || !Number.isFinite(value)) return MISSING;
  const { noSymbol = false, adaptive = false } = opts;
  const dp = opts.dp ?? (adaptive ? adaptivePriceDigits(value) : 2);
  const body = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
  const sign = value < 0 ? "-" : "";
  const sym = noSymbol ? "" : "$";
  return `${sign}${sym}${body}`;
}

export function formatQty(value: Maybe<number>, opts: { dp?: number; unit?: string } = {}): string {
  if (isNil(value) || !Number.isFinite(value)) return MISSING;
  const { dp = 4, unit } = opts;
  const body = value.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return unit ? `${body} ${unit}` : body;
}

// Multiplier badge, e.g. 1.6 -> "1.60x". ASCII "x" keeps it anti-slop-safe.
export function formatMultiplier(value: Maybe<number>, opts: { dp?: number } = {}): string {
  if (isNil(value) || !Number.isFinite(value)) return MISSING;
  const { dp = 2 } = opts;
  return `${value.toFixed(dp)}x`;
}
