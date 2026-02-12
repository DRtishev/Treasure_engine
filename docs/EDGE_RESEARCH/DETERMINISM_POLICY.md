# EDGE Determinism Policy

> **SSOT**: This is the single source of truth for determinism rules across E31..E40.
> All epoch specs must reference this document instead of redefining rules per-epoch.
> Changes require review and `verify:specs` re-run.

## Rounding Policy

| Domain | Precision | Example |
|--------|-----------|---------|
| Prices | 1e-8 | `0.00012345` |
| Sizes | 1e-8 | `0.01000000` |
| Returns / Scores | 1e-6 | `0.001234` |
| Probabilities | 1e-6 | `0.720000` |
| Basis points | 1e-4 | `8.0000` |

All rounding uses truncation-toward-zero (deterministic, no banker's rounding).

## JSON Canonicalization

- Encoding: UTF-8, no BOM.
- Key ordering: lexicographic sort on all object keys at every nesting level.
- Array ordering: stable; order is semantically meaningful and must not be shuffled.
- Decimal formatting: fixed-point notation per rounding policy above. No scientific notation (`1e-8` is a precision spec, not a serialization format).
- No trailing commas, no comments, no undefined values.
- Whitespace: compact (no pretty-print) for fingerprint input. Pretty-print is allowed in evidence artifacts but must not be used as fingerprint material.

## Fingerprint Algorithm

- Algorithm: `sha256`.
- Input: canonical JSON of the declared material set.
- Material set per contract is defined in each epoch spec's "Fingerprint rules" subsection.
- Parent hashes, seed, and schema version are always included in fingerprint material.
- Drift definition: any fingerprint mismatch for identical inputs is a deterministic failure.

## Seed Policy

- Default seed: `12345` (per `specs/CONSTRAINTS.md`).
- Seed must be declared in every manifest and run config.
- Stochastic paths without explicit seed are forbidden.
- Cross-seed dispersion beyond **HEURISTIC** bound triggers WARN/FAIL per epoch policy.

## Ordering Policy

- Stable ordering key: `(symbol, timestamp, row_id)` where applicable.
- Feature vector ordering: explicit `feature_vector_order` array in contract.
- Position sets: sorted by `symbol` ascending.
- Any ordering-sensitive operation must declare its sort key in the contract.

## Forbidden Values

All contracts forbid: `NaN`, `Inf`, `-Inf`, negative prices, negative volumes, negative fees, non-monotonic timestamps within `(symbol, bar_interval)`.

## Offline-First Invariant

- Default gates must pass without internet access.
- Network paths require `ENABLE_NETWORK_TESTS=1`.
- No hidden network dependencies in any default verification path.

## Replay Invariant

- Identical inputs + seed + config must produce identical fingerprint.
- Two-run anti-flake is required for spec closeout evidence.
- Any replay mismatch is a hard FAIL.
