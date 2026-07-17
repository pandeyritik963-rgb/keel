# Security

## Trust model

Keel is non-custodial by construction. The invariants:

- No code path requests, stores, logs, or transmits private keys or seed phrases.
- All signing is EIP-712 `signTypedData` inside the user's own wallet extension.
- The server never signs anything. The order relay (`src/app/api/orders/route.ts`)
  forwards an already-signed envelope; the payload hash is inside the signature, so the
  relay cannot alter an order without the gateway rejecting it.
- The relay refuses to forward to SoDEX mainnet. Execution is pinned to the testnet
  sandbox until a real-funds confirmation surface exists.
- Orders are only built after an explicit user confirmation; there is no scheduled,
  automatic, or server-initiated execution path.
- The SoSoValue API key is server-only (`SOSOVALUE_API_KEY`, no `NEXT_PUBLIC_` prefix)
  and is never sent to the browser.
- Plans and buy history live in the user's browser (`localStorage`); there is no server
  database and no account system to breach.

## Reporting a vulnerability

Open a GitHub issue with the label `security`, or email the address on the repository
owner's profile if the issue should stay private until fixed. Include steps to reproduce.
Since execution is testnet-sandboxed, most classes of issue carry no fund risk today —
report them anyway; the invariants above are the product.
