# REGRESSION_LIVE04_TELEMETRY_CONTRACT.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 5b35ac334736
NEXT_ACTION: npm run -s verify:regression:live04-telemetry-contract

## Decision schema

- schema_version: microlive_decision.v2
- verdict: PROCEED
- telemetry fields: total_pnl_net, win_rate, closed_n, decisions_n, profit_factor, max_drawdown, avg_slippage_cost, total_fee_cost, wins_n, losses_n
- thresholds fields: KILL_PNL_FLOOR, KILL_WIN_RATE, KILL_PF_FLOOR, KILL_MAX_DD, KILL_SLIPPAGE_COST, MIN_TRADES

## Stability

- sha1: d305165072d5c0b5
- sha2: d305165072d5c0b5
- stable: true

- checks: ALL_PASS
