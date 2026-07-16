"use client";

// Pre-trade confirmation and execution for one signal-sized buy. The dialog restates
// everything before asking for a signature: asset, size and the multiplier that produced
// it, the signal's reasons, estimated price and quantity, fee, and the worst case. The
// order is a market buy by funds (IOC) on the SoDEX testnet sandbox, signed EIP-712 in
// the user's wallet — Keel never sees a key and never auto-executes.
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useConnect, useConnectors, useSignTypedData } from "wagmi";
import { Badge, Button, ErrorState, Skeleton } from "@/components/ui";
import { intervalBuyUsd } from "@/lib/core";
import {
  EXCHANGE_ACTION_TYPES,
  OrderSide,
  OrderType,
  TimeInForce,
  nextNonce,
  signSpotBatchOrder,
} from "@/lib/sodex/sign";
import { addBuy, newId, type Plan } from "@/lib/plans";
import { formatMultiplier, formatPrice, formatQty, formatUsd } from "@/lib/format";
import {
  isPriceOk,
  isSymbolOk,
  type AccountApiError,
  type AccountApiOk,
  type OrderApiResult,
  type SignalApiResponse,
} from "@/lib/api/types";

async function fetchAccount(address: string): Promise<AccountApiOk> {
  const res = await fetch(`/api/account/${address}`, { cache: "no-store" });
  const body = (await res.json()) as AccountApiOk | AccountApiError;
  if (!res.ok || "error" in body) {
    const err = body as AccountApiError;
    throw new Error(err.message ?? err.error ?? `account lookup failed (${res.status})`);
  }
  return body;
}

function floorTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.floor(value * f) / f;
}

type Phase = "review" | "signing" | "submitting" | "accepted" | "rejected" | "failed";

export function BuyDialog({ plan, signal, onClose }: { plan: Plan; signal: SignalApiResponse; onClose: () => void }) {
  const connection = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending: connecting } = useConnect();
  const { mutateAsync: signTypedData } = useSignTypedData();

  const [phase, setPhase] = useState<Phase>("review");
  const [failure, setFailure] = useState<string | null>(null);
  const [gateway, setGateway] = useState<OrderApiResult | null>(null);

  const address = connection.status === "connected" ? connection.address : null;
  const account = useQuery({
    queryKey: ["sodex-account", address],
    queryFn: () => fetchAccount(address as string),
    enabled: address !== null,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const flow = signal.flow;
  const priceOk = isPriceOk(signal.price) ? signal.price : null;
  const symbolOk = isSymbolOk(signal.symbol) ? signal.symbol : null;

  const multiplier = flow.state === "ok" ? flow.multiplier : null;
  const buyUsd = multiplier !== null ? intervalBuyUsd(plan.baseUsd, multiplier) : null;
  const estPrice = priceOk ? (priceOk.askPx ?? priceOk.lastPx) : null;
  const qtyPrecision = symbolOk?.quantityPrecision ?? 6;
  const estQty = buyUsd !== null && estPrice !== null && estPrice > 0 ? floorTo(buyUsd / estPrice, qtyPrecision) : null;
  const feeUsd = buyUsd !== null && symbolOk?.takerFee != null ? Math.round(buyUsd * symbolOk.takerFee * 100) / 100 : null;

  const quoteCoin = signal.asset.spotSymbol.split("_")[1] ?? "vUSDC";
  const quoteBalance = account.data?.balances?.find((b) => b.coin === quoteCoin)?.total ?? null;

  const blockers: string[] = [];
  if (flow.state !== "ok") blockers.push("The flow signal is offline, so the buy cannot be sized.");
  if (flow.state === "ok" && flow.insufficientData) blockers.push("Too little flow history — the signal is at its 1.00x fallback. You can still proceed.");
  if (!priceOk) blockers.push("No live SoDEX price; cannot estimate the fill.");
  if (!symbolOk) blockers.push(`Spot market metadata unavailable on ${signal.execution.network}; cannot build the order.`);
  if (buyUsd !== null && symbolOk?.minNotional != null && buyUsd < symbolOk.minNotional) {
    blockers.push(`Buy of ${formatUsd(buyUsd)} is under the market minimum of ${formatUsd(symbolOk.minNotional)}.`);
  }
  if (account.data && quoteBalance !== null && buyUsd !== null && quoteBalance < buyUsd) {
    blockers.push(
      `Your ${signal.execution.network} ${quoteCoin} balance (${formatUsd(quoteBalance)}) is below the buy size. The gateway would reject the order.`,
    );
  }
  const hardBlocked = blockers.some((b) => !b.includes("You can still proceed"));

  const submit = useCallback(async () => {
    if (!address || !account.data || !symbolOk || buyUsd === null || estPrice === null || estQty === null || multiplier === null) return;
    setFailure(null);
    setPhase("signing");
    try {
      const params = {
        accountID: account.data.accountId,
        orders: [
          {
            symbolID: symbolOk.id,
            clOrdID: newId().replace(/-/g, "").slice(0, 32),
            side: OrderSide.BUY,
            type: OrderType.MARKET,
            timeInForce: TimeInForce.IOC,
            funds: buyUsd.toFixed(2),
          },
        ],
      };
      const signed = await signSpotBatchOrder({
        params,
        nonce: nextNonce(),
        chainId: signal.execution.chainId,
        signTypedData: (args) =>
          signTypedData({
            domain: args.domain,
            types: EXCHANGE_ACTION_TYPES,
            primaryType: args.primaryType,
            message: args.message,
          }),
      });

      setPhase("submitting");
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wireSignature: signed.wireSignature,
          nonce: signed.nonce,
          chainId: signed.chainId,
          bodyJson: signed.bodyJson,
        }),
      });
      const body = (await res.json()) as OrderApiResult | { error: string };
      if (!res.ok || "error" in body) {
        setFailure("error" in body ? body.error : `relay failed (${res.status})`);
        setPhase("failed");
        return;
      }
      setGateway(body);
      if (body.accepted) {
        addBuy({
          id: newId(),
          planId: plan.id,
          assetId: plan.assetId,
          tsMs: Date.now(),
          mode: plan.mode,
          multiplier,
          flowScore: flow.state === "ok" ? flow.flowScore : 0,
          reasons: flow.state === "ok" ? flow.reasons : [],
          flowAsOf: flow.state === "ok" ? flow.asOf : null,
          baseUsd: plan.baseUsd,
          buyUsd,
          estPrice,
          estQty,
          naiveQty: plan.baseUsd / estPrice,
          feeUsd,
          network: signal.execution.network,
          clOrdId: params.orders[0].clOrdID,
          gatewayStatus: body.gatewayStatus,
          accepted: true,
        });
        setPhase("accepted");
      } else {
        setPhase("rejected");
      }
    } catch (err) {
      setFailure(err instanceof Error ? err.message.split("\n")[0] : "signing failed");
      setPhase("failed");
    }
  }, [address, account.data, symbolOk, buyUsd, estPrice, estQty, multiplier, feeUsd, flow, plan, signal.execution, signTypedData]);

  const line = "flex items-baseline justify-between gap-4 border-b border-border py-2 text-body";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Confirm ${signal.asset.symbol} buy`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lead font-semibold text-foreground">Confirm buy — {signal.asset.name}</h2>
            <p className="mt-0.5 text-micro text-faint">Nothing executes until you sign. Keel never holds keys.</p>
          </div>
          <Badge variant="warn">testnet sandbox · no real funds</Badge>
        </div>

        {(phase === "review" || phase === "signing" || phase === "submitting" || phase === "failed") && (
          <>
            <div className="flex flex-col">
              <div className={line}>
                <span className="text-muted">Asset / market</span>
                <span className="font-mono font-semibold text-foreground">
                  {signal.asset.symbol} · {signal.asset.spotSymbol}
                </span>
              </div>
              <div className={line}>
                <span className="text-muted">Order</span>
                <span className="font-semibold text-foreground">market buy by funds, IOC</span>
              </div>
              <div className={line}>
                <span className="text-muted">Size</span>
                <span className="font-mono font-semibold text-foreground">
                  {buyUsd !== null ? formatUsd(buyUsd) : "—"}{" "}
                  <span className="font-sans font-normal text-faint">
                    = {formatUsd(plan.baseUsd)} base × {multiplier !== null ? formatMultiplier(multiplier) : "—"}
                  </span>
                </span>
              </div>
              <div className={line}>
                <span className="text-muted">Why this size</span>
                <span className="max-w-[60%] text-right text-micro text-muted">
                  {flow.state === "ok" ? flow.reasons[0] : "signal offline"}
                </span>
              </div>
              <div className={line}>
                <span className="text-muted">Est. price / quantity</span>
                <span className="font-mono text-foreground">
                  {estPrice !== null ? formatPrice(estPrice, { adaptive: true }) : "—"} ·{" "}
                  {estQty !== null ? formatQty(estQty, { unit: signal.asset.symbol, dp: Math.min(qtyPrecision, 6) }) : "—"}
                </span>
              </div>
              <div className={line}>
                <span className="text-muted">Est. taker fee</span>
                <span className="font-mono text-foreground">{feeUsd !== null ? formatUsd(feeUsd) : "—"}</span>
              </div>
              <div className="py-2 text-micro text-faint">
                Worst case: you spend exactly {buyUsd !== null ? formatUsd(buyUsd) : "the shown funds"} of {quoteCoin}; a
                worse fill price means less {signal.asset.symbol} than the estimate, and any unfillable remainder is
                canceled (IOC). Estimates from SoDEX ask price{priceOk ? ` as of ${priceOk.asOf.slice(11, 19)} UTC` : ""}.
              </div>
            </div>

            {blockers.length > 0 && (
              <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-body text-warn">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}

            {address === null ? (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  disabled={connecting || connectors.length === 0}
                  onClick={() => connectors[0] && connect({ connector: connectors[0] })}
                >
                  {connecting ? "Connecting…" : "Connect wallet to continue"}
                </Button>
                {connectors.length === 0 && <span className="text-micro text-faint">No injected wallet detected.</span>}
              </div>
            ) : account.isPending ? (
              <div className="mt-4">
                <Skeleton className="h-9 w-56" />
                <p className="mt-1 text-micro text-faint">Looking up your SoDEX {signal.execution.network} account…</p>
              </div>
            ) : account.isError ? (
              <div className="mt-4">
                <ErrorState
                  message="No SoDEX testnet account for this wallet"
                  detail={`${account.error.message}. The testnet write path is whitelist-gated: the wallet must be provisioned on testnet-gw.sodex.dev before it can trade.`}
                />
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-micro text-faint">
                  Account #{account.data.accountId} · {quoteCoin}{" "}
                  {quoteBalance !== null ? formatUsd(quoteBalance) : "balance unavailable"}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button disabled={hardBlocked || phase === "signing" || phase === "submitting"} onClick={submit}>
                    {phase === "signing" ? "Waiting for signature…" : phase === "submitting" ? "Submitting…" : "Sign and submit"}
                  </Button>
                </div>
              </div>
            )}

            {phase === "failed" && failure && (
              <div className="mt-3">
                <ErrorState message="Buy not executed" detail={`${failure}. Nothing was signed away — you can retry or cancel.`} />
              </div>
            )}
          </>
        )}

        {phase === "accepted" && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-foreground">
              Order accepted by the SoDEX {signal.execution.network} gateway (HTTP {gateway?.gatewayStatus}). Recorded{" "}
              <span className="font-mono font-semibold">{formatUsd(buyUsd)}</span> at est.{" "}
              <span className="font-mono">{estPrice !== null ? formatPrice(estPrice, { adaptive: true }) : "—"}</span>.
            </p>
            <p className="text-micro text-faint">
              The portfolio marks this at the submitted estimate; actual fill can differ within the IOC terms above.
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        )}

        {phase === "rejected" && (
          <div className="flex flex-col gap-3">
            <ErrorState
              message={`Gateway rejected the order (HTTP ${gateway?.gatewayStatus})`}
              detail={`${JSON.stringify(gateway?.body).slice(0, 300)} — nothing was recorded. Common causes on testnet: wallet not whitelisted or insufficient ${quoteCoin}.`}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => setPhase("review")}>Back to review</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
