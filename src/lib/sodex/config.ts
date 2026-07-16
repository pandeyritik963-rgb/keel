// SoDEX gateway configuration. Market data reads live from mainnet; order execution is
// sandboxed on testnet. The two networks are chosen independently so the split is explicit.
import type { Hex } from "viem";

export const DEFAULT_TESTNET_GW = "https://testnet-gw.sodex.dev";
export const DEFAULT_MAINNET_GW = "https://mainnet-gw.sodex.dev";
export const CHAIN_IDS = { mainnet: 286623, testnet: 138565 } as const;
export const SPOT_DOMAIN_NAME = "spot";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Hex;

export type SodexNetwork = "mainnet" | "testnet";

/** Where orders are signed/sent. Defaults to the testnet sandbox (no real funds). */
export function getExecNetwork(): SodexNetwork {
  return process.env.SODEX_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

/** Where market data (prices, klines) is read. Defaults to mainnet (real economics). */
export function getDataNetwork(): SodexNetwork {
  return process.env.SODEX_DATA_NETWORK === "testnet" ? "testnet" : "mainnet";
}

function gatewayBase(network: SodexNetwork): string {
  const override = process.env.SODEX_API_BASE?.trim();
  if (override) return override.replace(/\/+$/, "");
  return network === "mainnet" ? DEFAULT_MAINNET_GW : DEFAULT_TESTNET_GW;
}

export function spotBase(network: SodexNetwork): string {
  return `${gatewayBase(network)}/api/v1/spot`;
}

type ParamValue = string | number | undefined | null;

export function spotUrl(
  path: string,
  params?: Record<string, ParamValue>,
  network: SodexNetwork = getDataNetwork(),
): string {
  const url = new URL(`${spotBase(network)}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function execChainId(): number {
  return CHAIN_IDS[getExecNetwork()];
}
