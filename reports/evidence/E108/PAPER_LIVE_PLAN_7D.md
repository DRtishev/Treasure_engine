# E108 PAPER-LIVE 7-DAY PLAN

## Objective
Run paper-live for 7 consecutive days to validate strategy stability before micro-live.

## Configuration
- exchange: Binance (paper mode only)
- symbol: BTCUSDT
- timeframe: 5m candles
- strategy: breakout_atr (or best WFO candidate)
- params: from WFO best_config
- initial_capital: 10000 USDT (paper)

## Risk Limits
- max_position_usd: 500
- max_daily_loss_pct: 2.0%
- max_total_loss_pct: 5.0%
- max_drawdown_pct: 3.0%
- max_fills_per_day: 50
- panic_exit_on_error: true

## Daily Schedule
| Day | Action | Expected Output |
| --- | --- | --- |
| 1 | Launch paper-live, monitor first fills | DAILY_REPORT_D1.md |
| 2 | Check PnL, drawdown, anomalies | DAILY_REPORT_D2.md |
| 3 | Mid-week checkpoint: verify determinism | DAILY_REPORT_D3.md |
| 4 | Continue; check for parameter drift | DAILY_REPORT_D4.md |
| 5 | Continue; run overfit court on 5-day data | DAILY_REPORT_D5.md |
| 6 | Continue; accumulate statistics | DAILY_REPORT_D6.md |
| 7 | Final day; run micro-live readiness gate | DAILY_REPORT_D7.md + READINESS.md |

## What To Watch
- Drawdown exceeds 2% -> pause and investigate
- Anomalies detected -> check slippage/fee assumptions
- Fill rate too low -> check strategy signal generation
- Fill rate too high -> check for whipsaw/chop conditions
- Determinism check: re-run on same data should produce identical report

## Exit Criteria
- PROMOTE to micro-live if: readiness gate = READY after 7 days
- REJECT if: court FAIL, drawdown > threshold, or anomalies > threshold
- EXTEND if: insufficient fills or borderline results

## Operator Commands
```bash
# Start paper-live (requires ENABLE_NET=1 for real data)
ENABLE_NET=1 node core/paper/paper_live_runner.mjs

# Replay on recorded data (no network)
node scripts/paper/e108_paper_live_replay_24h.mjs

# Check readiness after 7 days
node scripts/gates/e108_micro_live_gate.mjs
```
