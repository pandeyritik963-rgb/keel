// wagmi config for the injected wallet. Keel needs exactly two wallet capabilities:
// connect (to learn the address) and EIP-712 signTypedData (to authorize a SoDEX order).
// Neither requires an RPC read, and no verified public RPC exists for ValueChain yet, so
// we do not register a custom chain: the wallet stays on whatever chain it is on, and the
// order's typed-data domain carries the SoDEX chainId (138565 testnet / 286623 mainnet)
// explicitly. No transaction is ever broadcast through the wallet's chain.
import { createConfig, http, injected } from "wagmi";
import { mainnet } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: { [mainnet.id]: http() },
  ssr: true,
});

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
