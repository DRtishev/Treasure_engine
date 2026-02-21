# MULTI_HYPOTHESIS_COURT.md — EPOCH P4 Multi-Hypothesis Court
generated_at: 413510c72bed
script: edge_multi_hypothesis_mvp.mjs
method: Bonferroni correction on OOS tests; percentile bootstrap re-run at corrected alpha

## STATUS: PASS

## Reason Code
NONE

## Bonferroni Correction

| Parameter | Value |
|-----------|-------|
| alpha_nominal | 0.05 |
| n_testing_candidates | 4 |
| n_oos_periods | 2 |
| n_effective_oos_tests | 8 |
| alpha_corrected | 0.006250 |
| ci_level_corrected | 99.3750% |
| n_resamples | 10,000 |
| seed | 0xeba2a8bb |


## Per-Candidate Results

| Candidate | n | mean% | CI95_lower% | Corrected_lower% | CI_level_corrected% | Gate |
|-----------|---|-------|------------|-----------------|---------------------|------|
| H_ATR_SQUEEZE_BREAKOUT | 35 | 0.6203 | 0.2502 | 0.1269 | 99.3750 | PASS |
| H_BB_SQUEEZE | 35 | 0.6074 | 0.2400 | 0.0563 | 99.3750 | PASS |
| H_VOLUME_SPIKE | 35 | 0.5654 | 0.2150 | 0.0982 | 99.3750 | PASS |
| H_VWAP_REVERSAL | 35 | 0.5480 | 0.2444 | 0.1432 | 99.3750 | PASS |

## Policy

EDGE_LAB/ATTEMPT_LEDGER_POLICY.md — version 1.0.0

## Gate Dependency Chain

PAPER_EVIDENCE_COURT (P0) → EXPECTANCY_CI_COURT (P1) → MULTI_HYPOTHESIS_COURT (P4)

## NEXT_ACTION

Multi-hypothesis Bonferroni gate PASS. Edge is statistically significant after correction.
