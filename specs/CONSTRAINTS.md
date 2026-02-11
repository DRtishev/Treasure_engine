# TREASURE ENGINE CONSTRAINTS

## 1. Offline-first policy
- Default verification path must not require network.
- Any network-dependent check must be opt-in and gated by `ENABLE_NETWORK_TESTS=1`.
- CI/verification baseline assumes network unavailable.

## 2. Determinism policy
- Canonical seed default: `SEED=12345`.
- Same seed must produce the same structural outputs for deterministic gates.
- Any unavoidable non-deterministic field (time, environment metadata) must be isolated and documented.
- Drift detection is mandatory via repeated runs and multi-seed verification.

## 3. Run-dir discipline
- Gate outputs with run variance must use: `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- New gates/wrappers must preserve this layout.

## 4. Evidence discipline
- Every implementation epoch requires an evidence folder under `reports/evidence/<EPOCH-ID>/`.
- Required artifacts: preflight snapshot, gate logs, patch diff, checksum manifests, summary/verdict.
- No PASS/SAFE claim without command logs and artifact paths.

## 5. Safety policy
- No live trading by default.
- Any live-like path requires explicit enable flags, safety checks, and audit events.
- Emergency stop and rollback paths must remain available.

## 6. Anti-regression policy
- Critical gates run with anti-flake repeats where defined.
- Regression wall must include baseline functional and integration checks.
- Manifest checks (`sha256sum -c`) are required before release verdict.
