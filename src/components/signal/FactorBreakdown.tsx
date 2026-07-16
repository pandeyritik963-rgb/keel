// How the multiplier was computed: three factors in [-1, 1] (flow-direction frame,
// +1 = strong inflows), their weights, the composite score, and the thesis mapping.
// Renders exactly the numbers from computeSignal — the same code path the buy uses.
import { DEFAULT_SIGNAL_CONFIG, type SignalResult } from "@/lib/core";
import { formatMultiplier } from "@/lib/format";

function FactorBar({ label, value, weight, note }: { label: string; value: number; weight: number; note: string }) {
  const pct = Math.min(Math.abs(value), 1) * 50; // half-width from center
  return (
    <div className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3">
      <div>
        <p className="text-body font-semibold text-foreground">{label}</p>
        <p className="text-micro text-faint">weight {Math.round(weight * 100)}% · {note}</p>
      </div>
      <div className="relative h-2.5 rounded-full bg-ink-100">
        <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" aria-hidden />
        <span
          aria-hidden
          className={`absolute inset-y-0 rounded-full ${value >= 0 ? "bg-up" : "bg-down"}`}
          style={value >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
        />
      </div>
      <span className={`text-right font-mono text-body font-semibold ${value > 0 ? "text-up" : value < 0 ? "text-down" : "text-muted"}`}>
        {value > 0 ? "+" : ""}
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export function FactorBreakdown({ signal }: { signal: SignalResult }) {
  const w = DEFAULT_SIGNAL_CONFIG.weights;
  return (
    <div className="flex flex-col gap-4">
      <FactorBar label="Magnitude" value={signal.factors.magnitude} weight={w.magnitude} note="latest flow vs recent typical size" />
      <FactorBar label="Streak" value={signal.factors.streak} weight={w.streak} note={`${Math.abs(signal.streakDays)}-day ${signal.streakDays >= 0 ? "inflow" : "outflow"} run`} />
      <FactorBar label="Trend" value={signal.factors.trend} weight={w.trend} note="7-day directional bias" />

      <div className="rounded-md border border-border bg-ink-50 p-3 text-body text-muted">
        Composite flow score{" "}
        <span className={`font-mono font-semibold ${signal.flowScore > 0 ? "text-up" : signal.flowScore < 0 ? "text-down" : "text-foreground"}`}>
          {signal.flowScore > 0 ? "+" : ""}
          {signal.flowScore.toFixed(2)}
        </span>{" "}
        (+1 = strong inflows, -1 = strong outflows). Under the{" "}
        <span className="font-semibold text-foreground">{signal.mode}</span> thesis this maps to a{" "}
        <span className="font-mono font-semibold text-accent">{formatMultiplier(signal.multiplier)}</span> buy, bounded to
        [{DEFAULT_SIGNAL_CONFIG.min.toFixed(2)}x, {DEFAULT_SIGNAL_CONFIG.max.toFixed(2)}x] of the base amount.
      </div>
    </div>
  );
}
