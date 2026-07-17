# Keel — user-facing claims and their basis

Every claim a user can read in the product, with where it comes from and what would make
it false. If a claim's basis breaks, the claim must be removed or reworded in the same
change.

## Data and signal

| Claim (where) | Basis | Breaks if |
| --- | --- | --- |
| "sizes each buy from live SoSoValue institutional ETF flows" (home, layout metadata) | `getFlowSignal` reads `GET /etfs/summary-history` at request time; no fallback data exists. Without a key the UI says "Signal offline". | SoSoValue endpoint or field semantics change. |
| "Latest ETF net flow ±$N on DATE" (signal reasons) | `total_net_inflow` of the newest row of `/etfs/summary-history`, negative = outflow. | Field renamed or unit changes. |
| Buy multiplier "0.50x–2.00x on your base amount" (cards, plan form, dialog) | `computeSignal` in `src/lib/core/signal.ts`, clamped to `[0.5, 2]`; unit-tested in `signal.test.ts`. | Config defaults change without updating copy. |
| Factor breakdown values and weights (asset page) | `SignalResult.factors` and `DEFAULT_SIGNAL_CONFIG.weights` rendered verbatim. | Weights change in code but not on the page (they render from the same constant, so only a copy fork breaks this). |
| Prices "live from SoDEX mainnet" (header badge, cards) | `GET /api/v1/spot/markets/tickers` on `mainnet-gw.sodex.dev` per request; failure renders "price unavailable". | SoDEX gateway URL or envelope changes. |
| ETF flow chart (asset page) | One SVG bar per real row of the flow series; no interpolation. | — |
| "Replay vs naive DCA" numbers (asset page) | `backtest` in `src/lib/core/backtest.ts` (causal, unit-tested) over flows joined with SoDEX daily closes on UTC date; only matched days replayed, count shown. | Either series unavailable (renders offline/insufficient state instead). |
| "Historical replay, not a prediction" caveat | Required wording next to every backtest figure. | Removing it violates the build constitution. |
| "Since your last visit" strip (home) | Diff between the localStorage snapshot written on the previous visit and today's live render; shown only when a prior snapshot exists. | — |

## Custody and execution

| Claim (where) | Basis | Breaks if |
| --- | --- | --- |
| "Keel never holds your keys" / "never takes custody" (home, footer, dialog) | No key material is ever requested, stored, logged, or transmitted; signing is `signTypedData` in the user's wallet. The order relay (`/api/orders`) receives only the signed envelope. | Any code path accepts a private key or seed phrase. |
| "You sign every buy" / "Nothing executes until you sign" (home, dialog) | Orders are built only inside `BuyDialog` after an explicit button press; there is no scheduled or server-side execution path. | Any auto-execution is added. |
| "testnet sandbox — no real funds" (header tooltip, dialog badge, footer) | `SODEX_NETWORK` defaults to testnet; `/api/orders` refuses to forward when the execution network is mainnet. | The mainnet refusal in `src/app/api/orders/route.ts` is lifted without adding a real-funds confirmation surface. |
| Pre-trade restatement (dialog): size = base × multiplier, est. price, est. qty, fee, worst case | Size from `intervalBuyUsd` (unit-tested); est. price = live SoDEX ask; qty floored to the market's `quantityPrecision`; fee = `takerFee × funds` from live symbol metadata; worst-case wording matches market-by-funds IOC semantics. | Order type changes without updating the worst-case text. |
| "The portfolio marks this at the submitted estimate" (dialog, portfolio) | Recorded quantity is the submit-time estimate, labeled "est. fills"; Keel does not yet read back actual fills. | Copy dropped while estimates are still used. |
| EIP-712 signing scheme (not user-visible, but load-bearing) | Ported from `github.com/sodex-tech/sodex-go-sdk-public`: domain name `"spot"`, `ExchangeAction(bytes32 payloadHash, uint64 nonce)`, wire sig `0x01 + r + s + v(0/1)`; round-trip unit tests in `sign.test.ts`. | SoDEX rotates the signing scheme. |

## Storage and privacy

| Claim (where) | Basis | Breaks if |
| --- | --- | --- |
| "Plans and buy history are stored in this browser only" (plans page, plan form) | `localStorage` keys `keel.plans.v1` / `keel.buys.v1`; no server persistence of plans exists. | A server-side plan store is added. |
| "Keel has no server account" (plans page) | There is no auth, no database, no user table. | Accounts are introduced. |

## README

| Claim (where) | Basis | Breaks if |
| --- | --- | --- |
| Worked example "BTC +$181.08M → 0.92x steady; ETH +$58.34M → 0.78x ease off, 2026-07-16" (README, How the signal works) | Observed output of `computeSignal` against live SoSoValue data in a dev run on that date; consistent with the documented mapping (0.92x ⇒ score +0.16 = low conviction, 0.78x ⇒ +0.44 = moderate). | The default config's weights/clamps change, making the cited mapping impossible — update the example in the same change. |
| "35 unit tests" (README, Testing and CI) | `vitest run` at the time of writing. | The suite grows or shrinks; refresh the number when touching that section. CI badge is the live source of truth. |
| Comparison table row "Typical AI trading bots — opaque model output, often custodial" (README, Why Keel) | Describes the category generically; no competitor is named. | — |
| "The production build must pass with zero API keys" (README, Honesty as a feature) | `.github/workflows/ci.yml` runs `npm run build` with no secrets configured. | Keys are added to CI or the build starts requiring them. |

## Legal-adjacent

| Claim (where) | Basis |
| --- | --- |
| "Not financial advice." (footer) | Blanket disclaimer; product contains no price predictions or buy/sell recommendations — stances ("accumulate more" / "ease off") describe what the user's own chosen thesis does with the flow data. |
