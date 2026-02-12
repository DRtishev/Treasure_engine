# EDGE Contracts Catalog

> **SSOT**: This is the single source of truth for contract field definitions across E31..E40.
> Derived from `docs/SDD_EDGE_EPOCHS_31_40.md` Section "Contract Catalog".
> All epoch specs and implementations must conform to these field lists.
> Changes require SDD update, review, and `verify:specs` re-run.

## Common Fields (present in every contract)

| Field | Type | Description |
|-------|------|-------------|
| `schema_version` | string (semver) | Contract schema version |
| `deterministic_fingerprint` | object `{algo, value}` | Fingerprint per DETERMINISM_POLICY.md |
| `forbidden_values` | object | Declares invalid values for this contract instance |

## FeatureFrame (E31)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | e.g. `"1.0.0"` |
| `symbol` | string | yes | Instrument identifier |
| `ts_event` | string (ISO 8601) | yes | Event timestamp (UTC) |
| `ts_feature` | string (ISO 8601) | yes | Feature computation timestamp |
| `bar_interval` | string | yes | e.g. `"1h"`, `"4h"` |
| `features` | object | yes | Key-value feature map |
| `feature_vector_order` | string[] | yes | Canonical ordering of feature keys |
| `source_snapshot_id` | string | yes | Dataset snapshot reference |
| `provenance` | object | yes | Extraction lineage metadata |
| `deterministic_fingerprint` | object | yes | `{algo, value}` |
| `forbidden_values` | object | yes | e.g. `{"features": "no NaN/Inf"}` |

## FeatureManifest (E31)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `snapshot_id` | string | yes | Dataset snapshot identifier |
| `dataset_hash_sha256` | string | yes | SHA256 of source dataset |
| `feature_hash_sha256` | string | yes | SHA256 of extracted features |
| `config_hash_sha256` | string | yes | SHA256 of extraction config |
| `seed` | integer | yes | RNG seed used |
| `extraction_params` | object | yes | Extractor configuration |
| `row_count` | integer | yes | Total rows extracted |
| `ts_min` | string | yes | Earliest timestamp |
| `ts_max` | string | yes | Latest timestamp |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## SimReport (E32)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `sim_run_id` | string | yes | Unique simulation run ID |
| `slippage_model` | string | yes | Model identifier (e.g. `"MVP"`) |
| `fee_model` | string | yes | Fee model identifier |
| `latency_model` | string | yes | Latency model identifier |
| `partial_fill_assumptions` | object | yes | Liquidity bucket and fill rules |
| `inputs_fingerprint` | string | yes | SHA256 of input dataset |
| `output_metrics` | object | yes | Simulation result metrics |
| `calibration_refs` | object | yes | References to calibration data |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## StrategyManifest (E33)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `strategy_id` | string | yes | Unique strategy identifier |
| `name` | string | yes | Human-readable name |
| `semver` | string | yes | Strategy version |
| `engine_api_version` | string | yes | Required engine API version |
| `params_schema` | object | yes | JSON Schema for parameters |
| `default_params` | object | yes | Default parameter values |
| `compatibility` | object | yes | Data schema version ranges |
| `deterministic_settings` | object | yes | Seed policy, ordering rules |
| `artifact_hashes` | object | yes | Hashes of strategy artifacts |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## Signal (E34)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `signal_id` | string | yes | Unique signal identifier |
| `strategy_id` | string | yes | Originating strategy |
| `symbol` | string | yes | Instrument |
| `timestamp` | string | yes | Signal generation time (UTC) |
| `side_hint` | string | yes | `"LONG"` or `"SHORT"` |
| `strength` | number | yes | Signal strength scalar |
| `confidence` | number | yes | [0, 1] confidence score |
| `reasons` | string[] | yes | Human-readable rationale |
| `feature_manifest_ref` | string | yes | Reference to FeatureManifest |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## Intent (E34)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `intent_id` | string | yes | Unique intent identifier |
| `signal_id` | string | yes | Source signal reference |
| `symbol` | string | yes | Instrument |
| `timestamp` | string | yes | Intent creation time (UTC) |
| `side` | string | yes | `"BUY"` or `"SELL"` |
| `size_units` | number | yes | Order size |
| `limit_price` | number | yes | Limit price |
| `time_in_force` | string | yes | e.g. `"GTC"`, `"IOC"` |
| `max_slippage_bps` | number | yes | Max acceptable slippage |
| `risk_tags` | string[] | yes | Applied risk labels |
| `constraints_applied` | string[] | yes | List of constraints checked |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## PortfolioState (E35)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `timestamp` | string | yes | Snapshot time (UTC) |
| `equity` | number | yes | Total equity |
| `cash` | number | yes | Available cash |
| `gross_exposure` | number | yes | Sum of absolute position values |
| `net_exposure` | number | yes | Long - short exposure |
| `leverage` | number | yes | Gross exposure / equity |
| `positions` | array | yes | Position objects with symbol/qty |
| `asset_caps` | object | yes | Per-asset concentration limits |
| `turnover_1d` | number | yes | Daily turnover ratio |
| `drawdown` | number | yes | Current drawdown from peak |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## RiskState (E36)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `timestamp` | string | yes | State snapshot time (UTC) |
| `mode` | string | yes | `NORMAL`, `CAUTIOUS`, `RESTRICTED`, `HALTED` |
| `active_triggers` | string[] | yes | Currently active trigger IDs |
| `cooldown_until` | string/null | yes | Cooldown expiry (ISO 8601 or null) |
| `kill_switches` | object | yes | Kill-switch states |
| `manual_override` | object/null | yes | Manual override record |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## WFOReport (E37)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `run_id` | string | yes | WFO run identifier |
| `windows` | array | yes | IS/OOS window definitions |
| `purge_bars` | integer | yes | Bars purged between IS/OOS |
| `embargo_bars` | integer | yes | Embargo bars after purge |
| `selection_criteria` | object | yes | Model selection rules |
| `is_metrics` | object | yes | In-sample performance metrics |
| `oos_metrics` | object | yes | Out-of-sample performance metrics |
| `seed_dispersion` | object | yes | Cross-seed stability metrics |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## GapReport (E38)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `timestamp` | string | yes | Report time (UTC) |
| `sim_ref` | string | yes | SimReport reference |
| `shadow_ref` | string | yes | ShadowRunRecord reference |
| `delta_slippage_bps` | number | yes | Slippage delta |
| `delta_fill_rate` | number | yes | Fill rate delta |
| `delta_latency_ms` | number | yes | Latency delta |
| `delta_reject_rate` | number | yes | Rejection rate delta |
| `delta_pnl` | number | yes | PnL delta |
| `gap_score` | number | yes | Composite drift score |
| `brake_action` | string | yes | `"NONE"`, `"WARNING"`, `"REDUCE"`, `"FULL_STOP"` |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## ShadowRunRecord (E39)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `run_id` | string | yes | Shadow run identifier |
| `timestamp` | string | yes | Run time (UTC) |
| `intents_emitted` | integer | yes | Count of intents generated |
| `orders_submitted` | integer | yes | Must be `0` in shadow mode |
| `order_adapter_state` | string | yes | Must be `"DISABLED"` in shadow |
| `guards` | object | yes | Guard check results |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |

## CertificationReport (E40)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | |
| `release_id` | string | yes | Release identifier |
| `epoch_gate_results` | object | yes | Map of epoch -> PASS/FAIL |
| `ledger_snapshot_hash` | string | yes | SHA256 of LEDGER.json |
| `spec_hash` | string | yes | SHA256 of all spec files |
| `evidence_hash` | string | yes | SHA256 of evidence manifest |
| `clean_clone_repro_refs` | object | yes | Clean-clone replay evidence |
| `approvals` | object | yes | Approval records |
| `deterministic_fingerprint` | object | yes | |
| `forbidden_values` | object | yes | |
