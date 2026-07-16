import type { ReactNode } from "react";

// Error state names the cause and offers recovery — never a generic "something went wrong".
export function ErrorState({ message, detail, action }: { message: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-down/30 bg-down/5 p-5">
      <p className="text-body font-semibold text-down">{message}</p>
      {detail && <p className="text-body text-muted">{detail}</p>}
      {action}
    </div>
  );
}
