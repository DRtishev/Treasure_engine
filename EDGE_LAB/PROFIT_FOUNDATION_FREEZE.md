# PROFIT_FOUNDATION_FREEZE.md

STATUS: ACTIVE

Gate SSOT: `npm run -s verify:profit:foundation`.

Required freeze artifacts (gate SSOT):
- reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json
- reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json
- reports/evidence/EXECUTOR/gates/manual/regression_node22_wrapper_timeout.json
- reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_public_diag_bounded.json
- reports/evidence/GOV/gates/manual/regression_export_final_validated_x2.json

Required foundation checks (operator runbook):
- npm run -s epoch:mega:proof:x2
- npm run -s verify:executor:commands:guard
- npm run -s verify:regression:no-network-in-verify-profit
- npm run -s verify:regression:smoke-is-first
- npm run -s verify:regression:public-no-smoke-bypass
- npm run -s verify:regression:no-unbounded-spawn
- npm run -s verify:regression:node22-wrapper-timeout
- npm run -s verify:regression:public-diag-bounded
- npm run -s verify:regression:export-final-validated-x2
- npm run -s verify:profit:foundation

Timeout budget note (full-chain regeneration):
- Do not run mega proof with very small timeout budgets.
- Example only: `EXEC_TIMEOUT_MS=1800000 NODE22_WRAPPED_TIMEOUT=3600s npm run -s epoch:mega:proof:x2`

NEXT_ACTION: npm run -s epoch:foundation:seal
