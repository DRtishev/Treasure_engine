# ANTI-DRIFT DOCTRINE

## SSOT auto-range rule
- `scripts/verify/specs_check.mjs` derives the required epoch range from `specs/epochs/LEDGER.json`.
- The max numeric ledger key defines the required ceiling.
- Verification fails if any epoch number between `1..max` is missing in ledger or missing its `specs/epochs/EPOCH-XX.md` file.

## DONE epoch immutability rule
- DONE stage2 epochs are freeze-protected by `npm run verify:epochs:freeze`.
- The gate verifies evidence pack integrity first (`pack:verify --id <E>`).
- A replay mismatch against committed `SHA256SUMS.EVIDENCE` is treated as blocking drift.

## ASSERT_NO_DIFF mode
- Set `EVIDENCE_WRITE_MODE=ASSERT_NO_DIFF`.
- Epoch verifiers route writes into `.tmp/epoch_freeze/EPOCH-XX/...`.
- Committed files under `reports/evidence/EPOCH-XX/` remain untouched.
- Freeze gate compares generated temporary artifacts to committed manual evidence hashes and fails on any sha difference.

## Adding EPOCH-(N+1) without breaking factory guarantees
1. Add `specs/epochs/EPOCH-(N+1).md` using template headings.
2. Add ledger entry in `specs/epochs/LEDGER.json` for key `N+1`.
3. Add/update verifier script and npm command (`verify:epoch(N+1)` if applicable).
4. Run `CI=true npm run verify:specs` to validate SSOT-derived range.
5. If epoch is DONE with evidence pack, run `CI=true npm run verify:epochs:freeze`.
6. Pack evidence (`node scripts/evidence/packager.mjs pack:epoch --id N+1`) and verify pack.
