// SoSoValue OpenAPI configuration. The API key is server-only and never bundled to the client.
// When the key is absent, isConfigured() is false so the UI shows an honest "connect key"
// state instead of any mock data.
const DEFAULT_BASE = "https://openapi.sosovalue.com/openapi/v1";

export const AUTH_HEADER = "x-soso-api-key";

export function getBaseUrl(): string {
  const raw = process.env.SOSOVALUE_API_BASE?.trim();
  return (raw && raw.length ? raw : DEFAULT_BASE).replace(/\/+$/, "");
}

export function getApiKey(): string {
  return process.env.SOSOVALUE_API_KEY?.trim() ?? "";
}

export function isConfigured(): boolean {
  return getApiKey().length > 0;
}

export function getRateLimitPerMin(): number {
  return Number(process.env.SOSOVALUE_RATE_LIMIT_PER_MIN) || 20;
}

type ParamValue = string | number | undefined | null;

export function ssvUrl(path: string, params?: Record<string, ParamValue>): string {
  const base = getBaseUrl();
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
