# EXPECTANCY.md — EDGE_PROFIT_00

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a7fda148d63c
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

- mean_pnl_per_trade: 0.287028
- stddev_pnl: 0.067799
- winrate: 1.000000
- profit_factor: 999.000000
- max_drawdown_proxy: 0.000000
- ci95_low: 0.280020
- ci95_high: 0.293939
- sharpe_proxy: 67.204830
- psr0: 1.000000
- min_trl_trades: 3.600000
- rationale: CI lower > 0, PSR and MinTRL thresholds satisfied.
