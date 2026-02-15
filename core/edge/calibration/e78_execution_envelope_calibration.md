# E78 Execution Envelope Calibration SSOT

- calibration_version: e78-cal-v1
- previous_calibration_version: e77-cal-v1
- previous_cal_hash: 560e6386c71569d7a7e00045db67df3bb1e2d6e5547ffcf2eeefcd2492185f56
- rounding_policy: HALF_UP
- migration_notes: docs/ANTI_DRIFT_DOCTRINE.md

## budgets
- spread_floor_delta_max: 0.70
- latency_stage_delta_max_ms: 18
- fee_delta_max_bps: 0.90
- slippage_delta_max_bps: 1.10
- symbol_table_change_requires_migration_notes: true

## symbol_params
| symbol | fee_taker_bps | spread_floor_bps | slippage_small_bps | slippage_medium_bps | slippage_large_bps | latency_decision_submit_ms | latency_submit_ack_ms | latency_ack_fill_ms | tick_size | lot_size | min_qty | min_notional |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| BTCUSDT | 5.40 | 1.80 | 2.00 | 2.70 | 3.30 | 21 | 26 | 60 | 0.1 | 0.001 | 0.001 | 5 |
| ETHUSDT | 5.40 | 1.90 | 1.95 | 2.60 | 3.00 | 20 | 24 | 54 | 0.01 | 0.001 | 0.001 | 5 |
| SOLUSDT | 5.40 | 2.30 | 2.50 | 2.90 | 3.40 | 18 | 22 | 42 | 0.001 | 0.01 | 0.01 | 5 |
