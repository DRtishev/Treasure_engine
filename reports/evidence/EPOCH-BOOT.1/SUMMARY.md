# EPOCH-BOOT.1 Summary

## What changed
- Added run wrapper `scripts/verify/run_with_context.mjs` to enforce scoped run directories for e2 flows.
- Added multi-seed stability gate `scripts/verify/e2_multi_seed.mjs`.
- Updated `core/sys/run_artifacts.mjs` so `ensureRunDir()` honors `TREASURE_RUN_DIR` when provided.
- Updated npm scripts in `package.json`:
  - `verify:e2:raw` (legacy chain)
  - `verify:e2` (wrapped with run context)
  - `verify:e2:multi` (new multi-seed gate)
  - `verify:core` (e2 + paper + e2:multi)
- Updated `README.md` with hard-gate commands and expected outcomes.

## Run-directory discipline
- e2 outputs now land under:
  - `reports/runs/e2/<seed>/<repeat>/<run_id>/...`
- Verified examples:
  - `reports/runs/e2/12345/default/ecb7712de5f0ccb8/`
  - `reports/runs/e2/12345/default_3/ecb7712de5f0ccb8/`
  - `reports/runs/e2/34567/multi_r1/58e729ccc40a7cdf/`

## Gate results (offline)
- `npm ci`: PASS
- `npm run verify:e2` run #1: PASS
- `npm run verify:phase2`: PASS
- `npm run verify:paper` run #1: PASS
- `npm run verify:e2` run #2: PASS
- `npm run verify:paper` run #2: PASS
- `npm run verify:e2:multi`: PASS (3 seeds, same-seed repeat stable)
- `npm run verify:core`: PASS
- `npm run verify:integration`: PASS
- `npm run verify:binance`: PASS (SKIP by policy)
- `npm run verify:websocket`: PASS (SKIP by policy)
- `sha256sum -c reports/evidence/EPOCH-BOOT.1/SHA256SUMS.SOURCE.txt`: PASS

## Export checksums
- `FINAL_VALIDATED.zip`: `3d3047f02bf77ae078bfaa35e57a081ac47fc692076427d80f68d1cee4482767`
- Evidence export (`EVIDENCE_PACK_EPOCH-BOOT.1.tar.gz`) recorded in `SHA256SUMS.EXPORT.txt`.

## Remaining risks
- `verify:paper` still writes deterministic event log filename per seed and can overwrite same-seed reruns.
- Existing npm environment warning (`Unknown env config "http-proxy"`) is non-blocking but noisy.
