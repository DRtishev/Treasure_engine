# EXECUTION_BREAKPOINTS.md — Execution Cost Breakpoints
generated_at: RUN_ID
script: edge_execution_reality.mjs

## Summary

Breakpoints define the execution cost multiple at which each candidate becomes NOT_ELIGIBLE_FOR_PAPER.
These are computed from proxy_expectancy (PROXY — not validated) and EXECUTION_MODEL.md cost baseline.

## Breakpoint Table

| Candidate | breakpoint_fee_mult | breakpoint_slip_mult | 2x Fee Threshold | Status |
|-----------|--------------------|--------------------|-----------------|--------|
| H_ATR_SQUEEZE_BREAKOUT | 2x | 3x | PASS | NEEDS_DATA: proxy_expectancy_pct not validated from paper trading results |
| H_BB_SQUEEZE | 2x | 3x | PASS | NEEDS_DATA: proxy_expectancy_pct not validated from paper trading results |
| H_VOLUME_SPIKE | 2x | 3x | PASS | NEEDS_DATA: proxy_expectancy_pct not validated from paper trading results |
| H_VWAP_REVERSAL | 2x | 3x | PASS | NEEDS_DATA: proxy_expectancy_pct not validated from paper trading results |

## Interpretation

breakpoint_fee_mult = proxy_expectancy_pct / (2 * fee_per_side)
  = 0.50% / (2 * 0.10%) = 1.25x (fee-only, slip=0)

breakpoint combined (fee + default slip):
  = proxy_expectancy / round_trip_cost_baseline
  = 0.50% / 0.30% = 1.667x

**All candidates share the same breakpoint because proxy_expectancy_pct is uniform (PROXY).**
Individual breakpoints will diverge once per-candidate expectancy is measured from paper trading.

## Latency Sensitivity

| Latency | Impact | Eligible |
|---------|--------|---------|
| 100ms | Negligible (bar-close → next-bar-open model) | YES |
| 300ms | Minor — entry within same bar open window | YES |
| 500ms | Boundary — acceptable for paper; must measure for micro-live | PAPER_ONLY |

## Partial Fill Sensitivity

| Fill Rate | Effective Expectancy Adjustment | Impact |
|-----------|--------------------------------|--------|
| 100% | 0% adjustment | None |
| 90% | −5% expectancy reduction | Minor |
| 75% | −12.5% expectancy reduction | Moderate |

## NEXT_ACTION
1. Run paper trading epoch with TESTING candidates.
2. Measure actual per-trade expectancy.
3. Re-run edge:execution:reality with measured values.
4. ELIGIBLE_FOR_PAPER requires: measured_expectancy / round_trip_cost >= 2.0.
