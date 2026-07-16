import { describe, expect, it } from "vitest";
import { cadenceMs, nextDue } from "./schedule";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1); // fixed epoch for determinism

describe("cadenceMs", () => {
  it("maps cadences to exact interval lengths", () => {
    expect(cadenceMs("daily")).toBe(DAY);
    expect(cadenceMs("weekly")).toBe(7 * DAY);
    expect(cadenceMs("biweekly")).toBe(14 * DAY);
  });
});

describe("nextDue", () => {
  const plan = { createdAtMs: T0, cadence: "weekly" as const };

  it("is due immediately on creation when no buy has happened", () => {
    const s = nextDue(plan, null, T0);
    expect(s.due).toBe(true);
    expect(s.dueAtMs).toBe(T0);
    expect(s.overdueDays).toBe(0);
  });

  it("counts whole overdue days for an unstarted plan", () => {
    const s = nextDue(plan, null, T0 + 3 * DAY + 5000);
    expect(s.due).toBe(true);
    expect(s.overdueDays).toBe(3);
  });

  it("is not due until one full cadence after the last buy", () => {
    const lastBuy = T0 + 2 * DAY;
    const s = nextDue(plan, lastBuy, lastBuy + 6 * DAY);
    expect(s.due).toBe(false);
    expect(s.dueAtMs).toBe(lastBuy + 7 * DAY);
    expect(s.daysUntilDue).toBe(1);
  });

  it("becomes due exactly at the cadence boundary", () => {
    const lastBuy = T0;
    const s = nextDue(plan, lastBuy, lastBuy + 7 * DAY);
    expect(s.due).toBe(true);
    expect(s.overdueDays).toBe(0);
  });

  it("restarts the clock from the actual buy time, not the scheduled slot", () => {
    const lateBuy = T0 + 10 * DAY; // bought 3 days late
    const s = nextDue(plan, lateBuy, lateBuy + DAY);
    expect(s.dueAtMs).toBe(lateBuy + 7 * DAY);
    expect(s.due).toBe(false);
    expect(s.daysUntilDue).toBe(6);
  });

  it("rounds partial days up for daysUntilDue", () => {
    const lastBuy = T0;
    const s = nextDue({ ...plan, cadence: "daily" }, lastBuy, lastBuy + DAY / 2);
    expect(s.due).toBe(false);
    expect(s.daysUntilDue).toBe(1);
  });
});
