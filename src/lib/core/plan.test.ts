import { describe, expect, it } from "vitest";
import { buyQtyFor, currentValueUsd, intervalBuyUsd, summarizeBuys, unrealizedPnlRatio } from "./plan";

describe("plan math", () => {
  it("scales the base amount by the multiplier, rounded to cents", () => {
    expect(intervalBuyUsd(100, 1.55)).toBe(155);
    expect(intervalBuyUsd(75, 1.333)).toBe(99.98);
    expect(intervalBuyUsd(100, 0.5)).toBe(50);
  });

  it("computes quantity from USD and price, guarding bad prices", () => {
    expect(buyQtyFor(150, 50_000)).toBeCloseTo(0.003, 12);
    expect(buyQtyFor(100, 0)).toBe(0);
    expect(buyQtyFor(100, -5)).toBe(0);
  });

  it("rolls up cost basis across buys", () => {
    const s = summarizeBuys([
      { usd: 100, qty: 0.002 }, // $50k
      { usd: 200, qty: 0.005 }, // $40k
    ]);
    expect(s.totalInvestedUsd).toBe(300);
    expect(s.totalQty).toBeCloseTo(0.007, 12);
    expect(s.avgCostUsd).toBeCloseTo(300 / 0.007, 6); // ~$42,857
  });

  it("returns null avg cost and pnl before any units are held", () => {
    const s = summarizeBuys([]);
    expect(s.avgCostUsd).toBeNull();
    expect(unrealizedPnlRatio(s, 100)).toBeNull();
  });

  it("marks the position to market", () => {
    const s = summarizeBuys([{ usd: 100, qty: 1 }]);
    expect(currentValueUsd(s.totalQty, 130)).toBe(130);
    expect(unrealizedPnlRatio(s, 130)).toBeCloseTo(0.3, 12);
  });
});
