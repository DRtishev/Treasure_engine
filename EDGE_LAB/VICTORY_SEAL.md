# VICTORY_SEAL.md

STATUS: ACTIVE

Gate SSOT: `npm run -s epoch:victory:seal`

Truth separation:
- FOUNDATION PASS != DATA READY
- Victory PASS requires readiness PASS.
- Readiness NEEDS_DATA is valid and fail-closed.

Victory steps (strict order):
1. verify:regression:determinism-audit
2. verify:regression:netkill-physics-full-surface
3. verify:regression:node-options-preload-eviction
4. verify:regression:net-kill-preload-hard
5. verify:regression:net-kill-preload-path-safe
6. verify:regression:executor-netkill-runtime-ledger
7. epoch:foundation:seal
8. verify:public:data:readiness
9. export:evidence-bundle
10. export:evidence-bundle:portable
11. verify:regression:evidence-bundle-deterministic-x2
12. verify:regression:evidence-bundle-portable-mode
13. verify:regression:portable-manifest-env-byte-free-strict
14. verify:regression:operator-single-action-ssot
15. verify:regression:gate-receipt-presence-contract

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

## Deterministic timeout budgets (per-step)
- Timeouts are assigned by step plan SSOT (`scripts/executor/victory_steps.mjs`).
- Default step timeout: `180000` ms.
- `epoch:foundation:seal`: `900000` ms.
- `verify:regression:evidence-bundle-deterministic-x2`: `600000` ms.
- Triage and seal share the same step plan and timeout budgets.

## TO01 timeout triage receipts
- Any `TO01` must include `timeout_step_index`, `timeout_cmd`, `timeout_elapsed_ms`, and `timeout_ms` in `victory_seal.json`.
- Triage JSON must include `first_failing_step_index`, `first_failing_cmd`, `steps[].elapsed_ms`, and sorted `evidence_paths[]`.
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
