// SoDEX spot order signing, ported from the official Go SDK signing spec
// (github.com/sodex-tech/sodex-go-sdk-public: common/types/action_payload.go, eip712.go,
// spot/types/batch_new_order_request.go, references/authentication.md).
//
// Pipeline:
//   1. payloadHash = keccak256( compact JSON of { type:"batchNewOrder", params } )
//        - Go struct field order, decimals as strings with NO trailing zeros, omitempty omitted.
//   2. EIP-712 sign ExchangeAction(bytes32 payloadHash, uint64 nonce) under domain name="spot".
//   3. Wire signature = 0x01 + 65-byte ECDSA sig, with v converted 27/28 -> 0/1.
// The module never touches a private key: the sign function is injected (the wallet in the
// browser, or a viem local account in tests).
import { keccak256, toBytes, type Hex, type TypedDataDomain } from "viem";
import { SPOT_DOMAIN_NAME, ZERO_ADDRESS } from "./config";

export const OrderSide = { BUY: 1, SELL: 2 } as const;
export const OrderType = { LIMIT: 1, MARKET: 2 } as const;
export const TimeInForce = { GTC: 1, FOK: 2, IOC: 3, GTX: 4 } as const;

export const EXCHANGE_ACTION_TYPES = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

export function spotDomain(chainId: number): TypedDataDomain {
  return { name: SPOT_DOMAIN_NAME, version: "1", chainId, verifyingContract: ZERO_ADDRESS };
}

/** Strip trailing zeros: "0.4060" -> "0.406", "100.00" -> "100". SoDEX rejects trailing zeros. */
export function normalizeDecimal(x: string | number): string {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) throw new Error(`invalid decimal: ${x}`);
  return n.toString();
}

export interface SpotOrderItem {
  symbolID: number;
  clOrdID: string;
  side: number;
  type: number;
  timeInForce: number;
  price?: string;
  quantity?: string;
  funds?: string;
}

export interface SpotBatchParams {
  accountID: number;
  orders: SpotOrderItem[];
}

/** Build the params object with exact Go field order and omitempty handling. */
export function spotBatchParamsCanonical(params: SpotBatchParams): Record<string, unknown> {
  return {
    accountID: params.accountID,
    orders: params.orders.map((o) => {
      const item: Record<string, unknown> = {
        symbolID: o.symbolID,
        clOrdID: o.clOrdID,
        side: o.side,
        type: o.type,
        timeInForce: o.timeInForce,
      };
      if (o.price !== undefined) item.price = normalizeDecimal(o.price);
      if (o.quantity !== undefined) item.quantity = normalizeDecimal(o.quantity);
      if (o.funds !== undefined) item.funds = normalizeDecimal(o.funds);
      return item;
    }),
  };
}

/** The hashed envelope: { type, params }. Compact JSON, field order preserved. */
export function actionPayloadJson(params: SpotBatchParams): string {
  return JSON.stringify({ type: "batchNewOrder", params: spotBatchParamsCanonical(params) });
}

/** The HTTP request body: params only, no type wrapper. */
export function paramsBodyJson(params: SpotBatchParams): string {
  return JSON.stringify(spotBatchParamsCanonical(params));
}

export function computePayloadHash(json: string): Hex {
  return keccak256(toBytes(json));
}

export type SignTypedDataFn = (args: {
  domain: TypedDataDomain;
  types: typeof EXCHANGE_ACTION_TYPES;
  primaryType: "ExchangeAction";
  message: { payloadHash: Hex; nonce: bigint };
}) => Promise<Hex>;

/** Convert a standard 65-byte EIP-712 signature to SoDEX wire format (0x01 prefix, v -> 0/1). */
export function toWireSignature(sig: Hex): Hex {
  const hex = sig.slice(2);
  if (hex.length !== 130) throw new Error(`expected a 65-byte signature, got ${hex.length / 2} bytes`);
  const r = hex.slice(0, 64);
  const s = hex.slice(64, 128);
  let v = parseInt(hex.slice(128, 130), 16);
  if (v >= 27) v -= 27;
  return `0x01${r}${s}${v.toString(16).padStart(2, "0")}` as Hex;
}

export interface SignedSpotOrder {
  wireSignature: Hex;
  payloadHash: Hex;
  bodyJson: string;
  nonce: number;
  chainId: number;
}

export async function signSpotBatchOrder(opts: {
  params: SpotBatchParams;
  nonce: number;
  chainId: number;
  signTypedData: SignTypedDataFn;
}): Promise<SignedSpotOrder> {
  const payloadHash = computePayloadHash(actionPayloadJson(opts.params));
  const sig = await opts.signTypedData({
    domain: spotDomain(opts.chainId),
    types: EXCHANGE_ACTION_TYPES,
    primaryType: "ExchangeAction",
    message: { payloadHash, nonce: BigInt(opts.nonce) },
  });
  return {
    wireSignature: toWireSignature(sig),
    payloadHash,
    bodyJson: paramsBodyJson(opts.params),
    nonce: opts.nonce,
    chainId: opts.chainId,
  };
}

// Nonce = strictly-increasing millisecond timestamp, monotonic even within the same ms.
let lastNonce = 0;
export function nextNonce(now: number = Date.now()): number {
  lastNonce = Math.max(now, lastNonce + 1);
  return lastNonce;
}
