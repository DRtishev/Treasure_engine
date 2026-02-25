# EXPECTANCY.md — EDGE_PROFIT_00

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a0e3806a2bb8
NEXT_ACTION: npm run -s edge:profit:00:overfit

## Inputs

- ingest_status: PASS
- execution_reality_status: PASS
- min_n_trades: 200
- min_trl: 2
- psr_min: 0.95
- bootstrap_iters: 10000
- bootstrap_seed: 20260223
- trades_n: 360

## Metrics

- mean_pnl_per_trade: 0.169376
- stddev_pnl: 0.049839
- winrate: 1.000000
- profit_factor: 999.000000
- max_drawdown_proxy: 0.000000
- ci95_low: 0.164208
- ci95_high: 0.174487
- sharpe_proxy: 53.948966
- psr0: 1.000000
- min_trl_trades: 3.600000
- rationale: CI lower > 0, PSR and MinTRL thresholds satisfied.
