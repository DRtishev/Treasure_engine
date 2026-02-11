# Constraints

## Offline-First Verification
- Default verification must be network-off.
- Network checks must be explicitly gated (`ENABLE_NETWORK_TESTS=1`) and skip cleanly otherwise.

## Safety
- No live trading by default.
- No secrets or credentials in repo/evidence/log artifacts.

## Determinism
- Default seed: `SEED=12345` unless explicitly overridden.
- Critical verification paths must avoid unscoped `Date.now()` / random identifiers in canonical artifacts.
- Run outputs must be run-scoped and isolated:
  - `reports/runs/e2/<seed>/<repeat>/<run_id>/`
  - `reports/runs/paper/<seed>/<repeat>/<run_id>/`

## Anti-Flake Policy
- Minimum anti-flake baseline:
  - `verify:e2` x2
  - `verify:paper` x2
- Multi-seed stability required for E2 (`verify:e2:multi`).

## Evidence Requirements
Each epoch must produce `reports/evidence/<EPOCH-ID>/` containing:
- preflight/install logs
- gate logs (including repeats)
- patch diff
- source/export checksum manifests
- summary with risks and limitations
