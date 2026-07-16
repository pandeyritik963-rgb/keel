import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "up" | "down" | "warn" | "accent";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-border-strong bg-ink-100 text-muted",
  up: "border-up/30 bg-up/10 text-up",
  down: "border-down/30 bg-down/10 text-down",
  warn: "border-warn/30 bg-warn/10 text-warn",
  accent: "border-accent/30 bg-accent/10 text-accent",
};

export function Badge({ variant = "neutral", className, children }: { variant?: BadgeVariant; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-wide", variants[variant], className)}>
      {children}
    </span>
  );
}
