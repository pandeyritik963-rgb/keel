// zod schemas for SoDEX spot responses. High-precision numerics are coerced to number for
// display; schemas stay lenient (most fields optional) so a minor API addition never breaks a
// read. Shapes follow the SoDEX spot REST schema (SpotSymbol, SpotTicker, RPCKline, SpotBalance).
import { z } from "zod";

export const spotSymbolSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  displayName: z.string().optional(),
  baseCoin: z.string().optional(),
  quoteCoin: z.string().optional(),
  baseCoinPrecision: z.coerce.number().optional(),
  quoteCoinPrecision: z.coerce.number().optional(),
  pricePrecision: z.coerce.number().optional(),
  quantityPrecision: z.coerce.number().optional(),
  minNotional: z.coerce.number().optional(),
  marketMinQuantity: z.coerce.number().optional(),
  makerFee: z.coerce.number().optional(),
  takerFee: z.coerce.number().optional(),
  status: z.union([z.string(), z.number()]).optional(),
});
export const spotSymbolsSchema = z.array(spotSymbolSchema);
export type SpotSymbol = z.infer<typeof spotSymbolSchema>;

export const spotTickerSchema = z.object({
  symbol: z.string().optional(),
  lastPx: z.coerce.number(),
  openPx: z.coerce.number().optional(),
  highPx: z.coerce.number().optional(),
  lowPx: z.coerce.number().optional(),
  bidPx: z.coerce.number().optional(),
  askPx: z.coerce.number().optional(),
  volume: z.coerce.number().optional(),
  quoteVolume: z.coerce.number().optional(),
  change: z.coerce.number().optional(),
  changePct: z.coerce.number().optional(),
  closeTime: z.coerce.number().optional(),
});
export const spotTickersSchema = z.array(spotTickerSchema);
export type SpotTicker = z.infer<typeof spotTickerSchema>;

// OHLCV candle: t open time (ms), o/h/l/c prices, v base vol, q quote vol, n trade count.
export const klineSchema = z.object({
  t: z.coerce.number(),
  o: z.coerce.number(),
  h: z.coerce.number(),
  l: z.coerce.number(),
  c: z.coerce.number(),
  v: z.coerce.number().optional(),
  q: z.coerce.number().optional(),
  n: z.coerce.number().optional(),
});
export const klinesSchema = z.array(klineSchema);
export type Kline = z.infer<typeof klineSchema>;

export const spotBalanceSchema = z.object({
  id: z.coerce.number().optional(),
  coin: z.string(),
  total: z.coerce.number(),
  locked: z.coerce.number().optional(),
});
export type SpotBalance = z.infer<typeof spotBalanceSchema>;

// Balances may come back as a bare array or wrapped under { balances: [...] }.
export const spotBalancesSchema = z.preprocess(
  (v) => (v && typeof v === "object" && Array.isArray((v as { balances?: unknown[] }).balances) ? (v as { balances: unknown[] }).balances : v),
  z.array(spotBalanceSchema),
);

// We only need aid (numeric account id) from the state response.
export const spotStateSchema = z.object({ aid: z.coerce.number() });
export type SpotState = z.infer<typeof spotStateSchema>;
