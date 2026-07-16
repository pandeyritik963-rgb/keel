"use client";

import { useConnect, useConnection, useConnectors, useDisconnect } from "wagmi";
import { Button } from "@/components/ui";
import { shortAddress } from "@/lib/wallet/config";

// Header wallet control. Connect is only needed to buy — the signal is free to read —
// so this stays quiet: one button, no modal. Signing is EIP-712 only; Keel never asks
// the wallet to send a transaction and never sees a private key.
export function WalletControl() {
  const connection = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending: connecting, error } = useConnect();
  const { mutate: disconnect } = useDisconnect();

  const injectedConnector = connectors[0];

  if (connection.status === "connected") {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-body text-muted" title={connection.address}>
          {shortAddress(connection.address)}
        </span>
        <Button variant="ghost" onClick={() => disconnect({})}>
          Disconnect
        </Button>
      </div>
    );
  }

  if (!injectedConnector) {
    return (
      <span className="text-micro text-faint" title="Install a browser wallet (e.g. MetaMask) to sign buys. The signal works without one.">
        No wallet detected
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="max-w-48 truncate text-micro text-down" title={error.message}>
          {error.message.split("\n")[0]}
        </span>
      )}
      <Button
        variant="secondary"
        disabled={connecting || connection.status === "reconnecting"}
        onClick={() => connect({ connector: injectedConnector })}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </Button>
    </div>
  );
}
