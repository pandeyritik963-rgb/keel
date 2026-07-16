// Cadence math for DCA plans. Pure millisecond arithmetic on fixed-length intervals
// (daily/weekly/biweekly) — no calendar-month ambiguity, so "due" is always derivable
// from two timestamps. The UI never invents a due date; it renders exactly this.

export type Cadence = "daily" | "weekly" | "biweekly";

export const CADENCES: Cadence[] = ["daily", "weekly", "biweekly"];

const DAY_MS = 24 * 60 * 60 * 1000;

export const CADENCE_DAYS: Record<Cadence, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
};

export function cadenceMs(cadence: Cadence): number {
  return CADENCE_DAYS[cadence] * DAY_MS;
}

export interface DueStatus {
  /** epoch ms when the next buy becomes due */
  dueAtMs: number;
  /** true when now >= dueAtMs */
  due: boolean;
  /** whole days past due (0 when not due) */
  overdueDays: number;
  /** whole days until due (0 when due) */
  daysUntilDue: number;
}

/**
 * The first buy is due immediately on plan creation; each later buy is due one full
 * cadence interval after the previous buy. A late buy does not compress the next one:
 * the clock restarts from the actual buy time, not the scheduled slot.
 */
export function nextDue(
  plan: { createdAtMs: number; cadence: Cadence },
  lastBuyAtMs: number | null,
  nowMs: number,
): DueStatus {
  const dueAtMs = lastBuyAtMs === null ? plan.createdAtMs : lastBuyAtMs + cadenceMs(plan.cadence);
  const due = nowMs >= dueAtMs;
  const overdueDays = due ? Math.floor((nowMs - dueAtMs) / DAY_MS) : 0;
  const daysUntilDue = due ? 0 : Math.ceil((dueAtMs - nowMs) / DAY_MS);
  return { dueAtMs, due, overdueDays, daysUntilDue };
}
