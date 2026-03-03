# REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

- limit: 60
- changed_evidence_files_n: 18
- override_path: artifacts/incoming/EVIDENCE_BLOAT_OVERRIDE
- override_accepted: false

## OFFENDERS
- reports/evidence/EXECUTOR/CHAOS_EVIDENCE_TAMPER.md
- reports/evidence/EXECUTOR/CHAOS_NET_LEAK.md
- reports/evidence/EXECUTOR/gates/manual/chaos_evidence_tamper.json
- reports/evidence/EXECUTOR/gates/manual/chaos_net_leak.json
- reports/evidence/EXECUTOR/gates/manual/regression_doctor01_output_stable_x2.json
- reports/evidence/EXECUTOR/gates/manual/regression_doctor02_no_net.json
- reports/evidence/EXECUTOR/gates/manual/regression_doctor03_scoreboard_sum.json
- reports/evidence/EXECUTOR/gates/manual/regression_doctor04_differential_axes.json
- reports/evidence/EXECUTOR/gates/manual/regression_doctor05_provenance_chain.json
- reports/evidence/EXECUTOR/gates/manual/regression_immune01_integration.json
- reports/evidence/EXECUTOR/gates/manual/regression_pr01_evidence_bloat_guard.json
- reports/evidence/EXECUTOR/REGRESSION_DOCTOR01.md
- reports/evidence/EXECUTOR/REGRESSION_DOCTOR02.md
- reports/evidence/EXECUTOR/REGRESSION_DOCTOR03.md
- reports/evidence/EXECUTOR/REGRESSION_DOCTOR04.md
- reports/evidence/EXECUTOR/REGRESSION_DOCTOR05.md
- reports/evidence/EXECUTOR/REGRESSION_IMMUNE01.md
- reports/evidence/EXECUTOR/REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md
