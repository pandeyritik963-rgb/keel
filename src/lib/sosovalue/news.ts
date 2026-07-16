// Featured news — the grounded "why" behind a flow move.
// Docs: SoSoValue OpenAPI, GET /news/featured. There is no server-side currency filter, so we
// fetch a page and filter by matchedCurrencies client-side.
import { ssvUrl } from "./config";
import { getJson, type SsvResult } from "./http";
import { newsListSchema, type NewsItem } from "./schemas";

export function getFeaturedNews(opts?: { pageNum?: number; pageSize?: number }): Promise<SsvResult<NewsItem[]>> {
  const url = ssvUrl("/news/featured", { pageNum: opts?.pageNum ?? 1, pageSize: opts?.pageSize ?? 40 });
  return getJson(url, newsListSchema);
}

export function filterNewsByCurrency(items: NewsItem[], symbol: string): NewsItem[] {
  const target = symbol.toUpperCase();
  return items.filter((item) => item.currencies.some((c) => c.name.toUpperCase() === target));
}
