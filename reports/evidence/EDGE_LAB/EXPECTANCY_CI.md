# EXPECTANCY_CI.md — EPOCH P1 Expectancy Bootstrap CI Court
generated_at: 295c8a87115b
script: edge_expectancy_ci.mjs
method: percentile bootstrap, XorShift32 seed from content hash
n_resamples: 10000
confidence_level: 95%

## STATUS: PASS

## Reason Code
NONE

## Per-Candidate Bootstrap CI (10,000 resamples, 95%)

| Candidate | n | mean% | CI95_lower% | CI95_upper% | CI_width% | Adequacy | Gate |
|-----------|---|-------|------------|------------|----------|---------|------|
| H_ATR_SQUEEZE_BREAKOUT | 35 | 0.6203 | 0.2502 | 0.9904 | 0.7402 | CAUTION | PASS |
| H_BB_SQUEEZE | 35 | 0.6074 | 0.2400 | 0.9749 | 0.7348 | CAUTION | PASS |
| H_VOLUME_SPIKE | 35 | 0.5654 | 0.2150 | 0.9158 | 0.7009 | CAUTION | PASS |
| H_VWAP_REVERSAL | 35 | 0.5480 | 0.2444 | 0.8516 | 0.6072 | CAUTION | PASS |

## Policy

| Parameter | Value |
|-----------|-------|
| min_samples | 30 |
| prefer_samples | 100+ |
| n_resamples | 10,000 |
| ci_level | 95% |
| gate_rule | CI95_lower > 0 (all candidates) |
| seed_source | evidence_hash[0:8] hex → uint32 (XorShift32) |
| prng | XorShift32 |

## Gate Dependency Chain

PAPER_EVIDENCE_COURT (P0) → EXPECTANCY_CI_COURT (P1) → EXECUTION_REALITY_COURT (P2)

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/EXPECTANCY_CI.md
- reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json

NEXT_ACTION: Proceed to EPOCH P2 (EXECUTION_REALITY_CALIBRATION) — use CI-validated expectancy.

## Spec

EDGE_LAB/EXPECTANCY_CI_POLICY.md — version 1.0.0
