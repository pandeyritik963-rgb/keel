import { describe, expect, it } from "vitest";
import {
  MISSING,
  adaptivePriceDigits,
  formatBps,
  formatCompactUsd,
  formatMultiplier,
  formatPercent,
  formatPrice,
  formatQty,
  formatSignedUsd,
  formatUsd,
} from "./index";

describe("formatUsd", () => {
  it("renders MISSING for null/undefined, never 0", () => {
    expect(formatUsd(null)).toBe(MISSING);
    expect(formatUsd(undefined)).toBe(MISSING);
  });
  it("formats with symbol, grouping, and sign options", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(-42)).toBe("-$42.00");
    expect(formatSignedUsd(42)).toBe("+$42.00");
    expect(formatUsd(1000, { noSymbol: true, dp: 0 })).toBe("1,000");
  });
  it("compacts large values", () => {
    expect(formatCompactUsd(90_000_000)).toBe("$90M");
    expect(formatCompactUsd(-1_200_000_000)).toBe("-$1.2B");
  });
});

describe("formatPercent / formatBps", () => {
  it("treats input as a ratio by default", () => {
    expect(formatPercent(0.024)).toBe("2.40%");
    expect(formatPercent(0.024, { signed: true })).toBe("+2.40%");
    expect(formatPercent(0.024, { timeframe: "7d" })).toBe("2.40% (7d)");
    expect(formatPercent(null)).toBe(MISSING);
  });
  it("converts ratios to bps", () => {
    expect(formatBps(0.0002)).toBe("2 bps");
    expect(formatBps(0.00025, { dp: 1, signed: true })).toBe("+2.5 bps");
  });
});

describe("formatPrice adaptive digits", () => {
  it("keeps sub-dollar assets from rounding to $0", () => {
    expect(adaptivePriceDigits(62_000)).toBe(0);
    expect(adaptivePriceDigits(0.0712)).toBe(4);
    expect(formatPrice(0.0712, { adaptive: true })).toBe("$0.0712");
    expect(formatPrice(62771, { adaptive: true })).toBe("$62,771");
  });
});

describe("formatQty / formatMultiplier", () => {
  it("formats quantities and multipliers", () => {
    expect(formatQty(0.01195, { unit: "BTC" })).toBe("0.0120 BTC");
    expect(formatMultiplier(1.6)).toBe("1.60x");
    expect(formatMultiplier(null)).toBe(MISSING);
  });
});
