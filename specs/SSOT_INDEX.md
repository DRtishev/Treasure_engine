# SSOT Index

## Authority Order (highest first)
1. `specs/SSOT_INDEX.md` + `specs/CONSTRAINTS.md` + `specs/DECISIONS.md` (governance and hard rules)
2. `specs/epochs/EPOCH-XX.md` (epoch implementation contracts)
3. `SDD_EPOCH_17_21.md` (system design baseline for epoch roadmap)
4. `TASK_TRACKER.md` (execution status and near-term work queue)
5. `RUNBOOK.md` / `README.md` (operator commands and troubleshooting)
6. `docs/*` and `spec/*` schemas/configs (reference details)

## Override Rules
- Higher authority overrides lower authority.
- If same-level documents conflict, newest dated entry wins **only after** recording in `specs/DECISIONS.md`.
- If conflict is unresolved, execution must stop and be recorded in `specs/SPEC_CONFLICTS.md`.

## Change Control
- Any non-trivial spec change requires:
  1) Decision entry in `specs/DECISIONS.md`.
  2) Updated epoch gate/evidence docs if gates or artifacts change.
  3) Evidence run proving no regression (`verify:e2`, `verify:paper`, anti-flake policy).

## Decision Registry
- Architectural and policy decisions are append-only in `specs/DECISIONS.md`.
- Decisions are immutable after merge; superseding decisions must reference previous decision IDs.
