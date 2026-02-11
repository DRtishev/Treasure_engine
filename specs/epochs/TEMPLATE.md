# EPOCH-XX

## REALITY SNAPSHOT
- Describe the current implementation reality, available modules, and verified gaps.
- Include explicit references to existing gates and known blockers.

## GOALS / NON-GOALS
### Goals
- List measurable outcomes for the epoch.

### Non-goals
- List explicitly out-of-scope changes.

## CONSTRAINTS
- Offline-first verification by default.
- Determinism requirements (seed discipline, non-deterministic field policy).
- Safety constraints (no live trading by default, explicit opt-in controls).

## DESIGN (contracts + interfaces + invariants)
- Contracts to implement/update.
- Interface boundaries and compatibility notes.
- Invariants that must remain true.

## PATCH PLAN (file list, minimal diffs policy)
- Files expected to change.
- Minimal-diff and rollback-friendly strategy.

## VERIFY (gates, commands, expected outputs, anti-flake rules)
- Required gates and order.
- Anti-flake rerun policy.
- Expected structural outputs and failure criteria.

## EVIDENCE REQUIREMENTS (paths, logs, manifests)
- Required evidence folder path.
- Required logs and checksum manifests.
- Any additional artifacts needed for acceptance.

## STOP RULES (PASS/FAIL criteria)
- PASS criteria with objective checks.
- FAIL/BLOCKED criteria and escalation path.

## RISK REGISTER (incl. meta-risks)
- Functional risks.
- Meta-risks: flake, hidden state, clean-clone regressions, drift.

## ROLLBACK PLAN
- Exact rollback and re-verification steps.

## ACCEPTANCE CRITERIA (checkbox list)
- [ ] Contract implementation complete.
- [ ] Required gates pass (including anti-flake repeats).
- [ ] Evidence is complete and checksums validate.

## NOTES (compatibility concerns)
- Backward compatibility considerations.
- Migration and operator notes.
