# HYPOTHESIS_REGISTRY.md — Paper Candidate Registry (v1)

Purpose: maintain immutable paper-only hypothesis IDs for EDGE_PROFIT_00.

## Registry Contract

Each entry MUST include:
- `id` (stable, immutable): `HYP-0001`, `HYP-0002`, ...
- `name`
- `params` (compact key/value set)
- `timeframe`
- `venue`
- `expected_edge_type`
- `status` (`CANDIDATE` | `PAPER_TESTING` | `RETIRED`)

## Change Protocol (minimal governance)

All changes are fail-closed and receipt-driven:
1. `PROPOSE` — write proposed diff/intent in PR description and run registry court.
2. `APPLY` — merge only with matching court evidence and deterministic gate JSON.

Rules:
- IDs are append-only and never reused.
- Existing ID semantics are immutable; deprecate via `status: RETIRED`.
- No live-trading unlock semantics are allowed from this file.

## Seed Set v1

1) `HYP-0001` — BTC mean-reversion micro swing (paper only)
2) `HYP-0002` — ETH momentum continuation with latency-aware exits (paper only)
