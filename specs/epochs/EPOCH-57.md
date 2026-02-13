# EPOCH-57 — TRUTH-RESYNC + ANTI-DRIFT FACTORY

## REALITY SNAPSHOT
- Hardcoded epoch bounds in specs verification allowed validation bypass for newly added epochs.
- DONE epochs had no automated freeze regression to detect evidence drift.
- E55/E56 paper fitness contract drift caused recurring schema incompatibilities.

## GOALS
- Make epoch range derive from SSOT ledger with gap/missing-file failure semantics.
- Enforce DONE epoch immutability with a freeze regression gate.
- Eliminate E55/E56 schema drift via explicit versioned paper fitness API.

## NON-GOALS
- No functional expansion beyond anti-drift/verification factory scope.
- No dependence on network for default PASS path.
- No bypass of risk fortress controls.

## CONSTRAINTS
- Deterministic outputs under repeated CI=true runs.
- Freeze mode must be non-mutating for committed evidence directories.
- Gate integration must allow local opt-out via `FREEZE_REGRESSION=0`.

## DESIGN / CONTRACTS
- SSOT auto-range: `scripts/verify/specs_check.mjs` derives max epoch from `specs/epochs/LEDGER.json`.
- Freeze gate: `scripts/verify/epoch_freeze_regression.mjs` runs pack verify + ASSERT_NO_DIFF comparisons.
- Evidence write mode helper: `core/evidence/evidence_write_mode.mjs`.
- Version split: `core/paper/paper_fitness_lab_v1.mjs` for E55, existing v2 for E56.

## PATCH PLAN
- Remove hardcoded `EPOCH_END` and enforce ledger continuity in specs check.
- Add freeze regression script + npm command + CI wiring.
- Update epoch verifiers (49..56) to honor `EVIDENCE_WRITE_MODE`.
- Add doctrine documentation and update epoch index/ledger for E57.

## VERIFY
- `npm run verify:specs`
- `npm run verify:epochs:freeze`
- `npm run verify:treasure`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-57/PREFLIGHT.log`
- `reports/evidence/EPOCH-57/COMMANDS.log`
- `reports/evidence/EPOCH-57/SNAPSHOT.md`
- `reports/evidence/EPOCH-57/SUMMARY.md`
- `reports/evidence/EPOCH-57/VERDICT.md`
- `reports/evidence/EPOCH-57/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-57/pack_index.json`

## STOP RULES
- Stop on first gate failure, patch minimally, rerun failing gate then full matrix.
- Stop if freeze regression detects sha drift in DONE epoch manual evidence.
- Stop if ledger continuity or epoch spec presence checks fail.

## RISK REGISTER
- Missing verifier scripts for historical DONE epochs may reduce freeze coverage.
- Legacy evidence packs with stale manifests can trigger pack verification failures.
- CI runtime may increase as freeze target set expands.

## ACCEPTANCE CRITERIA
- [ ] Specs check computes epoch range from ledger max key and rejects gaps.
- [ ] Specs check requires every ledger epoch spec file through max epoch.
- [ ] Freeze regression verifies pack integrity before non-mutating replay checks.
- [ ] ASSERT_NO_DIFF replay compares generated/manual sha256 values and fails on drift.
- [ ] E55 verifier uses v1 schema while E56 remains on v2 schema.

## NOTES
- E57 is the anti-drift factory baseline for future epoch additions.
