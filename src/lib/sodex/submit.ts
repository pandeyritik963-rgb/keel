// Build and send a signed spot order. The X-API-Key header carries the API key name (required
// when signing with an API key). Body is params only. Orders execute on the execution network
// (testnet sandbox by default), so no real funds move unless SODEX_NETWORK is flipped to mainnet.
import { getExecNetwork, spotUrl, type SodexNetwork } from "./config";
import type { SignedSpotOrder } from "./sign";

export interface OrderSubmission {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export function buildSpotOrderSubmission(
  signed: SignedSpotOrder,
  opts?: { apiKeyName?: string; network?: SodexNetwork },
): OrderSubmission {
  const network = opts?.network ?? getExecNetwork();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Sign": signed.wireSignature,
    "X-API-Nonce": String(signed.nonce),
    "X-API-Chain": String(signed.chainId),
  };
  if (opts?.apiKeyName) headers["X-API-Key"] = opts.apiKeyName;
  return { url: spotUrl("/trade/orders/batch", {}, network), headers, body: signed.bodyJson };
}

export interface OrderSendResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export async function sendSpotOrder(submission: OrderSubmission): Promise<OrderSendResult> {
  const res = await fetch(submission.url, {
    method: "POST",
    headers: submission.headers,
    body: submission.body,
    cache: "no-store",
  });
  const body: unknown = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}
