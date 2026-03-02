# REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

- limit: 60
- changed_evidence_files_n: 8
- override_path: artifacts/incoming/EVIDENCE_BLOAT_OVERRIDE
- override_accepted: false

## OFFENDERS
- reports/evidence/EXECUTOR/gates/manual/regression_epoch_skip01_respects_tracked_state.json
- reports/evidence/EXECUTOR/gates/manual/regression_fsm01_no_skip_states.json
- reports/evidence/EXECUTOR/gates/manual/regression_rg_reason01_token_purity.json
- reports/evidence/EXECUTOR/gates/manual/regression_rg_reason02_in_taxonomy.json
- reports/evidence/EXECUTOR/REGRESSION_EPOCH_SKIP01_RESPECTS_TRACKED_STATE.md
- reports/evidence/EXECUTOR/REGRESSION_FSM01.md
- reports/evidence/EXECUTOR/REGRESSION_RG_REASON01.md
- reports/evidence/EXECUTOR/REGRESSION_RG_REASON02.md
