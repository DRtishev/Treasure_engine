# Determinism Audit

## Verdict
- Current baseline is **deterministic-first with controlled exceptions**.

## Checks
1. Seed usage defined: **YES** (`SEED` default policy).
2. Clock abstraction expected for critical execution paths: **YES (policy)**.
3. RNG centralized in run-context/simulation helpers: **PARTIAL** (legacy modules may still use local randomness outside critical path).
4. EventLog location controlled by `TREASURE_RUN_DIR`: **YES in wrapped E2/Paper verification flow**.
5. Multi-run drift detection required: **YES** (`verify:e2:multi`).
6. NaN/Infinity blocked in multi-seed structural gate: **YES (via e2 multi checks)**.
7. Hash manifests defined: **YES** (`SHA256SUMS.SOURCE.txt` and `SHA256SUMS.EXPORT.txt`).

## Risks
- Verify-only probes in paper gate are synthetic; deterministic but not market-natural.
- Any non-wrapped raw script invocation may still write global paths.

## Required deterministic-first rules for all epochs
- No network required in default gates.
- All new artifacts must be run-scoped.
- No pass claim without two-run anti-flake evidence where applicable.
