# REGRESSION_REG03_PROMOTION_ONLY.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 468e39233712
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] registry_script_exists: /home/user/Treasure_engine/scripts/ops/candidate_registry.mjs
- [PASS] script_requires_promote_flag: --promote flag required for EXECUTOR registry writes
- [PASS] reg03_reason_code_declared: REG03_PROMOTION_ONLY reason code required
- [PASS] has_promote_refusal_logic: refusal logic required when promote config_id missing/invalid
- [PASS] executor_write_guarded_by_promote_flag: EXECUTOR write must be inside PROMOTE_FLAG block
- [PASS] dry_run_does_not_modify_executor_registry: EXECUTOR registry unchanged after dry-run (hash=NOT_EXISTS)
- [PASS] dry_run_exits_cleanly: dry-run exit code=0: [PASS] ops:candidates — NONE [RUNTIME]
  REGISTRY: reports/evidence/EPOCH-REGISTRY-468e39233712/REGI
- [PASS] promote_without_id_returns_blocked: --promote (no id) => expect EC=2, got EC=2

## FAILED
- NONE
