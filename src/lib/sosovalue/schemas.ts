// zod schemas for the SoSoValue responses we consume. Numerics are coerced (the API sometimes
// sends numbers as strings). The list helper accepts either a bare array or a { list: [...] }
// envelope, which SoSoValue uses inconsistently across endpoints.
import { z } from "zod";

const listOf = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess(
    (v) => (v && typeof v === "object" && Array.isArray((v as { list?: unknown[] }).list) ? (v as { list: unknown[] }).list : v),
    z.array(item),
  );

// --- ETF flows: GET /etfs/summary-history ---
export const etfSummaryRecordSchema = z.object({
  date: z.string(),
  total_net_inflow: z.coerce.number(),
  total_value_traded: z.coerce.number().optional(),
  total_net_assets: z.coerce.number().optional(),
  cum_net_inflow: z.coerce.number().optional(),
});
export const etfSummaryHistorySchema = listOf(etfSummaryRecordSchema);
export type EtfSummaryRecord = z.infer<typeof etfSummaryRecordSchema>;

// --- Featured news: GET /news/featured ---
const rawNewsItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    sourceLink: z.string().optional().default(""),
    releaseTime: z.coerce.number().optional().default(0),
    matchedCurrencies: z
      .array(z.object({ name: z.string().optional().default(""), fullName: z.string().optional().default("") }))
      .optional()
      .default([]),
    multilanguageContent: z
      .array(z.object({ language: z.string().optional(), title: z.string().optional(), content: z.string().optional() }))
      .optional()
      .default([]),
  })
  .transform((raw) => {
    const en = raw.multilanguageContent.find((c) => (c.language ?? "").toLowerCase().startsWith("en")) ?? raw.multilanguageContent[0];
    return {
      id: raw.id,
      title: en?.title?.trim() ?? "",
      content: en?.content?.trim() ?? "",
      sourceLink: raw.sourceLink,
      releaseTime: raw.releaseTime,
      currencies: raw.matchedCurrencies.map((c) => ({ name: c.name, fullName: c.fullName })),
    };
  });

export const newsListSchema = listOf(rawNewsItemSchema);
export type NewsItem = z.infer<typeof rawNewsItemSchema>;
