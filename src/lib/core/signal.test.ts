import { describe, expect, it } from "vitest";
import { computeSignal, multiplierFromScore } from "./signal";
import { DEFAULT_SIGNAL_CONFIG, type FlowPoint } from "./types";

const cfg = DEFAULT_SIGNAL_CONFIG;

describe("multiplierFromScore", () => {
  it("maps score extremes to the multiplier bounds under each thesis", () => {
    // contrarian: strong outflow (-1) buys max, strong inflow (+1) buys min
    expect(multiplierFromScore(-1, "contrarian")).toBe(cfg.max);
    expect(multiplierFromScore(1, "contrarian")).toBe(cfg.min);
    // momentum is the mirror
    expect(multiplierFromScore(-1, "momentum")).toBe(cfg.min);
    expect(multiplierFromScore(1, "momentum")).toBe(cfg.max);
    // neutral score holds the base amount under both
    expect(multiplierFromScore(0, "contrarian")).toBe(cfg.base);
    expect(multiplierFromScore(0, "momentum")).toBe(cfg.base);
  });

  it("momentum is exactly contrarian with the score negated", () => {
    for (const s of [-0.8, -0.4, -0.1, 0.2, 0.6, 0.9]) {
      expect(multiplierFromScore(s, "momentum")).toBe(multiplierFromScore(-s, "contrarian"));
    }
  });

  it("never leaves the [min, max] band", () => {
    for (const s of [-2, -1, -0.3, 0, 0.3, 1, 2]) {
      const m = multiplierFromScore(s, "contrarian");
      expect(m).toBeGreaterThanOrEqual(cfg.min);
      expect(m).toBeLessThanOrEqual(cfg.max);
    }
  });
});

const outflowStreak: FlowPoint[] = [
  { date: "2026-01-01", netInflowUsd: 100_000_000 },
  { date: "2026-01-02", netInflowUsd: 120_000_000 },
  { date: "2026-01-03", netInflowUsd: -300_000_000 },
  { date: "2026-01-04", netInflowUsd: -320_000_000 },
  { date: "2026-01-05", netInflowUsd: -280_000_000 },
];

describe("computeSignal", () => {
  it("contrarian accumulates more into an outflow streak; momentum eases off", () => {
    const contrarian = computeSignal(outflowStreak, { mode: "contrarian" });
    const momentum = computeSignal(outflowStreak, { mode: "momentum" });

    expect(contrarian.flowScore).toBeLessThan(0); // institutions distributing
    expect(contrarian.multiplier).toBeGreaterThan(1.3);
    expect(contrarian.stance).toBe("accumulate-more");
    expect(contrarian.streakDays).toBe(-3);

    expect(momentum.multiplier).toBeLessThan(0.85);
    expect(momentum.stance).toBe("ease-off");

    // both read the same underlying datapoint
    expect(contrarian.latestNetInflowUsd).toBe(-280_000_000);
    expect(contrarian.asOfDate).toBe("2026-01-05");
    expect(contrarian.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("inflow streak flips the stances", () => {
    const inflow = outflowStreak.map((p, i) => ({ ...p, netInflowUsd: Math.abs(p.netInflowUsd) + i }));
    const contrarian = computeSignal(inflow, { mode: "contrarian" });
    expect(contrarian.flowScore).toBeGreaterThan(0);
    expect(contrarian.multiplier).toBeLessThan(1);
    expect(contrarian.stance).toBe("ease-off");
  });

  it("sorts unordered input by date before computing", () => {
    const shuffled = [outflowStreak[2], outflowStreak[0], outflowStreak[4], outflowStreak[1], outflowStreak[3]];
    expect(computeSignal(shuffled).multiplier).toBe(computeSignal(outflowStreak).multiplier);
  });

  it("falls back to the base amount and flags insufficient data", () => {
    const empty = computeSignal([]);
    expect(empty.insufficientData).toBe(true);
    expect(empty.multiplier).toBe(cfg.base);
    expect(empty.latestNetInflowUsd).toBeNull();

    const twoDays = computeSignal(outflowStreak.slice(0, 2));
    expect(twoDays.insufficientData).toBe(true);
    expect(twoDays.multiplier).toBe(cfg.base);
    expect(twoDays.latestNetInflowUsd).toBe(120_000_000); // still surfaces the latest datapoint
  });
});
