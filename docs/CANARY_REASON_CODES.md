# Canary Reason Codes SSOT (E53)

| code | metric | threshold key | strictness | required context fields |
|---|---|---|---|---|
| `PAUSE_REALITY_GAP` | `reality_gap` | `max_reality_gap` | `PAUSE` | `mode, scenario, calibration_mode` |
| `PAUSE_DD_SPEED` | `dd_speed` | `max_dd_speed` | `PAUSE` | `mode, scenario` |
| `PAUSE_VOL_SPIKE` | `vol_spike` | `max_vol_spike` | `PAUSE` | `mode, scenario` |
| `PAUSE_DATA_GAP` | `data_gap_count` | `max_data_gap_count` | `PAUSE` | `mode, scenario` |
| `PAUSE_RISK_HARDSTOP` | `risk_events_count` | `max_risk_events` | `PAUSE` | `mode, risk_state` |
| `FAIL_OVERFIT_UNKNOWN_STRICT` | `overfit_status` | `strict_overfit_required` | `FAIL` | `mode, overfit_metrics_path` |
| `WARN_HEURISTIC_DEDUP_USED` | `heuristic_dedup_used` | `strict_dedup_ids_required` | `WARN` | `provider, dataset_id` |

All pause/risk events must emit machine-readable code + metric + threshold + value + context fingerprint.
