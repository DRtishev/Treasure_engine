# EDGE Contracts Catalog (E31..E40)

All examples are canonical JSON snippets and use deterministic field naming.

## FeatureFrame
Required fields: `schema_version`, `symbol`, `ts_event`, `ts_feature`, `features`, `feature_vector_order`, `source_snapshot_id`, `fingerprint`.
Invariants: `ts_feature <= ts_event`, no NaN/Inf, stable feature order.
```json
{"schema_version":"1.0.0","symbol":"BTCUSDT","ts_event":"2026-01-01T00:00:00Z","ts_feature":"2026-01-01T00:00:00Z","features":{"ret_1":0.0012},"feature_vector_order":["ret_1"],"source_snapshot_id":"snap-1","fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## StrategySpec
Required fields: `schema_version`, `strategy_id`, `semver`, `engine_api_version`, `params_schema`, `default_params`, `artifact_digest`, `fingerprint`.
Invariants: semver monotonicity, backward-compatibility policy declared.
```json
{"schema_version":"1.0.0","strategy_id":"meanrev_v1","semver":"1.2.0","engine_api_version":"3.0.0","params_schema":{"type":"object"},"default_params":{"lookback":48},"artifact_digest":"<hex>","fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## Signal
Required fields: `schema_version`, `signal_id`, `strategy_id`, `symbol`, `timestamp`, `side_hint`, `strength`, `confidence`, `reasons`, `feature_manifest_ref`, `fingerprint`.
Invariants: confidence in `[0,1]`, reasons non-empty.
```json
{"schema_version":"1.0.0","signal_id":"sig-1","strategy_id":"meanrev_v1","symbol":"BTCUSDT","timestamp":"2026-01-01T00:05:00Z","side_hint":"BUY","strength":0.62,"confidence":0.74,"reasons":["spread_revert"],"feature_manifest_ref":"manifest-1","fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## Intent
Required fields: `schema_version`, `intent_id`, `signal_id`, `symbol`, `timestamp`, `side`, `size_units`, `limit_price`, `time_in_force`, `max_slippage_bps`, `risk_tags`, `fingerprint`.
Invariants: positive size, finite limit, risk tags explicit.
```json
{"schema_version":"1.0.0","intent_id":"int-1","signal_id":"sig-1","symbol":"BTCUSDT","timestamp":"2026-01-01T00:05:00Z","side":"BUY","size_units":"0.05000000","limit_price":"42010.12000000","time_in_force":"IOC","max_slippage_bps":5.0,"risk_tags":["shadow_only"],"fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## AllocationPlan
Required fields: `schema_version`, `plan_id`, `timestamp`, `capital_base`, `allocations`, `limits`, `rejections`, `fingerprint`.
Invariants: sum(allocation weights) <= 1.0.
```json
{"schema_version":"1.0.0","plan_id":"alloc-1","timestamp":"2026-01-01T00:05:00Z","capital_base":"100000.00000000","allocations":[{"intent_id":"int-1","weight":0.12}],"limits":{"max_gross":1.0},"rejections":[],"fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## RiskDecision
Required fields: `schema_version`, `decision_id`, `timestamp`, `mode_before`, `mode_after`, `triggers`, `actions`, `kill_switch_state`, `fingerprint`.
Invariants: mode transitions must match FSM map.
```json
{"schema_version":"1.0.0","decision_id":"risk-1","timestamp":"2026-01-01T00:05:01Z","mode_before":"NORMAL","mode_after":"BRAKE","triggers":["gap_warning"],"actions":["reduce_size_50pct"],"kill_switch_state":"OFF","fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## SimReport
Required fields: `schema_version`, `sim_run_id`, `inputs_digest`, `assumptions`, `metrics`, `fills_digest`, `fingerprint`.
Invariants: slippage and fee model versions pinned.
```json
{"schema_version":"1.0.0","sim_run_id":"sim-1","inputs_digest":"<hex>","assumptions":{"latency_ms":180},"metrics":{"sharpe":1.2},"fills_digest":"<hex>","fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## RealityGapReport
Required fields: `schema_version`, `report_id`, `timestamp`, `sim_ref`, `shadow_ref`, `delta_metrics`, `gap_score`, `action`, `fingerprint`.
Invariants: gap bands must map to deterministic actions.
```json
{"schema_version":"1.0.0","report_id":"gap-1","timestamp":"2026-01-01T00:10:00Z","sim_ref":"sim-1","shadow_ref":"shadow-1","delta_metrics":{"slippage_bps":2.4},"gap_score":0.41,"action":"BRAKE","fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## ShadowEvent
Required fields: `schema_version`, `event_id`, `timestamp`, `intent_id`, `adapter_mode`, `orders_submitted`, `guards`, `fingerprint`.
Invariants: `orders_submitted=0` in default mode.
```json
{"schema_version":"1.0.0","event_id":"sh-1","timestamp":"2026-01-01T00:11:00Z","intent_id":"int-1","adapter_mode":"shadow","orders_submitted":0,"guards":["network_locked"],"fingerprint":{"algo":"sha256","value":"<hex>"}}
```

## CanaryPhaseState
Required fields: `schema_version`, `phase_id`, `phase_percent`, `entry_criteria`, `exit_criteria`, `rollback_triggered`, `fingerprint`.
Invariants: allowed phase percents are `5,15,35,70,100`.
```json
{"schema_version":"1.0.0","phase_id":"c-15","phase_percent":15,"entry_criteria":["gap_score_lt_0.3"],"exit_criteria":["14d_stable"],"rollback_triggered":false,"fingerprint":{"algo":"sha256","value":"<hex>"}}
```
