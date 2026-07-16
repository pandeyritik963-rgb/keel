// Typed HTTP client for SoDEX public reads. Timeout, retry on transient failures, and zod
// validation. Unwraps the { code, msg, data } envelope (code 0 = success).
import type { z } from "zod";

export type SodexErrorKind = "network" | "timeout" | "rate_limited" | "unauthorized" | "upstream" | "schema";

export interface SodexError {
  kind: SodexErrorKind;
  message: string;
  status?: number;
}

export type SodexResult<T> = { ok: true; data: T; asOf: Date } | { ok: false; error: SodexError };

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const backoffMs = (attempt: number): number => Math.min(250 * 2 ** (attempt - 1), 2000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getJson<T>(
  url: string,
  dataSchema: z.ZodType<T>,
  opts?: { timeoutMs?: number },
): Promise<SodexResult<T>> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: SodexError = { kind: "network", message: "request failed" };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal });
      clearTimeout(timer);

      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: { kind: "unauthorized", message: "SoDEX rejected the request", status: res.status } };
      }
      if (res.status === 429) {
        lastError = { kind: "rate_limited", message: "SoDEX rate limit", status: 429 };
        if (attempt < MAX_RETRIES) { await sleep(backoffMs(attempt)); continue; }
        return { ok: false, error: lastError };
      }
      if (res.status >= 500) {
        lastError = { kind: "upstream", message: `SoDEX ${res.status}`, status: res.status };
        if (attempt < MAX_RETRIES) { await sleep(backoffMs(attempt)); continue; }
        return { ok: false, error: lastError };
      }

      const json: unknown = await res.json().catch(() => null);
      let payload: unknown = json;
      if (json && typeof json === "object" && "code" in json) {
        const env = json as { code: unknown; msg?: string; data?: unknown };
        if (Number(env.code) !== 0) {
          return { ok: false, error: { kind: "upstream", message: env.msg ?? `code ${env.code}`, status: res.status } };
        }
        payload = env.data ?? json;
      }
      if (!res.ok) return { ok: false, error: { kind: "upstream", message: `SoDEX ${res.status}`, status: res.status } };

      const parsed = dataSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, error: { kind: "schema", message: parsed.error.issues[0]?.message ?? "schema mismatch" } };
      }
      return { ok: true, data: parsed.data, asOf: new Date() };
    } catch (err) {
      clearTimeout(timer);
      const aborted = err instanceof Error && err.name === "AbortError";
      lastError = aborted
        ? { kind: "timeout", message: `timed out after ${timeoutMs}ms` }
        : { kind: "network", message: err instanceof Error ? err.message : "network error" };
      if (attempt < MAX_RETRIES) { await sleep(backoffMs(attempt)); continue; }
      return { ok: false, error: lastError };
    }
  }
  return { ok: false, error: lastError };
}
