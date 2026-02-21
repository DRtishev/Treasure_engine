# EXECUTION_REALITY_COURT.md — Execution Reality Court
generated_at: b4de92324329
script: edge_execution_reality.mjs

## STATUS: PASS

## Reason
MEASURED+CI expectancy validated for all 4 candidate(s). All breakpoint_fee_mult >= 2.0. CI_VALIDATED (CI95_lower_worst=0.2150%). ELIGIBLE_FOR_PAPER granted. Paper epoch: PAPER_EPOCH_20260102_20260131.

## Policy Source
EDGE_LAB/EXECUTION_REALITY_POLICY.md — version 1.0.0

## Expectancy Mode (EPOCH P2: MEASURED+CI required)
| Parameter | Value | Source | Validated |
|-----------|-------|--------|-----------|
| expectancy_mode | MEASURED+CI | paper_evidence.json + expectancy_ci.json (epoch: PAPER_EPOCH_20260102_20260131) | YES — paper evidence + CI bootstrap (CI_VALIDATED (CI95_lower_worst=0.2150%)) |
| round_trip_cost_baseline | 0.30% | EXECUTION_MODEL.md | YES |
| ci_status | CI_VALIDATED (CI95_lower_worst=0.2150%) | expectancy_ci.json | PASS |

## Breakpoint Analysis
| Candidate | Expectancy (Source) | Base RT Cost | Breakpoint Fee Mult | Passes 2x Threshold | Eligible For Paper |
|-----------|--------------------|--------------|--------------------|--------------------|--------------------|
| H_ATR_SQUEEZE_BREAKOUT | 0.6203% (MEASURED) | 0.3% | 2.6015x | YES | YES |
| H_BB_SQUEEZE | 0.6074% (MEASURED) | 0.3% | 2.537x | YES | YES |
| H_VOLUME_SPIKE | 0.5654% (MEASURED) | 0.3% | 2.327x | YES | YES |
| H_VWAP_REVERSAL | 0.548% (MEASURED) | 0.3% | 2.24x | YES | YES |

## Stress Grid Summary (fee_mult × slip_mult, representative expectancy=0.620%)
| fee_mult | slip_mult | Effective RT Cost | Net Edge | Eligible |
|----------|-----------|------------------|---------|---------|
| 1x | 1x | 0.300% | 0.320% | YES |
| 1x | 1.5x | 0.350% | 0.270% | YES |
| 1x | 2x | 0.400% | 0.220% | YES |
| 1.25x | 1x | 0.350% | 0.270% | YES |
| 1.25x | 1.5x | 0.400% | 0.220% | YES |
| 1.25x | 2x | 0.450% | 0.170% | YES |
| 1.5x | 1x | 0.400% | 0.220% | YES |
| 1.5x | 1.5x | 0.450% | 0.170% | YES |
| 1.5x | 2x | 0.500% | 0.120% | YES |
| 1.75x | 1x | 0.450% | 0.170% | YES |
| 1.75x | 1.5x | 0.500% | 0.120% | YES |
| 1.75x | 2x | 0.550% | 0.070% | YES |

## Verdict
STATUS=PASS: NONE

ELIGIBLE_FOR_PAPER: GRANTED. All candidates pass 2x fee stress under measured expectancy.

## Anti-Overfit Protections
- Minimum trade count threshold: ENFORCED (>= 30 trades per candidate, enforced by edge:paper:ingest)
- Sensitivity breakpoint: documented above per candidate
- Out-of-sample protocol: MEASURED epoch: PAPER_EPOCH_20260102_20260131 (2026-01-02 to 2026-01-31)
