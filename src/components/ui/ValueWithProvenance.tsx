import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Freshness = "live" | "recent" | "stale" | "unavailable";

const dot: Record<Freshness, string> = {
  live: "bg-up",
  recent: "bg-accent",
  stale: "bg-warn",
  unavailable: "bg-faint",
};

// Every SoSoValue/SoDEX number renders through this. The required `source` prop makes an
// unsourced value structurally impossible; the tooltip shows source + as-of + freshness.
export function ValueWithProvenance({
  value,
  source,
  asOf,
  freshness = "recent",
  className,
}: {
  value: ReactNode;
  source: string;
  asOf?: string;
  freshness?: Freshness;
  className?: string;
}) {
  const title = `Source: ${source}${asOf ? ` — as of ${asOf}` : ""}`;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={title}>
      <span>{value}</span>
      <span aria-hidden className={cn("size-1.5 rounded-full", dot[freshness])} />
    </span>
  );
}
