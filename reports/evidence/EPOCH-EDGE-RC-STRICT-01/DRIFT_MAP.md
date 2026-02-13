# Drift Map

## Findings
- E31 runtime lacked explicit FeatureStore PiT query API with hard invariants (NaN/Inf rejection and timestamp monotonicity checks).
- RC flow lacked deterministic FINAL_VALIDATED export into RC evidence namespace.

## Resolution
- Added `FeatureStore`, PiT query semantics, monotonic timestamp invariant, and finite-value checks in `core/edge/runtime.mjs`.
- Added E31 combat assertions in epoch31 gate proving future-mutation invariance and must-fail leak injection.
- Added deterministic export script `scripts/export/final_validated.mjs` and package script `export:final-validated`.
