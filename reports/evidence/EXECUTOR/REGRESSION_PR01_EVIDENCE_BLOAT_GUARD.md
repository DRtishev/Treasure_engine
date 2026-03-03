# REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

- limit: 60
- changed_evidence_files_n: 5
- override_path: artifacts/incoming/EVIDENCE_BLOAT_OVERRIDE
- override_accepted: false

## OFFENDERS
- reports/evidence/EXECUTOR/gates/manual/regression_backtest01_organ_health.json
- reports/evidence/EXECUTOR/gates/manual/regression_pr01_evidence_bloat_guard.json
- reports/evidence/EXECUTOR/gates/manual/regression_pr05_executor_ssot_stable_set.json
- reports/evidence/EXECUTOR/REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md
- reports/evidence/EXECUTOR/REGRESSION_PR05_EXECUTOR_SSOT_STABLE_SET.md
