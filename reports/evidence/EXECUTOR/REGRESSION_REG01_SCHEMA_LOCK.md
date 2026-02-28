# REGRESSION_REG01_SCHEMA_LOCK.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 468e39233712
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] registry_script_exists: /home/user/Treasure_engine/scripts/ops/candidate_registry.mjs
- [PASS] schema_version_1_0_0_declared: SCHEMA_VERSION = "1.0.0" required
- [PASS] required_field_config_id: item field "config_id" must be declared
- [PASS] required_field_parents: item field "parents" must be declared
- [PASS] required_field_metrics: item field "metrics" must be declared
- [PASS] required_field_robustness: item field "robustness" must be declared
- [PASS] required_field_status: item field "status" must be declared
- [PASS] required_field_evidence_paths: item field "evidence_paths" must be declared
- [PASS] metric_field_profit_factor: metric field "profit_factor" required
- [PASS] metric_field_max_dd: metric field "max_dd" required
- [PASS] metric_field_expectancy: metric field "expectancy" required
- [PASS] metric_field_trades_n: metric field "trades_n" required
- [PASS] metric_field_slippage_sensitivity: metric field "slippage_sensitivity" required
- [PASS] robustness_field_split_stats: robustness field "split_stats" required
- [PASS] robustness_field_leakage_pass: robustness field "leakage_pass" required
- [PASS] status_CANDIDATE_declared: status value "CANDIDATE" required
- [PASS] status_REJECTED_declared: status value "REJECTED" required
- [PASS] status_PROMOTED_declared: status value "PROMOTED" required
- [PASS] has_schema_validation: validateSchema or SCHEMA_VERSION check required
- [PASS] runtime_registry_epoch_pattern: output under EPOCH-REGISTRY-<RUN_ID>
- [PASS] registry_runs_without_crash: exit code=0: [PASS] ops:candidates — NONE [RUNTIME]
  REGISTRY: reports/evidence/EPOCH-REGISTRY-468e39233712/REGISTRY.json
  TOTAL:
- [PASS] registry_json_produced: reports/evidence/EPOCH-REGISTRY-468e39233712/REGISTRY.json
- [PASS] registry_schema_version: schema_version=1.0.0
- [PASS] registry_has_candidates_array: candidates must be array
- [PASS] registry_has_gate_id: gate_id=WOW9_CANDIDATE_REGISTRY
- [PASS] all_items_have_required_fields: OK

## FAILED
- NONE
