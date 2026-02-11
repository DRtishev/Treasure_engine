# EPOCH-17 — Safety Integrated Executor

## 1) Reality Snapshot (current repo)
- Execution adapters and safety hooks exist: `core/exec/adapters/live_adapter.mjs`, `core/exec/adapters/live_adapter_dryrun.mjs`, `core/exec/adapters/safety_gates.mjs`.
- Gate-level safety checks exist: `core/exec/safety_gate_validator.mjs`, `scripts/verify/safety_gates_check.mjs`.
- Risk governor and thresholds are defined and used in simulation path: `core/risk/risk_governor.mjs`, `spec/ssot.json`.
- Master execution/event infrastructure already exists: `core/exec/master_executor.mjs`, `core/obs/event_log_v2.mjs`, `core/sys/context.mjs`.
- Deterministic run-dir wrapper exists for core gates: `scripts/verify/run_with_context.mjs`.

## 2) Goal / Non-goals
### Goal
Create a safety-integrated execution bridge so execution intents cannot bypass risk + safety checks before paper/live adapters are called.

### Non-goals
- No strategy redesign.
- No direct live trading enablement by default.
- No changes to Truth Layer formulas in `spec/ssot.json`.

## 3) Constraints
- Network-dependent tests remain opt-in only (`ENABLE_NETWORK_TESTS=1`).
- Deterministic verify paths must remain seed-based (`SEED=12345` default).
- Backward compatibility: `npm run verify:e2`, `npm run verify:paper`, `npm run verify:core` must continue to pass.
- Default mode remains DRY_RUN/paper-safe.

## 4) Design (interfaces, contracts, events)
### Proposed interface
`SafetyIntegratedExecutor.execute(intent, context)`:
1. Validate mode and kill-switch state.
2. Run `risk_governor.preCheck(intent, portfolioState)`.
3. Run safety gate validator.
4. Route to adapter (`PaperAdapter` or `LiveAdapterDryRun` unless explicit live approval path is met).
5. Emit deterministic event records (`SYS`, `RISK`, `EXEC`) through `EventLogV2`.

### Data contracts
- Intent input: symbol, side, qty/notional, strategy_id, reason, mode.
- Pre-check result: `{allowed:boolean, reason:string, caps_snapshot:object}`.
- Execution result: `{success:boolean, order_id:string|null, fills:[], blocked_reason?:string}`.

### Event schema alignment
- Must conform to `truth/event.schema.json` and existing category conventions in `core/obs/event_log_v2.mjs`.

## 5) Patch Plan
### New files
- `core/exec/safety_integrated_executor.mjs`
- `core/risk/risk_governor_wrapper.mjs`
- `truth/live_config.schema.json`
- `scripts/verify/safety_integrated_executor_check.mjs`

### Modified files
- `core/exec/master_executor.mjs` (optional integration hook)
- `scripts/verify/safety_gates_check.mjs` (expand assertions)
- `package.json` (add `verify:epoch17` gate)

## 6) New/updated verify gates
- `npm run verify:epoch17` → `node scripts/verify/safety_integrated_executor_check.mjs`
- Asserts:
  - blocked execution when risk pre-check fails
  - blocked execution when kill switch/circuit breaker active
  - deterministic event emission and schema validity
  - no live route unless explicit governance preconditions are true

## 7) Evidence requirements
`reports/evidence/EPOCH-17/` must include:
- `PREFLIGHT.log`, `GATE_PLAN.md`, `gates/verify_epoch17.log`
- anti-flake logs for `verify:e2` x2 and `verify:paper` x2
- `DIFF.patch`, `SHA256SUMS.SOURCE.txt`, `SHA256SUMS.EVIDENCE.txt`, `SUMMARY.md`

## 8) Stop rules (PASS/FAIL)
PASS only if:
- `verify:epoch17` PASS
- `verify:e2` x2 PASS
- `verify:paper` x2 PASS
- `verify:e2:multi` PASS
- no unsafe live routing in default mode

FAIL if any above fails or safety bypass is detected.

## 9) Risk register
1. Safety check invoked after adapter call (wrong order) → enforce pre-check ordering test.
2. Mode drift to live path without governance flag → add explicit mode guard assertions.
3. Non-deterministic timestamps in canonical outputs → keep nondeterministic fields in run-local logs only.
4. Incomplete risk snapshots in events → assert required payload fields in gate.
5. Backward compatibility regressions in `verify:core` → run full regression wall before merge.

## 10) Rollback plan
- Revert `safety_integrated_executor` integration points.
- Keep existing `master_executor` route and safety validator behavior intact.
- Re-run `verify:core` and restore prior evidence pack if rollback is needed.
