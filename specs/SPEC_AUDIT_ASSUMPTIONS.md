# Spec Audit Assumptions Ledger

## Repository / Structure
1. `package.json` exists at repository root and defines verification scripts. **[VERIFIED]**
2. Canonical spec location is `specs/` with epoch documents under `specs/epochs/`. **[VERIFIED]**
3. Auxiliary files referenced by historical planning prompts (`TASK-*.md`, `PHASE_1_PROGRESS.md`) are absent. **[CONFLICT]**

## Script / Gate Availability
4. `verify:e2`, `verify:paper`, `verify:e2:multi`, `verify:phase2`, `verify:integration`, `verify:core` exist and are runnable offline. **[VERIFIED]**
5. `verify:safety` exists; `verify:strategy`, `verify:governance`, `verify:monitoring`, `verify:prod` are not implemented yet. **[PARTIALLY VERIFIED]**

## Environment Variables / Runtime
6. `SEED` is used for deterministic replay. **[VERIFIED]**
7. `TREASURE_RUN_DIR` and `TREASURE_RUN_ID` are used to scope run artifacts. **[VERIFIED]**
8. `ENABLE_NETWORK_TESTS=1` is required to enable network smoke checks. **[VERIFIED]**
9. `FORCE_TRADES=1` is used only for paper verification stabilization in wrapped flow. **[VERIFIED]**

## Run-Scoped Conventions
10. E2 artifacts are expected under `reports/runs/e2/<seed>/<repeat>/<run_id>/`. **[VERIFIED]**
11. Paper artifacts are expected under `reports/runs/paper/<seed>/<repeat>/<run_id>/`. **[VERIFIED]**

## Determinism Guarantees
12. Baseline anti-flake policy requires at least two runs of E2 and Paper. **[VERIFIED]**
13. Multi-seed structural drift detection is required for E2. **[VERIFIED]**
14. No canonical artifact should depend on unscoped wall-clock/random IDs. **[PARTIALLY VERIFIED]**

## Conflict Resolution
- Conflicts and partial verifications are tracked in `specs/SPEC_CONFLICTS.md`.
