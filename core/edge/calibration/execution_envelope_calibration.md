# E77 Execution Envelope Calibration SSOT

- calibration_version: e77-cal-v1
- rounding_policy: HALF_UP
- migration_notes: N/A

## budgets
- spread_floor_delta_max: 0.80
- latency_stage_delta_max_ms: 20
- fee_delta_max_bps: 1.00
- slippage_delta_max_bps: 1.20
- symbol_table_change_requires_migration_notes: true

## symbol_params
| symbol | fee_taker_bps | spread_floor_bps | slippage_small_bps | slippage_medium_bps | slippage_large_bps | latency_decision_submit_ms | latency_submit_ack_ms | latency_ack_fill_ms | tick_size | lot_size | min_qty | min_notional |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| BTCUSDT | 5.50 | 1.90 | 2.10 | 2.80 | 3.40 | 22 | 27 | 62 | 0.1 | 0.001 | 0.001 | 5 |
| ETHUSDT | 5.50 | 2.00 | 2.00 | 2.70 | 3.10 | 21 | 25 | 56 | 0.01 | 0.001 | 0.001 | 5 |
| SOLUSDT | 5.50 | 2.40 | 2.60 | 3.00 | 3.50 | 19 | 23 | 44 | 0.001 | 0.01 | 0.01 | 5 |
