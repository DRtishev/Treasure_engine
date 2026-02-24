# LIQUIDATIONS_INTELLIGENCE_ROUTE.md

STATUS: DESIGN_ONLY

## Authority model
- Primary authority: exchange public liquidation feeds (Binance, Bybit, OKX).
- Scraping route is quarantined fallback only; never authoritative by default.

## Lock-first contract
- Every acquisition writes:
  - raw_capture_sha256
  - normalized_schema_sha256
  - schema_version
  - time_unit_sentinel (ms/us/ns)
- Replay must validate lock hashes before downstream use.

## Offline replay doctrine
- PASS must be provable without network from lock artifacts only.
- Verify/proof/governance lanes cannot require fresh network data.

## Reason codes
- ACQ_LIQ01: acquisition blocked
- ACQ_LIQ02: rate limited
- ACQ_LIQ03: schema drift
- DATA_LIQ01: content mismatch
- ND_LIQ01: nondeterminism detected
