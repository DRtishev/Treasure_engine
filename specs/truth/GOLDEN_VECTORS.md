# GOLDEN VECTORS

## Scope
Golden vectors enforce semantic drift control for critical deterministic verifiers.

## Selected gates
- `verify:epoch49`
- `verify:epoch50`
- `verify:epoch56`

## Method
1. Execute each gate in deterministic local mode.
2. Canonicalize stdout/stderr by trimming empty lines and removing npm warning noise.
3. Compare SHA256 of canonical output against approved golden hashes in `scripts/verify/goldens/golden_vectors_manifest.json`.

## Update policy
- Update golden hashes only when intentionally changing verifier semantics.
- Any update must include rationale in epoch evidence summary and pass x2 in CI mode.
