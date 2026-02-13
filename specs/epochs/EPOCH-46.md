# EPOCH-46 — Data Plane Determinism & Evidence Bridge

## REALITY SNAPSHOT
- Current state: verification gate exists at `scripts/verify/epoch46_data_plane.mjs`, while SSOT spec was missing.
- Dependency baseline: EPOCH-45 must be DONE before EPOCH-46 can be marked DONE.
- Evidence root for this epoch: `reports/evidence/EPOCH-46/`.

## GOALS
- Define falsifiable contracts for deterministic data-plane behavior.
- Bind EPOCH-46 acceptance to executable gates and strict-mode flags.
- Keep offline-first default posture (network tests opt-in only).

## NON-GOALS
- No live trading enablement.
- No unverifiable PASS claims without evidence pack completeness.
- No dependency on external APIs for default PASS path.

## CONSTRAINTS
- Default commands must run with `CI=true` and deterministic ordering.
- `ENABLE_NETWORK_TESTS=1` remains opt-in and out-of-band for default PASS.
- Evidence pack must include standard files + per-gate logs + checksums.

## DESIGN / CONTRACTS
- Contract A: `npm run verify:epoch46` validates deterministic data-plane invariants.
- Contract B: `npm run verify:specs` must validate this spec file and ledger/index coherence.
- Contract C: `npm run verify:ledger` rejects DONE epochs missing standard evidence pack files.

## PATCH PLAN
- [ ] Add EPOCH-46 spec to SSOT with complete required headings.
- [ ] Synchronize ledger/index states for E42..E46 as DONE/PASS with evidence roots.
- [ ] Normalize evidence packs and enforce completeness checks in verify pipeline.

## VERIFY
- `npm run verify:epoch46`
- `npm run verify:specs`
- `npm run verify:ledger`
- `npm run verify:repo`
- strict mode: `CI=true` for all gate runs

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-46/PREFLIGHT.log`
- `reports/evidence/EPOCH-46/COMMANDS.log`
- `reports/evidence/EPOCH-46/SNAPSHOT.md`
- `reports/evidence/EPOCH-46/SUMMARY.md`
- `reports/evidence/EPOCH-46/VERDICT.md`
- `reports/evidence/EPOCH-46/SHA256SUMS.EVIDENCE`

## STOP RULES
- BLOCKED if any required gate fails twice.
- BLOCKED if evidence pack files are missing for DONE status.
- BLOCKED if ledger/index/spec are out of sync.

## RISK REGISTER
- Data plane checks can regress silently without strict evidence discipline.
- Ledger drift can mask real readiness state.
- Missing evidence pack standards can produce non-reproducible claims.

## ACCEPTANCE CRITERIA
- [ ] Spec file exists and passes `verify:specs` schema/heading checks.
- [ ] E42..E46 ledger/index status reflects DONE with PASS verdict and evidence root paths.
- [ ] E44..E46 evidence packs contain complete standard file set.
- [ ] Evidence completeness gate blocks DONE epochs lacking standard files.
- [ ] Deterministic verify commands are documented with strict-mode flags.

## NOTES
This epoch formalizes SSOT around the already implemented deterministic data-plane gate.
