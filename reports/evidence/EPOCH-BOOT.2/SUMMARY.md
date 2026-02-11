# EPOCH-BOOT.2 Summary (Paper run-dir discipline)

## What changed
- Added paper run-scoped wrapping by using existing `run_with_context` gate for `verify:paper`.
- Added npm scripts:
  - `verify:paper:raw` (legacy command)
  - `verify:paper` (wrapped, run-scoped)
- Updated paper simulation (`core/sim/engine_paper.mjs`) to write event logs under `TREASURE_RUN_DIR` when present.
- Added verify-only probes (`FORCE_TRADES=1`) to guarantee run-local EXEC/RISK events for deterministic paper gate assertions.
- Updated `scripts/verify/paper_e2e.mjs` to read event logs from current run directory and enforce EXEC/RISK presence for that run.
- Kept `verify:core` = `verify:e2 + verify:paper + verify:e2:multi`.

## Paper run directory layout
- `reports/runs/paper/<seed>/<repeat>/<run_id>/`
- Verified examples from this cycle:
  - `reports/runs/paper/12345/default_10/10834bfc54f60232/`
  - `reports/runs/paper/12345/default_11/10834bfc54f60232/`

## Gate results (offline)
- `npm ci`: PASS
- `npm run verify:paper` run #1: PASS (151/151)
- `npm run verify:paper` run #2: PASS (151/151)
- `npm run verify:e2` run #1: PASS
- `npm run verify:e2` run #2: PASS
- `npm run verify:e2:multi`: PASS (3 seeds + same-seed repeat)
- `sha256sum -c reports/evidence/EPOCH-BOOT.2/SHA256SUMS.SOURCE.txt`: PASS
- `npm run verify:core`: PASS

## Export checksums
- `FINAL_VALIDATED.zip`: `1ab833ef95c8f0d26a21d8a3819a5799b467f015b167e95d3dd63842a219ac03`
- `EVIDENCE_PACK_EPOCH-BOOT.2.tar.gz`: recorded in `SHA256SUMS.EXPORT.txt`.

## Remaining risks
- Paper gate uses verify-only probes (`verify_exec_probe`, `verify_risk_probe`) when `FORCE_TRADES=1`; this is deterministic and scoped, but synthetic.
- Legacy global `logs/events` may still be used by non-wrapped invocations (`verify:paper:raw`).
