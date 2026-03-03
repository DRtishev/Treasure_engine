# REGRESSION_PR05_EXECUTOR_SSOT_STABLE_SET.md

STATUS: FAIL
REASON_CODE: RG_PR05_NON_ALLOWLIST_ADDED
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## ALLOWLIST
- REGRESSION_*.md
- SAN_*.md
- CHAOS_*.md
- gates/manual/*.json
- MERGE_PLAN.md

## FORBIDDEN (static scan)
- *.log
- *.zip
- *.tar.gz
- *.tar.xz
- *.tar.bz2

## CHECKS
- origin_main_present: true
- forbidden_ext_files_n: 0
- new_non_allowlisted_n: 1

## OFFENDERS
- NEW:reports/evidence/EXECUTOR/gates/manual/regression_backtest01_organ_health.md
