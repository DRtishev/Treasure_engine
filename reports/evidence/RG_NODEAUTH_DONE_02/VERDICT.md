# RG_NODEAUTH_DONE_02 VERDICT

## SNAPSHOT
- Objective: eliminate NT02 by making Node22 backend available to `node_authority_run.sh`.
- Evidence cycle: `reports/evidence/RG_NODEAUTH_DONE_02/`.

## WHAT_CHANGED
- Added backend diagnostic script `scripts/ops/node_backend_check.sh` with deterministic MD/JSON receipts.
- Added vendored toolchain acquisition script `scripts/ops/node_toolchain_acquire.mjs` that downloads Node v22.22.0 archive, verifies SHA256 from upstream SHASUM list, extracts toolchain, and writes lock receipt.
- Extended `scripts/ops/node_authority_run.sh` backend ladder to: HOST -> DOCKER/PODMAN -> VENDORED lock-gated toolchain -> BLOCKED NT02.
- Added `verify:regression:node-toolchain-lock-contract` to prove lock-file gating and vendored backend selection.
- Added npm scripts for backend check/toolchain acquire/regression lock contract.
- Added gitignore rule for `artifacts/toolchains/node/` to prevent committing binary toolchains.

## COMMANDS_EXECUTED
- See `reports/evidence/RG_NODEAUTH_DONE_02/COMMANDS.txt` and logs in `reports/evidence/RG_NODEAUTH_DONE_02/logs/`.

## GATE_MATRIX
- PASS: `bash -n scripts/ops/node_authority_run.sh`
- PASS: `bash -n scripts/ops/node_backend_check.sh`
- BLOCKED NT02: `npm run -s ops:node:backend:check` (docker path unavailable)
- PASS: `npm run -s ops:node:toolchain:acquire`
- PASS: `npm run -s verify:regression:node-truth-alignment`
- PASS: `npm run -s verify:regression:node-wrap-contract`
- PASS: `bash scripts/ops/node_authority_run.sh --selftest`
- PASS: `npm run -s verify:regression:node-backend-receipt-contract`
- PASS: `npm run -s verify:regression:node-toolchain-lock-contract`
- BLOCKED OP_SAFE01 (NOT NT02): `npm run -s epoch:victory:seal`

## EVIDENCE_PATHS
- Backend check receipts:
  - `reports/evidence/EXECUTOR/NODE_BACKEND_CHECK.md`
  - `reports/evidence/EXECUTOR/gates/manual/node_backend_check.json`
- Toolchain acquire receipts:
  - `reports/evidence/EXECUTOR/NODE_TOOLCHAIN_ACQUIRE.md`
  - `reports/evidence/EXECUTOR/gates/manual/node_toolchain_acquire.json`
  - `artifacts/toolchains/node/v22.22.0/node-v22.22.0-linux-x64.lock.json`
- Node authority runtime receipts:
  - `reports/evidence/EXECUTOR/NODE_AUTHORITY_RECEIPT.md`
  - `reports/evidence/EXECUTOR/gates/manual/node_authority_receipt.json`
- Regression receipt:
  - `reports/evidence/EXECUTOR/REGRESSION_NODE_TOOLCHAIN_LOCK_CONTRACT.md`
  - `reports/evidence/EXECUTOR/gates/manual/regression_node_toolchain_lock_contract.json`
- Checksums:
  - `reports/evidence/RG_NODEAUTH_DONE_02/SHA256SUMS.SOURCE.txt`
  - `reports/evidence/RG_NODEAUTH_DONE_02/SHA256SUMS.EVIDENCE.txt`

## VERDICT
PASS for mission objective: NT02 eliminated by lock-gated VENDORED_NODE22 backend availability (authority receipt shows backend `VENDORED_NODE22`, node runtime `v22.22.0`). Remaining block is OP_SAFE01 in victory gate, not backend availability.

## ONE_NEXT_ACTION
npm run -s epoch:victory:seal
