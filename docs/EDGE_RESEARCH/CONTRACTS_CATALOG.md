# EDGE Contracts Catalog (SSOT)

> Canonical contract catalog for E31..E40.
> If a spec uses a legacy alias, it MUST map to a canonical contract below.

## Contract governance rules
- Every contract MUST declare: required fields, invariants, versioning rule, and fingerprint include/exclude sets.
- Versioning: semver in `schema_version`; breaking field changes require MAJOR bump.
- Legacy aliases are compatibility-only and MUST NOT introduce divergent semantics.

## Canonical ↔ legacy aliases
- `StrategySpec` ↔ `StrategyManifest`
- `AllocationPlan` ↔ `PortfolioState` (E35 output contract)
- `RiskDecision` ↔ `RiskState`
- `RealityGapReport` ↔ `GapReport`
- `ShadowEvent` ↔ `ShadowRunRecord`
- `CanaryPhaseState` ↔ `CanaryPhase`

---

## FeatureFrame
- Required: `schema_version,symbol,ts_event,features,feature_vector_order,source_snapshot_id,deterministic_fingerprint`.
- Invariants: `source_ts <= ts_event`; no NaN/Inf; stable `feature_vector_order`.
- Fingerprint include: deterministic payload + `schema_version` + source references.
- Fingerprint exclude: generated_at/host metadata.
- Example:
```json
{"schema_version":"1.0.0","symbol":"BTCUSDT","ts_event":"2026-01-01T00:00:00Z","features":{"ret_1":0.001200},"feature_vector_order":["ret_1"],"source_snapshot_id":"snap-1"}
```

## StrategySpec
- Required: `schema_version,strategy_id,semver,params_schema,default_params,compatibility,artifact_hashes,deterministic_fingerprint`.
- Invariants: compatibility range explicit; artifact hashes immutable.
- Example:
```json
{"schema_version":"1.0.0","strategy_id":"edge_mvp","semver":"1.2.0","params_schema":{"type":"object"},"default_params":{},"compatibility":{"feature_schema":"^1.0.0"},"artifact_hashes":{"bundle":"sha256:abc"}}
```

## Signal
- Required: `schema_version,signal_id,strategy_id,symbol,timestamp,side_hint,confidence,reasons,deterministic_fingerprint`.
- Invariants: `confidence` in `[0,1]`; timestamp monotonic per `(strategy_id,symbol)`.
- Example:
```json
{"schema_version":"1.0.0","signal_id":"sig-1","strategy_id":"edge_mvp","symbol":"BTCUSDT","timestamp":"2026-01-01T00:00:00Z","side_hint":"LONG","confidence":0.720000,"reasons":["trend"]}
```

## Intent
- Required: `schema_version,intent_id,signal_id,symbol,timestamp,side,size_units,limit_price,max_slippage_bps,deterministic_fingerprint`.
- Invariants: deterministic mapping from signal+constraints; side in `{BUY,SELL}`.
- Example:
```json
{"schema_version":"1.0.0","intent_id":"int-1","signal_id":"sig-1","symbol":"BTCUSDT","timestamp":"2026-01-01T00:00:01Z","side":"BUY","size_units":0.05000000,"limit_price":42000.12000000,"max_slippage_bps":8.0000}
```

## AllocationPlan
- Required: `schema_version,plan_id,timestamp,target_weights,max_leverage,constraints_applied,deterministic_fingerprint`.
- Invariants: sum(|weights|) <= max gross cap; leverage <= `max_leverage`.
- Example:
```json
{"schema_version":"1.0.0","plan_id":"ap-1","timestamp":"2026-01-01T00:00:02Z","target_weights":{"BTCUSDT":0.350000},"max_leverage":1.500000,"constraints_applied":["asset_cap"]}
```

## RiskDecision
- Required: `schema_version,decision_id,timestamp,from_mode,to_mode,trigger_ids,action,deterministic_fingerprint`.
- Invariants: FSM transition must be allowed by E36 matrix.
- Example:
```json
{"schema_version":"1.0.0","decision_id":"rd-1","timestamp":"2026-01-01T00:00:03Z","from_mode":"CAUTIOUS","to_mode":"RESTRICTED","trigger_ids":["gap_score_breach"],"action":"REDUCE"}
```

## SimReport
- Required: `schema_version,sim_run_id,slippage_model,fee_model,latency_model,inputs_fingerprint,output_metrics,deterministic_fingerprint`.
- Invariants: no fantasy fills; assumptions versioned.
- Example:
```json
{"schema_version":"1.0.0","sim_run_id":"sim-1","slippage_model":"mvp","fee_model":"maker_taker_v1","latency_model":"fixed_50ms","inputs_fingerprint":"sha256:abc","output_metrics":{"sharpe":1.230000}}
```

## RealityGapReport
- Required: `schema_version,report_id,timestamp,sim_ref,shadow_ref,component_deltas,gap_score,brake_action,deterministic_fingerprint`.
- Invariants: `gap_score` formula versioned; brake action deterministic from thresholds.
- Example:
```json
{"schema_version":"1.0.0","report_id":"rg-1","timestamp":"2026-01-01T00:01:00Z","sim_ref":"sim-1","shadow_ref":"sh-1","component_deltas":{"slippage_bps":2.0000},"gap_score":0.031000,"brake_action":"REDUCE"}
```

## ShadowEvent
- Required: `schema_version,event_id,timestamp,intents_emitted,orders_submitted,guards,deterministic_fingerprint`.
- Invariants: in shadow mode `orders_submitted == 0`.
- Example:
```json
{"schema_version":"1.0.0","event_id":"se-1","timestamp":"2026-01-01T00:02:00Z","intents_emitted":4,"orders_submitted":0,"guards":{"adapter_disabled":true}}
```

## CanaryPhaseState
- Required: `schema_version,timestamp,phase_percent,previous_phase_percent,rollback_armed,transition_reason,deterministic_fingerprint`.
- Invariants: allowed phases `{5,15,35,70,100}` and single-step progression unless rollback.
- Example:
```json
{"schema_version":"1.0.0","timestamp":"2026-01-01T00:03:00Z","phase_percent":15,"previous_phase_percent":5,"rollback_armed":true,"transition_reason":"all_guards_green"}
```

## CertificationReport
- Required: `schema_version,release_id,epoch_gate_results,ledger_snapshot_hash,spec_hash,evidence_hash,approvals,deterministic_fingerprint`.
- Invariants: all E31..E40 gate results must be `PASS`; clean-clone replay hash must match.
- Example:
```json
{"schema_version":"1.0.0","release_id":"edge-r1","epoch_gate_results":{"31":"PASS","40":"PASS"},"ledger_snapshot_hash":"sha256:abc","spec_hash":"sha256:def","evidence_hash":"sha256:ghi","approvals":{"release_governor":"signed"}}
```
