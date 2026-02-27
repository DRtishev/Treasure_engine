# REGRESSION_NODE_VENDOR01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 6b2dc334f979
NEXT_ACTION: npm run -s epoch:victory:seal

## COMMANDS
- bash scripts/ops/node_authority_run.sh node -v

- receipt_path: reports/evidence/EPOCH-NODEAUTH-6b2dc33_npm_run_s_epoch_victory_seal/node_authority/receipt.json
- witness_path: reports/evidence/EPOCH-NODEAUTH-6b2dc334f979/node_authority/BACKEND_WITNESS.json
- wrapped_ec: 0
- wrapped_node_version: v22.22.0
- selected_backend: VENDORED_NODE22

## CHECKS
- wrapped_ec_zero: true
- selected_backend_vendored: true
- wrapped_node_version_v22220: true
- witness_lock_present_true: true
- witness_node_present_true: true
- witness_exec_ok_true: true
