# Keel brand

One line: flow-driven smart DCA — accumulate through fear, sized by institutional ETF flows.
The name is the ship's keel: the part below the waterline that keeps you upright in weather.

## Mark

Waterline + hull curve, drawn as two strokes (see `src/components/shell/Header.tsx`):
a straight foreground-colored line (the waterline) over an accent-colored arc (the hull).
Use the mark at 24-32px beside the wordmark "Keel" in Manrope extrabold, tight tracking.

## Color

Source of truth: `@theme` block in `src/app/globals.css`. Raw hex in components is forbidden;
components use the role aliases.

- Neutral ramp ("cool ink"): `ink-50` #f7f8f9 through `ink-950` #0b0e11. Background #f4f6f7,
  surface #ffffff, foreground #0b0e11, muted #5c666e, faint #8a949c.
- Accent ("deep ocean"): #125e73, strong #0d4757, muted #86b8c6, on-accent #ffffff.
  The accent is reserved for brand moments and the signal's own voice (multiplier, stance,
  primary actions). It is deliberately distinct from the semantic colors.
- Semantic (finance): up #0f7a4d, down #c23a2a, warn #a8760a. Up/down mean exactly
  inflow/outflow or gain/loss — never decoration.

## Type

- Text: Manrope (variable `--font-manrope`). Headings extrabold, tight tracking.
- Numbers: JetBrains Mono (variable `--font-jbmono`), tabular, slashed zero. Every financial
  figure renders in mono — that is the fastest visual tell of "this is data, not copy".
- Scale is exactly five sizes: micro 11px, body 13px, lead 16px, stat 28px, display 44px.

## Voice

Rules inherited from the build constitution (AGENTS.md) and enforced:

- Name the actual thing: the index, the endpoint, the number, the date. "Latest ETF net flow
  -$213M on 2026-07-14", never "markets are fearful".
- Every number carries unit + timeframe + provenance (the `ValueWithProvenance` component
  makes unsourced values structurally impossible).
- Honest states over polish: "Signal offline — set SOSOVALUE_API_KEY" beats a spinner.
- No emojis anywhere. No hype lexicon (the banned list lives in AGENTS.md). No rhetorical
  questions. No "coming soon".
- Risk language is plain and symmetric: replays are "historical, not a prediction"; the
  worst case is stated before every signature.

## Motifs

- Nautical, restrained: "stack through the storm", waterline, keel. Use sparingly — one
  metaphor per surface at most; the data does the talking.
- The mainnet-data / testnet-execution split is part of the identity: the green "Live ·
  SoDEX mainnet" pill and the amber "testnet sandbox · no real funds" badge are permanent
  fixtures, not fine print.
