# EPOCH-58 — FACTORY STERILITY MASTER

## REALITY SNAPSHOT
- E57 established SSOT range and freeze basics but left partial coverage and missing factory gates.
- Determinism lint and offline guardrails were not enforced as first-class verify gates.
- Release reproducibility needed explicit two-build verification.

## GOALS
- Add explicit SSOT, contracts, offline, and reproducibility gates.
- Harden freeze regression coverage for DONE epochs >=41 with strict drift reporting.
- Document factory sterility doctrine and evidence discipline.

## NON-GOALS
- No live trading enablement.
- No network requirement for default PASS.
- No feature work outside verification factory scope.

## CONSTRAINTS
- Determinism-first and offline-first defaults.
- DONE epoch evidence is immutable.
- All claims must be backed by evidence logs.

## DESIGN / CONTRACTS
- `verify:ssot` enforces ledger-derived epoch range + index completeness.
- `verify:contracts` validates v1/v2 paper fitness contracts and schema_version presence.
- `verify:offline` ensures network scripts fail closed without policy flags.
- `verify:release` adds `RELEASE_REPRO=1` two-build hash consistency checks.

## PATCH PLAN
- Implement gates and wire into package scripts.
- Extend repo sanity with nondeterminism lint in deterministic roots.
- Add network guard helper and enforce guarded network scripts.

## VERIFY
- `npm run verify:ssot`
- `npm run verify:contracts`
- `npm run verify:offline`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-58/PREFLIGHT.log`
- `reports/evidence/EPOCH-58/COMMANDS.log`
- `reports/evidence/EPOCH-58/SNAPSHOT.md`
- `reports/evidence/EPOCH-58/SUMMARY.md`
- `reports/evidence/EPOCH-58/VERDICT.md`
- `reports/evidence/EPOCH-58/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-58/pack_index.json`

## STOP RULES
- Stop on first gate failure, patch minimally, rerun failing gate x2.
- Stop if freeze regression reports any SHA drift.
- Stop if reproducibility hashes differ across two builds.

## RISK REGISTER
- Legacy DONE epochs without verifier scripts may block strict freeze coverage.
- Determinism lint false positives if allowlist is too narrow.
- Reproducible zip behavior can vary across toolchain versions.

## ACCEPTANCE CRITERIA
- [ ] `verify:ssot` passes and reports no ledger/index gaps.
- [ ] `verify:contracts` passes with v1/v2 schema checks.
- [ ] `verify:epochs:freeze` runs DONE>=41 target set and fails on drift.
- [ ] `verify:offline` proves network scripts fail closed by default.
- [ ] `RELEASE_REPRO=1 CI=true npm run verify:release` passes with identical hashes.

## NOTES
- This epoch is strictly governance/factory hardening.
