# REALITY_GAP.md — Sprint 11

## Parameter Comparison

| Param | Default Value | Data-Backed Value | Source | Gap |
|-------|-------------:|------------------:|--------|-----|
| fee_maker_bps | 2 | BLOCKED | DEFAULT | UNKNOWN |
| fee_taker_bps | 4 | BLOCKED | DEFAULT | UNKNOWN |
| spread_default_bps | 1.5 | BLOCKED | DEFAULT | UNKNOWN |
| depth_default_usd | 1000000 | BLOCKED | DEFAULT | UNKNOWN |
| depth_coeff | 0.5 | BLOCKED | DEFAULT | UNKNOWN |
| vol_coeff | 0.1 | BLOCKED | DEFAULT | UNKNOWN |
| liquidity_fraction | 0.1 | BLOCKED | DEFAULT | UNKNOWN |
| default_fill_ratio | 0.95 | BLOCKED | DEFAULT | UNKNOWN |
| funding_default_bps | 5 | BLOCKED | DEFAULT | UNKNOWN |
| funding_bounds_min_bps | -5 | BLOCKED | DEFAULT | UNKNOWN |
| funding_bounds_max_bps | 15 | BLOCKED | DEFAULT | UNKNOWN |
| funding_period_hours | 8 | BLOCKED | DEFAULT | UNKNOWN |

## Gap Assessment

**Status:** BLOCKED NEEDS_DATA

All parameters use conservative DEFAULT values from `core/cost/cost_model.mjs`.
No real exchange data has been acquired (ALLOW_NETWORK absent).

The reality gap is currently **unmeasurable** — all Data-Backed columns show BLOCKED.
When acquire scripts are unlocked (ALLOW_NETWORK), lock files will provide real fee tiers,
funding rates, and market snapshots to calibrate against.

## Risk Implications
- Default fee_taker_bps=4 may overestimate actual fees (Binance VIP tiers lower)
- Default spread_default_bps=1.5 is conservative for BTC/USDT (typically 0.5-1.0 bps)
- Default funding_default_bps=5 is conservative median estimate
- Overall: defaults are CONSERVATIVE, meaning backtest/paper PnL is likely UNDERSTATED
- This is the fail-safe direction: live performance should be BETTER than paper

## Next Action
Enable ALLOW_NETWORK → run acquire scripts → populate LOCKS → re-calibrate → remeasure gap.
