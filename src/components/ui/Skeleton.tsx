import { cn } from "@/lib/cn";

// Loading state only. Empty/error/stale have their own components.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-ink-200", className)} />;
}
