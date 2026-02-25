# VICTORY_SEAL.md

STATUS: ACTIVE

Gate SSOT: `npm run -s epoch:victory:seal`

Truth separation:
- FOUNDATION PASS != DATA READY
- Victory PASS requires readiness PASS.
- Readiness NEEDS_DATA is valid and fail-closed.

Victory steps (strict order):
1. verify:regression:determinism-audit
2. verify:regression:net-kill-preload-hard
3. verify:regression:net-kill-preload-path-safe
4. verify:regression:executor-netkill-runtime-ledger
5. epoch:foundation:seal
6. verify:public:data:readiness
7. export:evidence-bundle
8. export:evidence-bundle:portable
9. verify:regression:evidence-bundle-deterministic-x2
10. verify:regression:evidence-bundle-portable-mode

Evidence checklist:
- reports/evidence/EXECUTOR/VICTORY_SEAL.md
- reports/evidence/EXECUTOR/gates/manual/victory_seal.json
- reports/evidence/EXECUTOR/REGRESSION_EXECUTOR_NETKILL_RUNTIME_LEDGER.md
- reports/evidence/EXECUTOR/gates/manual/regression_executor_netkill_runtime_ledger.json
- reports/evidence/EXECUTOR/PROFIT_FOUNDATION_FREEZE_GATE.md
- reports/evidence/EXECUTOR/gates/manual/profit_foundation_freeze_gate.json
- reports/evidence/EXECUTOR/PUBLIC_DATA_READINESS_SEAL.md
- reports/evidence/EXECUTOR/gates/manual/public_data_readiness_seal.json

NEXT_ACTION: npm run -s epoch:victory:seal


## SNAP01 hard-stop precheck
- `epoch:victory:seal` runs `npm run -s executor:clean:baseline` before cleanliness checks.
- `epoch:victory:seal` must run clean-tree precheck first (`git status -sb` + `git diff --name-only`).
- If dirty, run is `BLOCKED` with `REASON_CODE: SNAP01` and exits immediately.
- Receipts: `reports/evidence/EXECUTOR/VICTORY_PRECHECK.md` and `reports/evidence/EXECUTOR/gates/manual/victory_precheck.json`.

## TO01 timeout triage receipts
- Any `TO01` must include `timeout_step_index`, `timeout_cmd`, `timeout_elapsed_ms`, and `timeout_ms` in `victory_seal.json`.
- Dedicated artifact is mandatory: `reports/evidence/EXECUTOR/VICTORY_TIMEOUT_TRIAGE.md` + `gates/manual/victory_timeout_triage.json`.

## Optional triage command
- Optional isolator: `npm run -s epoch:victory:triage`.
- Main operator `NEXT_ACTION` remains unchanged and env-free: `npm run -s epoch:victory:seal`.

## OP_SAFE01 restore safety guard
- `epoch:victory:seal` blocks with `REASON_CODE: OP_SAFE01` when tracked/staged modifications exist before baseline restore.
- Explicit override is required: `TREASURE_I_UNDERSTAND_RESTORE=1`.
- Safety receipts: `reports/evidence/EXECUTOR/BASELINE_SAFETY.md` and `reports/evidence/EXECUTOR/gates/manual/baseline_safety.json`.

## Baseline telemetry semantic/volatile split
- Semantic telemetry fields:
  - `baseline_files_restored_n`
  - `baseline_evidence_removed_n`
- Volatile telemetry fields:
  - `baseline_clean_elapsed_ms`
- `baseline_clean_elapsed_ms` must not appear in semantic sections or semantic hashes.
