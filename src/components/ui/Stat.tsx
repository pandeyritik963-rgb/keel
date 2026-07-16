import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "up" | "down" | "warn" | "accent";

const tones: Record<Tone, string> = {
  neutral: "text-foreground",
  up: "text-up",
  down: "text-down",
  warn: "text-warn",
  accent: "text-accent",
};

export function Stat({
  label,
  value,
  context,
  tone = "neutral",
  size = "stat",
}: {
  label: ReactNode;
  value: ReactNode;
  context?: ReactNode;
  tone?: Tone;
  size?: "stat" | "display" | "lead";
}) {
  const sizeClass = size === "display" ? "text-display" : size === "lead" ? "text-lead" : "text-stat";
  return (
    <div>
      <p className="text-micro uppercase tracking-wide text-faint">{label}</p>
      <p className={cn("font-mono font-semibold", sizeClass, tones[tone])}>{value}</p>
      {context && <p className="mt-0.5 text-micro text-muted">{context}</p>}
    </div>
  );
}
