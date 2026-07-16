// SoDEX spot account reads. Address-keyed public reads on the execution network (testnet by
// default). No signing required. The account id (aid) is needed to build a signed order.
import { getExecNetwork, spotUrl } from "./config";
import { getJson, type SodexResult } from "./http";
import { spotBalancesSchema, spotStateSchema, type SpotBalance, type SpotState } from "./schemas";

export function getSpotState(address: string, accountID?: number): Promise<SodexResult<SpotState>> {
  return getJson(spotUrl(`/accounts/${address}/state`, { accountID }, getExecNetwork()), spotStateSchema);
}

export function getSpotBalances(address: string, accountID?: number): Promise<SodexResult<SpotBalance[]>> {
  return getJson(spotUrl(`/accounts/${address}/balances`, { accountID }, getExecNetwork()), spotBalancesSchema);
}
