import { describe, expect, it } from "vitest";
import { backtest } from "./backtest";
import type { PricedFlowPoint } from "./types";

// Prices dip while institutions flee (outflows), then recover as they pile back in (inflows).
// A contrarian plan should buy more during the cheap, fearful days -> lower average cost.
const scenario: PricedFlowPoint[] = [
  { date: "2026-02-01", price: 100, netInflowUsd: 50_000_000 },
  { date: "2026-02-02", price: 100, netInflowUsd: 50_000_000 },
  { date: "2026-02-03", price: 100, netInflowUsd: 40_000_000 },
  { date: "2026-02-04", price: 80, netInflowUsd: -200_000_000 },
  { date: "2026-02-05", price: 70, netInflowUsd: -220_000_000 },
  { date: "2026-02-06", price: 75, netInflowUsd: -100_000_000 },
  { date: "2026-02-07", price: 90, netInflowUsd: 30_000_000 },
  { date: "2026-02-08", price: 100, netInflowUsd: 80_000_000 },
  { date: "2026-02-09", price: 110, netInflowUsd: 120_000_000 },
  { date: "2026-02-10", price: 115, netInflowUsd: 150_000_000 },
];

describe("backtest", () => {
  it("contrarian flow-weighting beats naive DCA on average cost in a buy-the-dip regime", () => {
    const r = backtest({ points: scenario, baseUsd: 100, mode: "contrarian", minHistory: 3 });

    expect(r.intervals).toBe(7); // 10 days minus 3 warm-up
    expect(r.keel.avgCostUsd).not.toBeNull();
    expect(r.naive.avgCostUsd).not.toBeNull();
    expect(r.keel.avgCostUsd!).toBeLessThan(r.naive.avgCostUsd!);
    expect(r.avgCostImprovementPct!).toBeGreaterThan(0);
    expect(r.fromDate).toBe("2026-02-04");
    expect(r.toDate).toBe("2026-02-10");
  });

  it("naive leg invests a fixed amount every interval", () => {
    const r = backtest({ points: scenario, baseUsd: 100, mode: "contrarian", minHistory: 3 });
    expect(r.naive.investedUsd).toBe(700); // 7 intervals x $100
    expect(r.naive.buys).toBe(7);
    // avg cost is internally consistent
    expect(r.naive.avgCostUsd!).toBeCloseTo(r.naive.investedUsd / r.naive.qty, 6);
  });

  it("is causal: reversing input order does not change the result", () => {
    const forward = backtest({ points: scenario, baseUsd: 100, mode: "contrarian" });
    const reversed = backtest({ points: [...scenario].reverse(), baseUsd: 100, mode: "contrarian" });
    expect(reversed.keel.avgCostUsd).toBeCloseTo(forward.keel.avgCostUsd!, 9);
  });
});
