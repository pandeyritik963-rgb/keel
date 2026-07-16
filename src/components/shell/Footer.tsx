export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <p className="text-body text-muted">
          Keel sizes each buy from live SoSoValue ETF-flow data. Market data reads live from SoDEX
          mainnet; order execution runs on the SoDEX testnet sandbox, so no real funds move.
        </p>
        <p className="mt-2 text-micro text-faint">
          Not financial advice. Not available in restricted jurisdictions. You hold your own keys;
          Keel never takes custody.
        </p>
      </div>
    </footer>
  );
}
