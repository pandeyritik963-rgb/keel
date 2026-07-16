import type { ReactNode } from "react";

// Empty state always offers a next action.
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border-strong bg-ink-50 p-5">
      <p className="text-body font-semibold text-foreground">{title}</p>
      {hint && <p className="text-body text-muted">{hint}</p>}
      {action}
    </div>
  );
}
