# Keel

Flow-driven smart DCA. Keel accumulates BTC and ETH on a schedule, but sizes each buy from
live SoSoValue institutional ETF flows: under the default contrarian thesis it buys more on
outflow days and less on inflow days (momentum inverts this, per plan). SoSoValue is the
brain; SoDEX is the hands. Market data is mainnet-real; execution is non-custodial and
sandboxed on the SoDEX testnet.

## What works today

- Signal board (`/`): per-asset buy multiplier computed from `GET /etfs/summary-history`
  (SoSoValue), with live SoDEX mainnet spot prices. No wallet needed.
- Asset detail (`/assets/btc`, `/assets/eth`): factor breakdown (magnitude, streak, trend),
  the raw flow series charted, a causal replay of flow-weighted DCA against naive DCA over
  joined flow+price history, matched news, and plan creation. Thesis toggle per page.
- Plans (`/plans`): browser-local DCA plans (base amount, daily/weekly/biweekly cadence,
  contrarian or momentum). Each due buy opens a confirmation restating asset, size
  (base × multiplier), the signal's reasons, estimated price/quantity, taker fee, and the
  worst case — then the order is EIP-712-signed in your wallet and submitted to the SoDEX
  testnet spot gateway. Accepted buys feed a portfolio that tracks your cost basis against
  the naive-DCA counterfactual.
- "Since your last visit": multiplier and price changes against the snapshot from your
  previous visit.

Every financial number is computed in a framework-free, unit-tested core
(`src/lib/core`) and carries unit, timeframe, and provenance in the UI. If an upstream is
down or unconfigured, the surface says so — there is no mock data anywhere.

## Run it

```bash
npm install
cp .env.example .env.local   # add SOSOVALUE_API_KEY for the signal; prices work without it
npm run dev
```

- `SOSOVALUE_API_KEY` — required for flows/news (the signal renders an explicit offline
  state without it). ~20 requests/min; responses are cached server-side for 10 minutes.
- SoDEX market data needs no key. Order submission targets the testnet sandbox and its
  write path is whitelist-gated; un-provisioned wallets get an honest rejection.

## Checks

```bash
npm run test        # vitest — deterministic core, signing, formatting
npm run typecheck
npm run lint
npm run build
```

## Structure

- `src/lib/core` — signal engine, plan math, backtest, cadence math. Pure, no framework,
  no network. All money math that reaches the UI starts here.
- `src/lib/sosovalue` + `src/lib/flows` — SoSoValue client (zod-validated, rate-limited)
  and the cached flow/news layer.
- `src/lib/sodex` — SoDEX spot client: public market/account reads, EIP-712 spot order
  signing (ported from the official Go SDK), order submission.
- `src/lib/plans` — browser-local plan/buy store (zod-validated localStorage).
- `src/app/api` — signal/account reads and the order relay (forwards a wallet-signed
  envelope; holds no keys; refuses mainnet).
- `docs/CLAIMS.md` — every user-facing claim and what would falsify it.

Non-custodial by construction: private keys never touch Keel. All signing happens in the
user's wallet; the server only relays signed payloads.
