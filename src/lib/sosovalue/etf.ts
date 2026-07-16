// ETF spot flows — the institutional signal that drives Keel's multiplier.
// Docs: SoSoValue OpenAPI, GET /etfs/summary-history.
import { ssvUrl } from "./config";
import { getJson, type SsvResult } from "./http";
import { etfSummaryHistorySchema, type EtfSummaryRecord } from "./schemas";

export function getEtfSummaryHistory(
  symbol: string,
  opts?: { countryCode?: "US" | "HK"; limit?: number; startDate?: string; endDate?: string },
): Promise<SsvResult<EtfSummaryRecord[]>> {
  const url = ssvUrl("/etfs/summary-history", {
    symbol,
    country_code: opts?.countryCode ?? "US",
    limit: opts?.limit ?? 60,
    start_date: opts?.startDate,
    end_date: opts?.endDate,
  });
  return getJson(url, etfSummaryHistorySchema);
}
