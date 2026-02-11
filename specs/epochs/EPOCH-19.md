# EPOCH-19

## REALITY SNAPSHOT
- Current baseline already exposes offline verification scripts through npm gates.
- Existing modules in core/scripts are reused; unknown contract gaps are marked "Requires verification".
- Evidence path target for this planning cycle: `reports/evidence/EPOCH-BOOT.AUTOPILOT/`.

## GOALS / NON-GOALS
### Goals
- Enforce governance mode FSM transitions with explicit safety constraints.
- Ensure governance decisions are auditable in event outputs.

### Non-goals
- No uncontrolled refactors unrelated to the epoch contract.
- No default-on network verification path.

## CONSTRAINTS
- Offline-first by default; network checks must be explicit opt-in.
- Determinism via seed discipline (`SEED=12345` default).
- Run-dir discipline through `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- No live trading activation without explicit approvals.

## DESIGN (contracts + interfaces + invariants)
- Primary contracts: `ExecutionAdapter`, `EventLog`, `RunContext`, `RiskGuard`, `GovernanceFSM`, `ReleaseGovernor`.
- Invariant: baseline gates (`verify:e2`, `verify:paper`) remain passing.
- Invariant: epoch gate remains reproducible across anti-flake reruns.
- Unknowns in adapter compatibility are marked: Requires verification.

## PATCH PLAN (file list, minimal diffs policy)
- Update only epoch-specific modules/gates and relevant docs.
- Keep diffs minimal and evidence-backed.
- Preserve backward compatibility for existing npm gate entry points.

## VERIFY (gates, commands, expected outputs, anti-flake rules)
- Run baseline wall gates plus epoch-specific gate.
- Repeat critical gates (anti-flake) where defined.
- Fail on schema mismatch, checksum mismatch, or drift.

## EVIDENCE REQUIREMENTS (paths, logs, manifests)
- Evidence directory: `reports/evidence/EPOCH-19/` (or boot evidence for planning cycle).
- Required: gate logs, `DIFF.patch`, checksum manifests, `SUMMARY.md`, `VERDICT.md`.
- Export hash references required for release-facing epochs.

## STOP RULES (PASS/FAIL criteria)
- PASS only if required gates pass and evidence is complete.
- FAIL/BLOCKED if any critical gate/checksum fails or required evidence is missing.

## RISK REGISTER (incl. meta-risks)
- Functional risk: hidden coupling between epoch contracts.
- Meta-risks: flaky tests, hidden state, clean-clone drift, non-deterministic timestamps.

## ROLLBACK PLAN
- Revert epoch commits.
- Re-run baseline gates to confirm recovery.

## ACCEPTANCE CRITERIA (checkbox list)
- [ ] Required contracts implemented/verified.
- [ ] Required gates pass with anti-flake policy.
- [ ] Evidence folder complete with manifest validation.

## NOTES (compatibility concerns)
- Keep npm scripts stable for downstream automation.
- Flag unresolved assumptions as Requires verification.
