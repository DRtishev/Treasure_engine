# EPOCH-60 — WOW→PROFIT TRUTH (WOW SSOT + KB + PROFIT PASSPORTS)

## REALITY SNAPSHOT
- Repo lacks a single machine-verifiable WOW ledger and validated KB in one deterministic contract.

## GOALS
- Establish WOW SSOT with ship/no-ship truth rules and evidence links.
- Add KB truth library with machine validation.
- Emit shipped WOW passports with evidence hashes.

## NON-GOALS
- No new strategy alpha modules.
- No relaxation of Phoenix or release strict gates.

## CONSTRAINTS
- Offline-first by default.
- Determinism (`SEED`, run-dir discipline, no hidden drift).
- Safety/security constraints.

## DESIGN / CONTRACTS
- `specs/wow/WOW_LEDGER.json` is the SSOT for WOW lifecycle.
- `scripts/verify/wow_specs_check.mjs` enforces shipped-evidence and integration contracts.
- `scripts/truth/passport_builder.mjs` materializes proof passports for shipped WOW entries.
- `scripts/verify/kb_check.mjs` validates KB references to scripts and repo paths.

## PATCH PLAN
- Add WOW SSOT docs/files and implement `verify:wow`.
- Add KB docs/files and implement `verify:kb`.
- Add passport builder/verifier and wire to release flow.
- Generate E60 evidence pack and verdict artifacts.

## VERIFY
- `npm ci`
- `npm run verify:repo`
- `CI=true npm run verify:repo`
- `CI=true npm run verify:specs`
- `CI=true npm run verify:wow`
- `CI=true npm run verify:kb`
- `CI=true npm run verify:passports`
- `CI=true npm run verify:ledger`
- `CI=true npm run verify:edge`
- `CI=true npm run verify:treasure`
- `npm run release:build`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-60/` with standard files, `pack_index.json`, `SHA256SUMS.EVIDENCE`.
- Required machine outputs: `gates/manual/wow_ledger_summary.json`, `gates/manual/passports_manifest.json`, `gates/manual/verify_epoch60_result.json`.

## STOP RULES
- PASS only when all required gates pass twice and evidence pack is complete.
- BLOCKED if WOW/KB/passport gates fail or if strict release evidence mismatches.
- Roll back any change that regresses Phoenix chain or offline-first behavior.

## RISK REGISTER
- Incorrect shipped WOW mapping to epochs/evidence outputs.
- KB references drifting from executable scripts.
- False pass if passports do not prove hash integrity.
- Epoch ledger inconsistencies from sequence updates.

## ACCEPTANCE CRITERIA
- [ ] WOW ledger exists and `npm run verify:wow` passes.
- [ ] KB library exists and `npm run verify:kb` passes.
- [ ] Shipped WOW passports generated and `npm run verify:passports` passes.
- [ ] `reports/evidence/EPOCH-60/` includes standard files plus machine outputs and checksums.
- [ ] `specs/epochs/INDEX.md` and `specs/epochs/LEDGER.json` include E60 after PASS x2.

## NOTES
- E60 is determinism-first and anti-self-deception by contract.
