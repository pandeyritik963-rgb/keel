import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong",
  secondary: "border border-border-strong bg-surface text-foreground hover:bg-ink-100",
  ghost: "text-muted hover:text-foreground",
};

export function Button({
  variant = "primary",
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full px-4 text-body font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
