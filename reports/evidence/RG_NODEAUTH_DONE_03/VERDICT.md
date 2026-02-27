# RG_NODEAUTH_DONE_03 VERDICT

## SNAPSHOT
- Objective: eliminate OP_SAFE01 by enforcing cert write-scope guard and route node authority receipts out of EXECUTOR for authoritative wrapped commands.
- Evidence cycle: `reports/evidence/RG_NODEAUTH_DONE_03/`.

## WHAT_CHANGED
- Added WRITE_SCOPE_GUARD policy to `executor_epoch_victory_seal.mjs` using allowed roots `reports/evidence/EPOCH-*` and `artifacts/**`.
- Replaced OP_SAFE01 cert block path with CHURN01 and surfaced sorted `offenders_outside_allowed_roots` in `victory_precheck.json` and `VICTORY_SEAL` block classification.
- Updated `scripts/ops/node_authority_run.sh` routing: authoritative wrapped commands now emit receipts under `reports/evidence/EPOCH-NODEAUTH-<deterministic_id>/node_authority/{RECEIPT.md,receipt.json}`; selftest/non-authoritative continue using EXECUTOR.
- Added regressions:
  - `RG_CHURN01`: `verify:regression:churn-write-scope-guard`
  - `RG_NODE_CHURN01`: `verify:regression:node-churn-receipt-routing`

## COMMANDS_EXECUTED
- See `reports/evidence/RG_NODEAUTH_DONE_03/COMMANDS.txt`.
- Logs in `reports/evidence/RG_NODEAUTH_DONE_03/logs/`.

## GATE_MATRIX
- PASS: `bash -n scripts/ops/node_authority_run.sh`
- PASS: `npm run -s ops:node:toolchain:acquire`
- BLOCKED CHURN01: `npm run -s epoch:victory:seal`
- PASS: `npm run -s verify:regression:churn-write-scope-guard`
- PASS: `npm run -s verify:regression:node-churn-receipt-routing`
- PASS: `bash scripts/ops/node_authority_run.sh --selftest`
- PASS: `npm run -s verify:regression:node-backend-receipt-contract`

## EVIDENCE_PATHS
- Victory write-scope evidence:
  - `reports/evidence/EXECUTOR/VICTORY_PRECHECK.md`
  - `reports/evidence/EXECUTOR/gates/manual/victory_precheck.json`
  - `reports/evidence/EXECUTOR/VICTORY_SEAL.md`
  - `reports/evidence/EXECUTOR/gates/manual/victory_seal.json`
- Node receipt routing evidence:
  - `reports/evidence/EXECUTOR/REGRESSION_NODE_CHURN_RECEIPT_ROUTING.md`
  - `reports/evidence/EXECUTOR/gates/manual/regression_node_churn_receipt_routing.json`
  - `reports/evidence/EPOCH-NODEAUTH-*/node_authority/RECEIPT.md`
  - `reports/evidence/EPOCH-NODEAUTH-*/node_authority/receipt.json`
- Regression outputs:
  - `reports/evidence/EXECUTOR/REGRESSION_CHURN_WRITE_SCOPE_GUARD.md`
  - `reports/evidence/EXECUTOR/gates/manual/regression_churn_write_scope_guard.json`

## VERDICT
PASS for mission changes: OP_SAFE01 removed from cert blocker path and replaced with CHURN01 write-scope classification; authoritative wrapper receipts are routed to EPOCH-NODEAUTH scope instead of EXECUTOR during authoritative command wrapping.

## ONE_NEXT_ACTION
npm run -s epoch:victory:seal
