// Plan math: turn a base amount + multiplier into this interval's buy, and roll up cost basis.
// Analytics-grade numbers (USD to cents, qty to full precision). The real on-chain order is
// sized with decimal-safe integer math at the execution boundary, not here.

/** This interval's USD buy = base amount scaled by the signal multiplier, rounded to cents. */
export function intervalBuyUsd(baseUsd: number, multiplier: number): number {
  return Math.round(baseUsd * multiplier * 100) / 100;
}

/** Quantity acquired for a USD amount at a given price. */
export function buyQtyFor(usd: number, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return usd / price;
}

export interface PlanSummary {
  totalInvestedUsd: number;
  totalQty: number;
  avgCostUsd: number | null; // null until at least one unit is acquired
}

export function summarizeBuys(buys: { usd: number; qty: number }[]): PlanSummary {
  const totalInvestedUsd = Math.round(buys.reduce((a, b) => a + b.usd, 0) * 100) / 100;
  const totalQty = buys.reduce((a, b) => a + b.qty, 0);
  const avgCostUsd = totalQty > 0 ? totalInvestedUsd / totalQty : null;
  return { totalInvestedUsd, totalQty, avgCostUsd };
}

/** Mark-to-market value of an accumulated position at the current price. */
export function currentValueUsd(totalQty: number, price: number): number {
  return totalQty * price;
}

/** Unrealized PnL vs cost basis, as a ratio (0.1 = +10%). Null when there is no basis. */
export function unrealizedPnlRatio(summary: PlanSummary, price: number): number | null {
  if (summary.avgCostUsd == null || summary.avgCostUsd <= 0) return null;
  return price / summary.avgCostUsd - 1;
}
