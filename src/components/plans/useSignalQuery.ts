"use client";

// Shared client fetch of /api/signal/[assetId]. One cache entry per (asset, mode) —
// the plan cards and the portfolio rows reuse the same live read.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { SignalApiResponse } from "@/lib/api/types";
import type { ThesisMode } from "@/lib/core";

async function fetchSignal(assetId: string, mode: ThesisMode): Promise<SignalApiResponse> {
  const res = await fetch(`/api/signal/${assetId}?mode=${mode}`, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `signal request failed (${res.status})`);
  }
  return (await res.json()) as SignalApiResponse;
}

export function useSignalQuery(assetId: string, mode: ThesisMode): UseQueryResult<SignalApiResponse> {
  return useQuery({
    queryKey: ["signal", assetId, mode],
    queryFn: () => fetchSignal(assetId, mode),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
