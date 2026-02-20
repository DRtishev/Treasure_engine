# PROXY_VALIDATION

STATUS: PASS
REASON_CODE: NONE

## PROXY_INVENTORY
- trigger: `proxy`; where_used: `EDGE_LAB/HACK_REGISTRY.md` (H_LIQUIDITY_VOID_PROXY description)
- trigger: `approx`; where_used: `EDGE_LAB/HACK_REGISTRY.md` (proxy data notes)

## VALIDATION_METHOD
1. Offline backfill consistency check against OHLCV-derived surrogate features.
2. Stability check across deterministic seeds (fixed seed set) and two-run anti-flake.
3. Applicability boundary: proxy features are advisory only and cannot override fail-closed risk gates.

## ACCEPTANCE_CRITERIA
- proxy feature coverage documented for all detected triggers;
- deterministic two-run outputs identical at normalized evidence-content fingerprint level;
- no degradation of paper-court thresholds:
  - SLIPPAGE_MODEL_ERROR <= 0.30
  - FILL_RATE >= 0.99
  - REJECT_RATE <= 0.005
  - LATENCY_P95 <= 500

## EXPIRY
- Revalidate on any HACK_REGISTRY proxy wording update or quarterly gate review.

## NEXT_ACTION
- Run `npm run edge:all:x2` and confirm `proxy_guard.json` => `PASS/NONE`.
