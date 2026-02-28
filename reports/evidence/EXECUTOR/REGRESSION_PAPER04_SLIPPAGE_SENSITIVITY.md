# REGRESSION_PAPER04_SLIPPAGE_SENSITIVITY.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 5b35ac334736
NEXT_ACTION: npm run -s verify:regression:paper04-slippage-sensitivity

## Slippage monotonicity

- bps=2:  pf=0.3806 pnl_net=-17.859993 avg_slip=9.1075
- bps=10: pf=0 pnl_net=-90.719967 avg_slip=45.5375

## Fee monotonicity

- fee=0.0003: fee_cost=27.322491 pnl_net=-17.859991
- fee=0.0012: fee_cost=109.289967 pnl_net=-99.827467

- checks: ALL_PASS
