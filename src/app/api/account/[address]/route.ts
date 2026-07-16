// SoDEX spot account lookup on the execution network (testnet sandbox by default).
// Public read, no signing. Returns the numeric account id needed to build a signed order
// plus current spot balances. A missing account is the normal state for a wallet that has
// not been whitelisted onto the SoDEX testnet — the client renders that honestly.
import { isAddress } from "viem";
import { getExecNetwork, getSpotBalances, getSpotState } from "@/lib/sodex";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) {
    return Response.json({ error: "not a valid EVM address" }, { status: 400 });
  }

  const network = getExecNetwork();
  const [state, balances] = await Promise.all([getSpotState(address), getSpotBalances(address)]);

  if (!state.ok) {
    return Response.json(
      { network, error: state.error.kind, message: state.error.message, status: state.error.status ?? null },
      { status: 502 },
    );
  }

  return Response.json({
    network,
    accountId: state.data.aid,
    balances: balances.ok ? balances.data : null,
    balancesError: balances.ok ? null : balances.error.kind,
    asOf: new Date().toISOString(),
  });
}
