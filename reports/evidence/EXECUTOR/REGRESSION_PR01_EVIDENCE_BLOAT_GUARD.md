# REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

- limit: 60
- changed_evidence_files_n: 12
- override_path: artifacts/incoming/EVIDENCE_BLOAT_OVERRIDE
- override_accepted: false

## OFFENDERS
- reports/evidence/EXECUTOR/gates/manual/regression_court_wiring01.json
- reports/evidence/EXECUTOR/gates/manual/regression_court_wiring02.json
- reports/evidence/EXECUTOR/gates/manual/regression_pr01_evidence_bloat_guard.json
- reports/evidence/EXECUTOR/manifests/check_evidence.log
- reports/evidence/EXECUTOR/manifests/check_export.log
- reports/evidence/EXECUTOR/manifests/check_source.log
- reports/evidence/EXECUTOR/REGRESSION_COURT_WIRING01.md
- reports/evidence/EXECUTOR/REGRESSION_COURT_WIRING02.md
- reports/evidence/EXECUTOR/REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md
- reports/evidence/EXECUTOR/SHA256SUMS.EVIDENCE.txt
- reports/evidence/EXECUTOR/SHA256SUMS.EXPORT.txt
- reports/evidence/EXECUTOR/SHA256SUMS.SOURCE.txt
