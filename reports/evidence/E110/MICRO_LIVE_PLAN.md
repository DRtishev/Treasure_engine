# E110 MICRO-LIVE PLAN

## Overview
First cashflow experiment: 24h testnet micro-live loop with hard safety gates.

## Safety Gates (all must pass before live)
1. Data quorum v2: min 50 bars per symbol, all quality checks PASS
2. Candidate harvest: at least 1 candidate PASS (court + stability filters)
3. Gap monitor: median gap < 5 bps
4. Exchange adapter: fixture validation PASS
5. Kill-switch: armed, triggers on >5% drawdown or >50 trades/day

## Position Limits
- max_notional_usd: $100
- max_risk_per_trade_usd: $20
- max_daily_loss_usd: $20
- max_trades_per_day: 50
- kill_switch_dd_pct: 5%

## Required Environment
```bash
# Testnet (recommended first)
ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 CI=false \
  LIVE_MODE=TESTNET BYBIT_API_KEY=<key> BYBIT_API_SECRET=<secret> \
  node scripts/live/e109_micro_live_pilot_live.mjs
```

## Operator Steps
1. Pre-check: run `npm run -s verify:e110:contracts` — all must PASS
2. Pre-check: run `npm run -s e109:pilot:fixture` — determinism MATCH
3. Fund testnet wallet with test USDT (~$500)
4. Start pilot with flags above
5. Monitor: check daily report in reports/operator/
6. After 24h: review PnL, fees, slippage, DD, anomalies
7. Kill-switch: `touch .foundation-seal/E110_KILL_LOCK.md` to halt

## Anomaly Responses
- DrawDown > 5%: kill-switch auto-triggers, halt all orders
- Trades > 50/day: pause signals, log reason
- Gap > 15 bps: log warning, reduce position size by 50%
- API error: retry with backoff; 3 failures = halt session

## Escalation
If kill-switch triggers: do NOT restart without reviewing cause.
Create incident report in reports/operator/ before resuming.
