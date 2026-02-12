# EDGE Canonical Glossary (SSOT)

> This file is the single source of truth for terms used by E31..E40, SDD, and EDGE research docs.
> New terms are forbidden unless they are added here first and linked to at least one spec section.

## Law of Term Stability (Non-Bypassable)
- Do not introduce new nouns in epoch specs without adding them to this glossary.
- If a legacy synonym exists, keep one canonical term and list the legacy alias in the mapping table.
- Any unresolved term drift is a `BLOCKED` condition for spec closeout.

## Canonical terms

| Term | Definition |
|---|---|
| FeatureFrame | Point-in-time feature row keyed by `(symbol, ts_event)` with no-lookahead provenance. |
| StrategySpec | Immutable strategy contract (versioned parameters, compatibility, artifact hashes). |
| Signal | Strategy hypothesis with confidence and rationale; not executable by itself. |
| Intent | Deterministic executable instruction derived from Signal + constraints. |
| AllocationPlan | Deterministic portfolio sizing output from intents and portfolio state. |
| RiskDecision | Risk FSM decision record containing mode transition, triggers, and required action. |
| SimReport | Deterministic simulator assumptions + outputs + calibration references. |
| RealityGapReport | Sim-vs-shadow drift report with component deltas and `gap_score`. |
| ShadowEvent | No-order shadow execution event with guard outcomes and traceability. |
| CanaryPhaseState | Deterministic canary progression state (`5→15→35→70→100`) with rollback status. |
| CertificationReport | Immutable release certification artifact for E40 closeout. |
| EvidencePack | Required logs/manifests/verdict under one evidence epoch folder. |
| Deterministic Fingerprint | `sha256` of canonicalized material set; mismatch on same inputs is deterministic drift. |

## Usage mapping (canonical ↔ legacy)

| Canonical | Legacy alias in repo | Primary usage |
|---|---|---|
| StrategySpec | `StrategyManifest` | E33 strategy registry contracts |
| AllocationPlan | `PortfolioState` (E35 output state) | E35 allocation/portfolio constraints |
| RiskDecision | `RiskState` | E36 risk FSM transitions |
| RealityGapReport | `GapReport` | E38 reality-gap controls |
| ShadowEvent | `ShadowRunRecord` | E39 shadow safety + canary evidence |
| CanaryPhaseState | `CanaryPhase` | E39 canary governor transitions |

## Micro JSON examples (minimal, valid)

### FeatureFrame
```json
{"schema_version":"1.0.0","symbol":"BTCUSDT","ts_event":"2026-01-01T00:00:00Z","features":{"ret_1":0.001200},"feature_vector_order":["ret_1"]}
```

### StrategySpec
```json
{"schema_version":"1.0.0","strategy_id":"edge_mvp","semver":"1.2.0","params_schema":{"type":"object"},"artifact_hashes":{"model":"sha256:abc"}}
```

### Signal → Intent
```json
{"signal":{"signal_id":"sig-1","side_hint":"LONG","confidence":0.72},"intent":{"intent_id":"int-1","side":"BUY","size_units":0.05000000,"limit_price":42000.12000000}}
```

### AllocationPlan
```json
{"schema_version":"1.0.0","plan_id":"ap-1","target_weights":{"BTCUSDT":0.350000},"max_leverage":1.500000}
```

### RiskDecision
```json
{"schema_version":"1.0.0","decision_id":"rd-1","from_mode":"CAUTIOUS","to_mode":"RESTRICTED","trigger_ids":["gap_score_breach"]}
```

### RealityGapReport
```json
{"schema_version":"1.0.0","report_id":"rg-1","gap_score":0.031000,"brake_action":"REDUCE"}
```

### ShadowEvent + CanaryPhaseState
```json
{"shadow_event":{"event_id":"se-1","orders_submitted":0},"canary_phase_state":{"phase_percent":15,"previous_phase_percent":5,"rollback_armed":true}}
```
