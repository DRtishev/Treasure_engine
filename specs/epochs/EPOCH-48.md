# EPOCH-48 — WOW-32 Close: Evidence Pack Automation + Release Governor

## REALITY SNAPSHOT
- Current state: WOW-32 is PARTIAL and relies on manual evidence pack normalization.
- Dependency baseline: EPOCH-47.
- Evidence root for this epoch: `reports/evidence/EPOCH-48/`.

## GOALS
- Implement deterministic evidence packager CLI for epoch packs.
- Enforce pack completeness including `pack_index.json` for DONE epochs.
- Integrate release strict governance checks around evidence completeness.

## NON-GOALS
- No fabricated PASS verdicts.
- No default network dependencies in verification path.
- No binary archive commits to git history.

## CONSTRAINTS
- Evidence pack format must be standard and identical across epochs.
- Two-run gate discipline in `CI=true` mode for required gates.
- Ledger remains truth and must be justified by generated evidence.

## DESIGN / CONTRACTS
- `scripts/evidence/packager.mjs` supports `pack:epoch` and `pack:verify`.
- `pack_index.json` conforms to schema at `schemas/evidence/pack_index.schema.json`.
- `verify:ledger` and `verify:release` enforce pack completeness in strict paths.

## PATCH PLAN
- [ ] Add evidence pack SSOT doc + pack index JSON schema.
- [ ] Implement packager CLI and package scripts.
- [ ] Dogfood EPOCH-48 pack generation and validation via packager.
- [ ] Promote WOW-32 when enforcement and dogfood evidence are complete.

## VERIFY
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:treasure`
- `npm run verify:ledger`
- `npm run verify:release`
- strict mode: `CI=true` for all gate runs; `RELEASE_BUILD=1` and `RELEASE_STRICT=1` for release-governor verification

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-48/PREFLIGHT.log`
- `reports/evidence/EPOCH-48/COMMANDS.log`
- `reports/evidence/EPOCH-48/SNAPSHOT.md`
- `reports/evidence/EPOCH-48/SUMMARY.md`
- `reports/evidence/EPOCH-48/VERDICT.md`
- `reports/evidence/EPOCH-48/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-48/pack_index.json`

## STOP RULES
- BLOCKED if any required gate fails twice.
- BLOCKED if packager output cannot be verified deterministically.
- BLOCKED if strict release checks fail.

## RISK REGISTER
- Log parsing ambiguity can misclassify gate status.
- Ledger strictness can expose legacy pack gaps unexpectedly.
- Incomplete pack index hashing can reduce reproducibility confidence.

## ACCEPTANCE CRITERIA
- [ ] Evidence packager CLI exists and supports pack+verify commands.
- [ ] Pack index schema exists and is referenced by SSOT documentation.
- [ ] `verify:ledger` enforces `pack_index.json` and checksum inclusion for DONE epochs.
- [ ] EPOCH-48 evidence pack is generated and validated via packager.
- [ ] WOW-32 moves to IMPLEMENTED with code+gate evidence citations.

## NOTES
This epoch closes WOW-32 by replacing manual evidence normalization with deterministic automation.

Fallback verifier: This epoch is evidence-only; fallback verifier is epoch sweep pack_index validation.
