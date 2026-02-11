# SUMMARY (EPOCH-25)

## What changed
- Added `verify:epoch25` gate (`scripts/verify/epoch25_testnet_campaign_check.mjs`).
- Gate performs deterministic offline profiling (latency/fees/slippage), enforces budget checks, and writes stable fingerprint.
- Network checks are opt-in only (`ENABLE_NETWORK_TESTS=1`) and skipped by default.
- Wired `verify:epoch25` into `verify:wall` and updated EPOCH-25/docs references.

## Verification results
- `verify:epoch25` passed twice (anti-flake).
- Mandatory gates passed: `verify:core`, `verify:phase2`, `verify:integration`.
- `verify:wall` passed with epoch25 included.
- EPOCH-25 source/evidence manifests validated.

## Limits
- Default path remains offline baseline; real testnet campaign execution stays explicit opt-in.
