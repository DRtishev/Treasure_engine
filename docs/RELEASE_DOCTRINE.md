# RELEASE DOCTRINE (TRUTH + EVIDENCE CHAIN)

## Ledger semantics
- `stage` is lifecycle state (`PLANNED|IN_PROGRESS|DONE`).
- `status` is outcome quality (`PASS|FAIL|UNKNOWN`) and must not be used as lifecycle state.
- Release evidence selection MUST use `row.stage === 'DONE'`.

## Release artifacts
- `release:build` emits:
  - `artifacts/out/FINAL_VALIDATED.zip`
  - `artifacts/out/evidence_chain.tar.gz`
  - `artifacts/out/evidence_allowlist.txt`
- `evidence_allowlist.txt` is derived from DONE(stage) epochs and must include at minimum:
  - `<evidence_root>/pack_index.json`
  - `<evidence_root>/SHA256SUMS.EVIDENCE`

## Strict release verification
With `RELEASE_BUILD=1 RELEASE_STRICT=1`:
- `verify:release` validates artifact presence and DONE evidence minima.
- `verify:release:chain` validates chain semantics:
  - allowlist is non-empty and covers DONE roots.
  - tar entries match allowlist exactly (set and count).
  - every allowlisted file extracted from tar has the same SHA256 as repo file.
  - each allowlisted `SHA256SUMS.EVIDENCE` contains `pack_index.json` entry.
- Machine report path: `reports/truth/release_chain_report.json`.

## Ledger hard mode
- `LEDGER_PACK_VERIFY=1 npm run verify:ledger` runs `pack:verify` for each DONE(stage) epoch (>=17).
- `verify:phoenix` enables this mode to ensure end-to-end release truth.
