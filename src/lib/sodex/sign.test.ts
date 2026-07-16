import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress, type Hex } from "viem";
import {
  EXCHANGE_ACTION_TYPES,
  actionPayloadJson,
  paramsBodyJson,
  signSpotBatchOrder,
  spotDomain,
  toWireSignature,
  type SpotBatchParams,
} from "./sign";

const TEST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;
const account = privateKeyToAccount(TEST_KEY);
const CHAIN_ID = 138565; // testnet

// A DCA market buy: spend 100 USDC of BTC (funds-denominated market buy).
const marketBuy: SpotBatchParams = {
  accountID: 12345,
  orders: [{ symbolID: 1, clOrdID: "keel-1", side: 1, type: 2, timeInForce: 3, funds: "100" }],
};

describe("spot canonical JSON", () => {
  it("matches the Go struct field order with the type/params envelope", () => {
    expect(actionPayloadJson(marketBuy)).toBe(
      '{"type":"batchNewOrder","params":{"accountID":12345,"orders":[{"symbolID":1,"clOrdID":"keel-1","side":1,"type":2,"timeInForce":3,"funds":"100"}]}}',
    );
  });

  it("HTTP body is params only, no type wrapper", () => {
    expect(paramsBodyJson(marketBuy)).toBe(
      '{"accountID":12345,"orders":[{"symbolID":1,"clOrdID":"keel-1","side":1,"type":2,"timeInForce":3,"funds":"100"}]}',
    );
  });

  it("strips trailing zeros and keeps limit-order field order", () => {
    const limit: SpotBatchParams = {
      accountID: 1,
      orders: [{ symbolID: 1, clOrdID: "a", side: 1, type: 1, timeInForce: 1, price: "0.4060", quantity: "1.000" }],
    };
    expect(actionPayloadJson(limit)).toContain('"price":"0.406","quantity":"1"');
  });
});

describe("spot signing round-trip", () => {
  it("produces a wire signature that recovers to the signer", async () => {
    const nonce = 1_720_000_000_000;
    const signed = await signSpotBatchOrder({
      params: marketBuy,
      nonce,
      chainId: CHAIN_ID,
      signTypedData: (args) => account.signTypedData(args),
    });

    expect(signed.wireSignature).toMatch(/^0x01[0-9a-f]{130}$/);

    // reconstruct the standard 65-byte signature from the wire format and recover the address
    const wire = signed.wireSignature.slice(4); // drop 0x01
    const r = wire.slice(0, 64);
    const s = wire.slice(64, 128);
    const v = parseInt(wire.slice(128, 130), 16) + 27;
    const sig65 = `0x${r}${s}${v.toString(16).padStart(2, "0")}` as Hex;

    const recovered = await recoverTypedDataAddress({
      domain: spotDomain(CHAIN_ID),
      types: EXCHANGE_ACTION_TYPES,
      primaryType: "ExchangeAction",
      message: { payloadHash: signed.payloadHash, nonce: BigInt(nonce) },
      signature: sig65,
    });
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("binds the signature to the nonce (replay changes the digest)", async () => {
    const sign = (nonce: number) =>
      signSpotBatchOrder({ params: marketBuy, nonce, chainId: CHAIN_ID, signTypedData: (a) => account.signTypedData(a) });
    const a = await sign(1);
    const b = await sign(2);
    expect(a.wireSignature).not.toBe(b.wireSignature);
  });
});

describe("toWireSignature", () => {
  it("rejects malformed signatures", () => {
    expect(() => toWireSignature("0x1234" as Hex)).toThrow();
  });
});
