// One typed HTTP client for SoSoValue. Every call has a timeout, retries transient failures
// with backoff, surfaces 401/403/429 explicitly, unwraps the { code, data, msg } envelope, and
// validates the payload with zod so a changed/malformed response fails loud, not silent.
import type { z } from "zod";
import { AUTH_HEADER, getApiKey, getRateLimitPerMin } from "./config";
import { SlidingWindowLimiter } from "./ratelimit";

export type SsvErrorKind =
  | "not_configured"
  | "network"
  | "timeout"
  | "rate_limited"
  | "unauthorized"
  | "upstream"
  | "schema";

export interface SsvError {
  kind: SsvErrorKind;
  message: string;
  status?: number;
  retryAfterMs?: number;
}

export type SsvResult<T> = { ok: true; data: T; asOf: Date } | { ok: false; error: SsvError };

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;

let limiter: SlidingWindowLimiter | null = null;
function getLimiter(): SlidingWindowLimiter {
  if (!limiter) limiter = new SlidingWindowLimiter(getRateLimitPerMin());
  return limiter;
}

const backoffMs = (attempt: number): number => Math.min(400 * 2 ** (attempt - 1), 3000);

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return secs * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

export async function getJson<T>(
  url: string,
  dataSchema: z.ZodType<T>,
  opts?: { timeoutMs?: number },
): Promise<SsvResult<T>> {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, error: { kind: "not_configured", message: "SOSOVALUE_API_KEY is not set" } };

  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: SsvError = { kind: "network", message: "request failed" };

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    await getLimiter().acquire();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json", [AUTH_HEADER]: apiKey },
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: { kind: "unauthorized", message: "SoSoValue rejected the API key", status: res.status } };
      }
      if (res.status === 429) {
        lastError = { kind: "rate_limited", message: "SoSoValue rate limit", status: 429, retryAfterMs: parseRetryAfter(res.headers.get("retry-after")) };
        if (attempt <= MAX_RETRIES) { await sleep(lastError.retryAfterMs ?? backoffMs(attempt)); continue; }
        return { ok: false, error: lastError };
      }
      if (res.status >= 500) {
        lastError = { kind: "upstream", message: `SoSoValue ${res.status}`, status: res.status };
        if (attempt <= MAX_RETRIES) { await sleep(backoffMs(attempt)); continue; }
        return { ok: false, error: lastError };
      }

      const json: unknown = await res.json().catch(() => null);
      let payload: unknown = json;
      if (json && typeof json === "object" && "code" in json) {
        const env = json as { code: unknown; data?: unknown; msg?: string };
        const code = Number(env.code);
        if (code !== 0) {
          return { ok: false, error: { kind: "upstream", message: env.msg ?? `code ${env.code}`, status: res.status } };
        }
        payload = env.data ?? json;
      }
      if (!res.ok) {
        return { ok: false, error: { kind: "upstream", message: `SoSoValue ${res.status}`, status: res.status } };
      }

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
      if (attempt <= MAX_RETRIES) { await sleep(backoffMs(attempt)); continue; }
      return { ok: false, error: lastError };
    }
  }
  return { ok: false, error: lastError };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
