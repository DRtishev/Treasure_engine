# EPOCH-63 — RELEASE TRUTH + EVIDENCE INTEGRITY

## REALITY SNAPSHOT
- Release packaging selected DONE epochs using `row.status === 'DONE'` while ledger semantics define `stage` as lifecycle and `status` as PASS/FAIL.
- `verify:release` validated artifact presence but not chain semantic correctness.
- `pack:verify` did not enforce full SHA256SUMS coverage for every line and every evidence file.

## GOALS
- Enforce stage-vs-status semantics for release evidence selection.
- Make `evidence_chain.tar.gz` content semantically and cryptographically validated in strict mode.
- Harden pack verification to make `SHA256SUMS.EVIDENCE` the primary truth source.
- Add strict ledger option to run `pack:verify` for each DONE epoch.

## NON-GOALS
- No strategy/live-trading behavior changes.
- No network-dependent verification paths for default PASS.

## PATCH PLAN
- Fix release build selection logic to use `row.stage === 'DONE'` only.
- Add `scripts/verify/release_chain_check.mjs` and wire strict release checks to run it.
- Upgrade `pack:verify` to validate all SHA lines and detect uncovered extra files.
- Add `LEDGER_PACK_VERIFY=1` mode in `verify:ledger` and wire into `verify:phoenix`.
- Update SSOT docs with release-chain rules and stage/status definitions.
- Produce E63 evidence pack and machine outputs.

## VERIFY
- `npm ci` (run1/run2)
- `CI=true npm run verify:repo` (run1/run2)
- `CI=true npm run verify:specs` (run1/run2)
- `LEDGER_PACK_VERIFY=1 CI=true npm run verify:ledger` (run1/run2)
- `CI=true npm run verify:edge` (run1/run2)
- `CI=true npm run verify:treasure` (run1/run2)
- `CI=true npm run verify:phoenix` (run1/run2)
- `npm run release:build`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release` (run1/run2)
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release:chain` (run1/run2)

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-63/` standard pack files.
- Required machine outputs under `reports/evidence/EPOCH-63/gates/manual/`:
  - `release_chain_report.json`
  - `pack_verify_audit.json`
  - `verify_epoch63_result.json`

## ACCEPTANCE CRITERIA (FALSIFIABLE)
- [ ] Release build derives both zip evidence roots and allowlist from `stage === DONE` epochs.
- [ ] Strict release verification fails on allowlist/tar divergence or per-file SHA mismatches.
- [ ] `verify:release:chain` emits `reports/truth/release_chain_report.json` with `status=PASS` and `errors=[]`.
- [ ] `pack:verify` checks every SHA256SUMS line and fails on uncovered extra files.
- [ ] `LEDGER_PACK_VERIFY=1 verify:ledger` verifies all DONE epoch evidence packs.
- [ ] E63 evidence pack includes required machine outputs and `pack:verify` passes.
