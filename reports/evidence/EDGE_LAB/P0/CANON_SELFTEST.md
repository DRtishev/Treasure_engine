# CANON_SELFTEST.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 1e93566551e0
NEXT_ACTION: No action required. Canon selftest is GREEN.

## Summary

| Metric | Value |
|--------|-------|
| total_vectors | 7 |
| passed | 7 |
| failed | 0 |

## Test Vector Results

| # | Type | Result | Description |
|---|------|--------|-------------|
| 1 | VOLATILE | PASS | Volatile generated_at timestamp |
| 2 | VOLATILE | PASS | Volatile Started timestamp |
| 3 | SEMANTIC | PASS | Semantic threshold line — must be unchanged |
| 4 | SEMANTIC | PASS | Semantic drawdown line — must be unchanged |
| 5 | BOUNDARY | PASS | Boundary non-volatile line without forbidden token |
| 6 | VOLATILE | PASS | Volatile Completed with timestamp and ms timing |
| 7 | D005_CATCH | PASS | D005 structural proof: semantic line unchanged when non-volatile |

## Dual-Hash Doctrine Demo (R5)

| Hash Type | Value |
|-----------|-------|
| sha256_raw | ed8d2a7d707b4678989ed10c4010439be1f690d4b5e0808124bd7a8267701826 |
| sha256_norm | 6022c256cbcdef979acc7640d88bf4423e0a4469ee282911ad74fb7e11cd91a0 |
| hashes_differ | true |

Input: `generated_at: 2026-02-21T12:00:00.000Z
threshold: 0.015`

sha256_raw reflects the raw content (including timestamps).
sha256_norm reflects normalized content (timestamps replaced with RUN_ID).
When content contains volatile fields, sha256_norm is stable across runs; sha256_raw is not.

## Volatile Markers

- `UTC_TIMESTAMP_`
- `Generated at`
- `RUN_ID`
- `Host:`
- `Path:`
- `generated_at:`
- `Started:`
- `Completed:`

## Forbidden Semantic Token Pattern

`\b(threshold|limit|ratio|delta|pnl|slippage|expectancy|kelly|sharpe|drawdown)\b` (word-boundary, case-insensitive)

## Canon Test Vectors Reference

EDGE_LAB/tests/CANON_TEST_VECTORS.md

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md
- reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json
