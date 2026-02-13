# FACTORY DOCTRINE

## SSOT rules
- Epoch ceiling is derived from `specs/epochs/LEDGER.json` only.
- `verify:ssot` fails on ledger gaps, missing `EPOCH-XX.md`, or missing INDEX mappings.

## Freeze regression
- `verify:epochs:freeze` applies to DONE epochs `>=41` plus epochs with `pack_index.json`.
- Each target requires `pack:verify`, verifier replay under `EVIDENCE_WRITE_MODE=ASSERT_NO_DIFF`, and SHA match against committed `SHA256SUMS.EVIDENCE` for mutable machine artifacts.

## Determinism lint
- `verify:repo` scans deterministic roots (`core/edge`, `core/paper`, `core/canary`, `core/sys`) for forbidden nondeterminism primitives.
- Allowed exceptions are restricted to explicit system abstractions (`core/sys/clock.mjs`, `core/sys/rng.mjs`).

## Offline / network policy
- Network paths must require `ENABLE_NETWORK=1` and `PROVIDER_ALLOWLIST` includes target provider.
- `verify:offline` asserts network scripts refuse execution without flags while core verification continues offline.

## Release reproducibility
- `release:build` uses deterministic input ordering and normalized tar metadata.
- `verify:release` with `RELEASE_REPRO=1` rebuilds and requires identical hashes for `FINAL_VALIDATED.zip` and `evidence_chain.tar.gz`.
