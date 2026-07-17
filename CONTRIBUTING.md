# Contributing to Keel

Keel is built under a strict constitution — read [AGENTS.md](AGENTS.md) before writing
code. The short version of what gets a change merged:

## The gate (definition of done)

Every change must clear all of these; they are enforced in review, not aspirational:

- Runs against the real APIs. No mock, stub, hardcoded, or randomly generated financial
  value in any path a user can reach. If an upstream is down, the surface says so.
- Every data surface has five states: loading, empty (with a next action), error (specific
  cause and recovery), stale (last value with "as of" timestamp), populated.
- Every dollar, percent, and multiplier is computed in `src/lib/core` (framework-free,
  network-free) and unit-tested. UI components render results; they never do money math.
- Any buy stays behind an explicit confirmation, non-custodial, testnet-gated.
- New user-facing claims get a row in [docs/CLAIMS.md](docs/CLAIMS.md): the claim, its
  basis, and what would falsify it.
- Zero emojis and none of the banned lexicon (see AGENTS.md) in UI text, comments,
  commits, or docs.

## Checks

```bash
npm run test        # vitest
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # must pass with no API keys configured
```

CI runs the same four on every push and pull request.

## Practical notes

- SoDEX market data needs no key; SoSoValue needs `SOSOVALUE_API_KEY` in `.env.local`
  (copy `.env.example`). Both offline paths must keep working — test your feature with
  the key removed.
- Verified upstream facts (endpoints, signing scheme, chain ids) live in AGENTS.md under
  "Verified facts". If you verify something new against live docs or an official SDK,
  record it there in the same change.
- Adding an asset is one row in `src/lib/assets/catalog.ts`, but only if it has both a
  SoSoValue flow symbol and a SoDEX spot market.
