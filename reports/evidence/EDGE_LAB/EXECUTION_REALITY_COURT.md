# EXECUTION_REALITY_COURT.md — Execution Reality Court
generated_at: RUN_ID
script: edge_execution_reality.mjs

## STATUS: NEEDS_DATA

## Reason
proxy_expectancy_pct=0.50% is a PROXY requiring paper trading validation before ELIGIBLE_FOR_PAPER can be granted. Breakpoint analysis complete: all candidates have breakpoint_fee_mult=1.333x (fee-only) and 2.0x (fee+slip combined), below 2.0x fee-only threshold.

## Policy Source
EDGE_LAB/EXECUTION_REALITY_POLICY.md — version 1.0.0

## Proxy Declarations
| Parameter | Value | Source | Validated |
|-----------|-------|--------|-----------|
| proxy_expectancy_pct | 0.50% | PROXY (conservative structural estimate for OHLCV WFO-positive strategies) | NO — requires paper trading epoch |
| round_trip_cost_baseline | 0.30% | SOURCE: measured (EXECUTION_MODEL.md) | YES |

## Breakpoint Analysis
| Candidate | Proxy Expectancy | Base RT Cost | Breakpoint Fee Mult | Passes 2x Threshold | Eligible For Paper |
|-----------|-----------------|-------------|--------------------|--------------------|-------------------|
| H_ATR_SQUEEZE_BREAKOUT | 0.5% | 0.3% | 2x | YES | NO |
| H_BB_SQUEEZE | 0.5% | 0.3% | 2x | YES | NO |
| H_VOLUME_SPIKE | 0.5% | 0.3% | 2x | YES | NO |
| H_VWAP_REVERSAL | 0.5% | 0.3% | 2x | YES | NO |

## Stress Grid Summary (fee_mult × slip_mult)
| fee_mult | slip_mult | Effective RT Cost | Net Edge (proxy) | Eligible |
|----------|-----------|------------------|-----------------|---------|
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

This court cannot declare ELIGIBLE_FOR_PAPER because proxy_expectancy_pct is not validated.
NEXT_ACTION: Complete paper trading epoch → measure actual expectancy → rerun this court.
ELIGIBLE_FOR_PAPER requires: proxy_expectancy validated AND breakpoint_fee_mult >= 2.0.

## Anti-Overfit Protections
- Minimum trade count threshold: NEEDS_DATA (not yet enforced — no paper trading data)
- Sensitivity breakpoint: documented above per candidate
- Out-of-sample protocol: NEEDS_DATA (pending first paper trading epoch)
