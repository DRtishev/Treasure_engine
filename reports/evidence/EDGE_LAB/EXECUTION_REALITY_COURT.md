# EXECUTION_REALITY_COURT.md — Execution Reality Court
generated_at: RUN_ID
script: edge_execution_reality.mjs

## STATUS: NEEDS_DATA

## Reason
proxy_expectancy_pct=0.50% is a PROXY requiring paper trading validation. Provide artifacts/incoming/paper_evidence.json to transition to MEASURED mode.

## Policy Source
EDGE_LAB/EXECUTION_REALITY_POLICY.md — version 1.0.0

## Expectancy Mode
| Parameter | Value | Source | Validated |
|-----------|-------|--------|-----------|
| expectancy_mode | PROXY | PROXY_VALIDATION.md | NO — requires paper trading epoch |
| round_trip_cost_baseline | 0.30% | EXECUTION_MODEL.md | YES |

## Breakpoint Analysis
| Candidate | Expectancy (Source) | Base RT Cost | Breakpoint Fee Mult | Passes 2x Threshold | Eligible For Paper |
|-----------|--------------------|--------------|--------------------|--------------------|--------------------|
| H_ATR_SQUEEZE_BREAKOUT | 0.5% (PROXY) | 0.3% | 2x | YES | NO |
| H_BB_SQUEEZE | 0.5% (PROXY) | 0.3% | 2x | YES | NO |
| H_VOLUME_SPIKE | 0.5% (PROXY) | 0.3% | 2x | YES | NO |
| H_VWAP_REVERSAL | 0.5% (PROXY) | 0.3% | 2x | YES | NO |

## Stress Grid Summary (fee_mult × slip_mult, representative expectancy=0.500%)
| fee_mult | slip_mult | Effective RT Cost | Net Edge | Eligible |
|----------|-----------|------------------|---------|---------|
| 1x | 1x | 0.300% | 0.200% | NO |
| 1x | 1.5x | 0.350% | 0.150% | NO |
| 1x | 2x | 0.400% | 0.100% | NO |
| 1.25x | 1x | 0.350% | 0.150% | NO |
| 1.25x | 1.5x | 0.400% | 0.100% | NO |
| 1.25x | 2x | 0.450% | 0.050% | NO |
| 1.5x | 1x | 0.400% | 0.100% | NO |
| 1.5x | 1.5x | 0.450% | 0.050% | NO |
| 1.5x | 2x | 0.500% | 0.000% | NO |
| 1.75x | 1x | 0.450% | 0.050% | NO |
| 1.75x | 1.5x | 0.500% | 0.000% | NO |
| 1.75x | 2x | 0.550% | -0.050% | NO |

## Verdict
STATUS=NEEDS_DATA: PROXY_EXPECTANCY_UNVALIDATED

NEXT_ACTION: Provide artifacts/incoming/paper_evidence.json → run edge:paper:ingest → rerun this court.

## Anti-Overfit Protections
- Minimum trade count threshold: NEEDS_DATA (not yet enforced — no paper trading data)
- Sensitivity breakpoint: documented above per candidate
- Out-of-sample protocol: NEEDS_DATA (pending first paper trading epoch)
