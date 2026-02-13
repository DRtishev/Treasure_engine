# LEGACY / NOT SSOT

This document is archived for historical traceability and is not authoritative.
Current SSOT lives under `specs/` and `agents.md`.

---

# NEXT EPOCH PLAN

## Spec source discovery
- `specs/epochs/` directory was not found in this repository.
- Active source-of-truth planning inputs used:
  - `SDD_EPOCH_17_21.md`
  - `TASK_TRACKER.md`
  - `docs/SPEC_OF_SPECS.md`

## Target epoch
- EPOCH-17 continuation: `SafetyIntegratedExecutor` integration track.

## Objectives
1. Implement `core/exec/safety_integrated_executor.mjs` to chain intent validation, risk governor checks, and execution adapter routing.
2. Add `core/risk/risk_governor_wrapper.mjs` for consistent pre/post-trade policy integration.
3. Add `truth/live_config.schema.json` and validation gate for configuration safety.
4. Keep all outputs deterministic and run-scoped in verify paths.

## Planned files to touch
- `core/exec/safety_integrated_executor.mjs`
- `core/risk/risk_governor_wrapper.mjs`
- `truth/live_config.schema.json`
- `scripts/verify/safety_gates_check.mjs` (extend)
- `package.json` (gate wiring if needed)

## New/updated gates
- `npm run verify:safety` extended with executor-wrapper integration checks.
- existing invariants rerun:
  - `npm run verify:e2` (x2)
  - `npm run verify:paper` (x2)
  - `npm run verify:e2:multi`

## Acceptance criteria
- Safety-integrated executor blocks invalid intents and cap breaches deterministically.
- No live orders by default.
- All critical gates pass with evidence logs + manifests.
- No overwrite in run artifacts across repeated runs.

## Stop rules
- Stop and patch immediately if `verify:e2` or `verify:paper` fails.
- Stop if nondeterministic fields leak into canonical artifacts without explicit isolation.
- Stop if run directory discipline is violated by any new verification path.
