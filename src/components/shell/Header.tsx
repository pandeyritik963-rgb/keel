import Link from "next/link";
import { WalletControl } from "@/components/wallet/WalletControl";

// The wordmark carries a minimal keel mark: a waterline with a hull curve below it.
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 120 120" className="size-7" fill="none" aria-hidden>
              <path d="M20 46 L100 46" className="stroke-foreground" strokeWidth="7" strokeLinecap="round" />
              <path d="M30 50 Q60 96 90 50" className="stroke-accent" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lead font-extrabold tracking-tight text-foreground">Keel</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-body font-semibold text-muted transition-colors hover:text-foreground">
              Signal
            </Link>
            <Link href="/plans" className="text-body font-semibold text-muted transition-colors hover:text-foreground">
              Plans
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-up/40 bg-up/10 px-2.5 py-1 text-micro font-semibold uppercase tracking-wide text-up sm:inline-flex"
            title="Market data is live from SoDEX mainnet. Order execution is sandboxed on the SoDEX testnet — no real funds move."
          >
            <span className="size-1.5 rounded-full bg-up" aria-hidden />
            Live · SoDEX mainnet
          </span>
          <WalletControl />
        </div>
      </div>
    </header>
  );
}
