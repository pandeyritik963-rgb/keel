// Relay for a wallet-signed SoDEX spot order. The browser cannot POST to the gateway
// directly (CORS), so this route forwards the already-signed envelope. It holds no key
// and can alter nothing: the payload hash is signed, so any tampering here would make
// the gateway reject the order. Execution is pinned to the testnet sandbox — a mainnet
// submission is refused until a real-funds confirmation surface exists.
import { z } from "zod";
import { CHAIN_IDS, buildSpotOrderSubmission, getExecNetwork, sendSpotOrder } from "@/lib/sodex";
import type { Hex } from "viem";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  wireSignature: z.string().regex(/^0x01[0-9a-fA-F]{130}$/, "expected 0x01-prefixed 66-byte wire signature"),
  nonce: z.number().int().positive(),
  chainId: z.number().int().positive(),
  bodyJson: z.string().max(10_000),
});

// The relay only forwards batchNewOrder params; anything else is rejected.
const paramsShapeSchema = z.object({
  accountID: z.number().int(),
  orders: z
    .array(
      z.object({
        symbolID: z.number().int(),
        clOrdID: z.string().min(1),
        side: z.number().int(),
        type: z.number().int(),
        timeInForce: z.number().int(),
        price: z.string().optional(),
        quantity: z.string().optional(),
        funds: z.string().optional(),
      }),
    )
    .min(1)
    .max(1),
});

export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 400 });
  }

  const network = getExecNetwork();
  if (network !== "testnet") {
    return Response.json(
      { error: "order relay is pinned to the testnet sandbox; mainnet execution is not enabled" },
      { status: 400 },
    );
  }
  if (parsed.data.chainId !== CHAIN_IDS[network]) {
    return Response.json(
      { error: `signature chainId ${parsed.data.chainId} does not match ${network} (${CHAIN_IDS[network]})` },
      { status: 400 },
    );
  }

  let params: unknown;
  try {
    params = JSON.parse(parsed.data.bodyJson);
  } catch {
    return Response.json({ error: "bodyJson is not valid JSON" }, { status: 400 });
  }
  if (!paramsShapeSchema.safeParse(params).success) {
    return Response.json({ error: "bodyJson is not a single-order batchNewOrder payload" }, { status: 400 });
  }

  const submission = buildSpotOrderSubmission(
    {
      wireSignature: parsed.data.wireSignature as Hex,
      payloadHash: "0x" as Hex, // not part of the wire request; the gateway recomputes it
      bodyJson: parsed.data.bodyJson,
      nonce: parsed.data.nonce,
      chainId: parsed.data.chainId,
    },
    { network },
  );

  try {
    const result = await sendSpotOrder(submission);
    // The gateway wraps rejections in HTTP 200 with a { code != 0, error } envelope,
    // so HTTP success alone must never count as acceptance.
    const envelope = result.body as { code?: unknown; error?: unknown } | null;
    const envelopeCode = envelope && typeof envelope === "object" && "code" in envelope ? Number(envelope.code) : 0;
    return Response.json(
      { network, gatewayStatus: result.status, accepted: result.ok && envelopeCode === 0, body: result.body },
      { status: 200 },
    );
  } catch (err) {
    return Response.json(
      { network, error: "gateway unreachable", message: err instanceof Error ? err.message : "network error" },
      { status: 502 },
    );
  }
}
