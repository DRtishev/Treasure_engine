# EPOCH-56 — TRICKPACK-01 (Fitness v2 + Vault Holdout + Pause-Recover)

## REALITY SNAPSHOT
- E55 and E56 paper fitness contracts drifted and caused schema mismatch risk.
- Specs validation previously depended on hardcoded epoch bounds.
- DONE epochs lacked an automated freeze regression check for evidence immutability.

## GOALS
- Preserve E56 fitness v2 verifier behavior with deterministic outputs.
- Restore compatibility with E55 schema expectations without mutating historical evidence.
- Enable no-diff verification mode for freeze regression.

## NON-GOALS
- No live trading enablement.
- No network requirement for PASS.
- No relaxation of E44 hard-stop constraints.

## CONSTRAINTS
- All checks must be deterministic offline.
- Evidence writes in freeze mode must route to temp paths only.
- Historical E55/E56 committed evidence hashes are immutable.

## DESIGN / CONTRACTS
- Keep `core/paper/paper_fitness_lab.mjs` as schema_version `2.0.0` (E56 contract).
- Introduce `core/paper/paper_fitness_lab_v1.mjs` for E55 legacy contract (`score = net_pnl*100 - hard_stops*3`).
- Route verifier evidence writes through `core/evidence/evidence_write_mode.mjs` to support `EVIDENCE_WRITE_MODE=ASSERT_NO_DIFF`.

## PATCH PLAN
- Add v1 paper fitness lab implementation and wire E55 verifier to v1.
- Add shared evidence write mode helper and update epoch49..epoch56 verifiers.
- Add `verify:epochs:freeze` gate and CI wiring.

## VERIFY
- `npm run verify:epoch56`
- `CI=true npm run verify:epochs:freeze`
- `CI=true npm run verify:treasure`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-56/gates/manual/epoch56_fitness_v2.json`
- `reports/evidence/EPOCH-56/gates/manual/vault_policy_test.json`
- `reports/evidence/EPOCH-56/gates/manual/pause_recover_trace.jsonl`
- `reports/evidence/EPOCH-56/gates/manual/verify_epoch56_result.json`

## STOP RULES
- Stop on any deterministic mismatch between repeated runs.
- Stop if ASSERT_NO_DIFF writes into committed `reports/evidence/EPOCH-56/`.
- Stop if v2 metrics schema omits required fields.

## RISK REGISTER
- Drift risk between legacy and v2 paper fitness schemas.
- Freeze gate runtime expansion as DONE epochs increase.
- False positives if pre-existing evidence pack hashes are stale.

## ACCEPTANCE CRITERIA
- [ ] E55 verifier consumes v1 schema and passes deterministically.
- [ ] E56 verifier consumes v2 schema and passes deterministically.
- [ ] ASSERT_NO_DIFF mode writes only to `.tmp/epoch_freeze/**`.
- [ ] Freeze regression reports precise sha diffs when evidence drifts.
- [ ] `verify:epochs:freeze` can run through CI gating path.

## NOTES
- E56 remains shadow/paper only.
- Freeze regression complements (not replaces) pack integrity verification.
