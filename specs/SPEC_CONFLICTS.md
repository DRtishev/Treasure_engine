# Spec Conflicts

## C-001 — Missing auxiliary planning files
- Conflict: prompts referenced `TASK-*.md` and `PHASE_1_PROGRESS.md`, but repository does not contain them.
- Resolution: treat `SDD_EPOCH_17_21.md`, `TASK_TRACKER.md`, and `docs/SPEC_OF_SPECS.md` as active planning inputs.
- Action: keep this conflict open until missing files are restored or formally deprecated.

## C-002 — Nonexistent future gates in epoch roadmap
- Conflict: EPOCH-18..21 require gates (`verify:strategy`, `verify:governance`, `verify:monitoring`, `verify:prod`) that do not yet exist.
- Resolution: mark these gates explicitly as **TO IMPLEMENT** in epoch gate docs and in matrix.
- Action: each epoch implementation must add the gate script before claiming readiness.

## C-003 — Determinism vs verify-only probes
- Conflict: paper gate relies on verify-only synthetic probes when `FORCE_TRADES=1`.
- Resolution: allowed for CI stability, but must remain wrapper-scoped and documented as synthetic in specs and evidence summaries.
- Action: replace probes with deterministic trade fixtures in a future hardening pass.
