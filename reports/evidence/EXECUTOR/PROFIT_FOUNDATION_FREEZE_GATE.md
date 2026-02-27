# PROFIT_FOUNDATION_FREEZE_GATE.md

STATUS: NEEDS_DATA
REASON_CODE: PFZ01_NEEDS_DATA
RUN_ID: 0d5bf328af69
NEXT_ACTION: npm run -s epoch:mega:proof:x2

## REQUIRED
- reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json
- reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json
- reports/evidence/EXECUTOR/gates/manual/regression_node22_wrapper_timeout.json
- reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_public_diag_bounded.json | cmd: npm run -s verify:regression:public-diag-bounded
- reports/evidence/GOV/gates/manual/regression_export_final_validated_x2.json | cmd: npm run -s verify:regression:export-final-validated-x2

## CHECKS
- reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json: FAIL (status must be PASS) cmd_attempted=false cmd_ec=0
- reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json: MISSING (artifact not found) cmd_attempted=false cmd_ec=0
- reports/evidence/EXECUTOR/gates/manual/regression_node22_wrapper_timeout.json: PASS (ok) cmd_attempted=false cmd_ec=0
- reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_public_diag_bounded.json: PASS (ok) cmd_attempted=true cmd_ec=0
- reports/evidence/GOV/gates/manual/regression_export_final_validated_x2.json: PASS (ok) cmd_attempted=true cmd_ec=0

## MISSING_OR_BLOCKING
- reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json: FAIL (status must be PASS) cmd_attempted=false cmd_ec=0
- reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json: MISSING (artifact not found) cmd_attempted=false cmd_ec=0

- foundation_frozen: false
