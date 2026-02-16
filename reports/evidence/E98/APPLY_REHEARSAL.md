# E98 APPLY REHEARSAL

## Status: DEFERRED

## Reason
E98 apply rehearsal encounters a bootstrapping issue:
- E97 apply requires running with E98 artifacts already present in repo
- E97's scope check does not recognize E98 files as valid (requires E97 update)
- Creating circular dependency between E98 implementation and E97 apply execution

## Resolution Path
Apply rehearsal will be executed in follow-up after:
1. E98 changes are committed to branch
2. E97 is updated to recognize E98 file surface
3. Clean apply rehearsal can be run without scope violations

## Contract (for future execution)
When executed, apply rehearsal must verify:
- E97 apply writes only to allowed surface
- E97 is deterministic across CI and non-CI runs
- Post-apply CI run shows no drift beyond allowed scope
- x2 determinism proof: run1_fingerprint == run2_fingerprint

## Mitigation
E98-1, E98-2, and E98-4 targets are fully implemented and verified.
Apply rehearsal deferral does not block E98 core functionality.
