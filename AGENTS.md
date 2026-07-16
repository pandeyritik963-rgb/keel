<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Keel — build constitution

Keel in one line: flow-driven smart DCA. Accumulate BTC/ETH on a schedule, but the brain
sizes each buy from live SoSoValue institutional ETF flows. SoSoValue is the brain; SoDEX is
the hands. Market data is mainnet-real; execution is non-custodial and testnet-sandboxed.

This governs every action while building Keel. The rules are enforced, not decorative. This
document follows its own anti-slop rules: no emojis, no filler, concrete checks only.

Framework note: this repo runs Next.js 15.5 (App Router) / React 19 / Tailwind 4. It is a
fresh, standalone codebase — it shares no code with any other project.

## The six non-negotiables

1. SoSoValue is the load-bearing wall. Per feature: "if I delete every SoSoValue call, does
   this still have a reason to exist?" If yes, route it through SoSoValue or cut it.
   Disconnecting the key must break the signal loudly (empty/error state), never a mock.
2. Real data or stop. No mock, stub, hardcoded, random, or silently-stale financial value in
   any path a user can reach. Every number traces to a live API/on-chain read at runtime. If
   an upstream is down, render an explicit "data unavailable — as of <ts>" state.
3. Every financial value is deterministic and unit-tested. The buy multiplier, cost basis,
   backtest, and every $/%/x figure are computed in a framework-free, unit-tested core —
   never inside an LLM. The LLM only narrates verified numbers, with provenance + a caveat.
   No price predictions, no "buy now", no guaranteed returns.
4. Non-custodial by construction. Never take, store, log, or transmit private keys or seed
   phrases. All signing is client-side via the user's wallet. Every buy passes an explicit
   pre-trade confirmation restating asset, size, multiplier + reason, est. price, fees, and
   worst case before signing. Never auto-execute. Default SoDEX to testnet-sandbox; mainnet
   real-funds only behind an unmistakable real-funds banner.
5. Five states before the happy path, on every data surface: loading, empty (with next
   action), error (specific cause + recovery, never "something went wrong"), stale (last
   value + "as of <ts>"), populated. Every money/risk number carries unit + timeframe +
   provenance inline.
6. Done = demoable end-to-end, verified by running it. A task is done only when it runs
   against real APIs with every failure path handled, is reachable from the real UI, and you
   actually ran it. "Compiles" is not done. `main` is always demoable.

## The wedge (build this deep before any breadth)

See today's signal (no wallet) → set a plan (asset, base amount, cadence, contrarian|momentum
mode) → each interval the brain computes a buy multiplier + rationale from SoSoValue flows →
confirm → sign → SoDEX spot buy (sandboxed) → portfolio tracks cost basis vs naive DCA (the
proof) → "what changed since last visit."

Thesis is user-selectable per plan; default is Contrarian (buy more on outflows/fear, less on
euphoria). Momentum inverts it (buy more on inflows).

## Anti-slop

Banned in all user-facing text/code/commits: seamless, effortless, unlock, unleash, empower,
revolutionize, leverage, robust, comprehensive, elevate, supercharge, one-stop, delve, "the
power of", "it's not just X, it's Y", rhetorical-question openers. Zero emojis in UI/README/
comments/commits. Name the actual index, endpoint, number. No "coming soon", no disabled
buttons, no charts seeded with random data.

## Verified facts (do not re-guess)

SoSoValue OpenAPI (confirmed usable):
- Base `https://openapi.sosovalue.com/openapi/v1`, header `x-soso-api-key`, ~20 req/min.
- ETF flows: `GET /etfs/summary-history` (params `symbol`, `country_code=US`, `limit<=300`;
  fields `date`, `total_net_inflow` = daily USD net (negative = outflow), `total_net_assets`
  = AUM, `cum_net_inflow`). Supported flow symbols include BTC, ETH, SOL, XRP, AVAX, DOGE,
  LINK, LTC, HBAR; unsupported symbols return HTTP 400 (render as honest empty).
- News: `GET /news/featured` (`pageNum`, `pageSize`); filter client-side by matchedCurrencies.
- No sentiment/fear-greed endpoint is confirmed — the brain uses flows (+ news) only until one
  is verified live.

SoDEX (ValueChain):
- REST mainnet `https://mainnet-gw.sodex.dev`, testnet `https://testnet-gw.sodex.dev`, prefix
  `/api/v1`. Spot under `/api/v1/spot`; spot balances/state are public reads (no signing).
- EIP-712 signing seen for perps uses domain name="futures", ExchangeAction(bytes32
  payloadHash, uint64 nonce), wire sig prefixed 0x01, chainId 138565 (testnet) / 286623
  (mainnet). THE SPOT ORDER PATH IS UNVERIFIED: confirm the spot EIP-712 domain, order struct,
  and endpoint against SoDEX's live spot docs/SDK before wiring execution. Until verified,
  execution stays sandboxed.
- Testnet write path is whitelist-gated; public reads (market data, balances) work without it.

Stack: Next.js 15.5 App Router + TypeScript + Tailwind v4 (@theme tokens) + wagmi/viem
(wallet + EIP-712) + dnum (decimal-safe money) + zod (all external responses) + vitest. Deploy
Vercel. Keep the deterministic core free of framework/network deps so it is trivially testable.

## Definition of done (single gate)

- [ ] Runs against real API/chain; no mock/hardcoded financial value in the path.
- [ ] All five UI states exist.
- [ ] Survives empty/slow/429 gracefully.
- [ ] Every number deterministically computed + unit-tested, carries unit/timeframe/provenance.
- [ ] Any buy is behind explicit confirmation; non-custodial; testnet-gated.
- [ ] Reachable from the real UI; you ran it and observed the output.
- [ ] `docs/CLAIMS.md` updated for any new user-facing claim.
- [ ] Diff passes the anti-slop grep + banned-lexicon/emoji check.
