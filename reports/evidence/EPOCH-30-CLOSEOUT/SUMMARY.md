# SUMMARY — EPOCH-30 CLOSEOUT

## What was changed
- Replaced root `agents.md` with canonical seven-heading autopilot policy (offline-first + evidence-first).
- Hardened `verify:specs` for canonical `agents.md` headings/order and ledger rules for EPOCH-01..16 (`type=legacy`, `gate_owner=docs`, support `LEGACY_DONE`).
- Added clean-clone bootstrap flow (`scripts/ops/clean_clone_bootstrap.mjs`) and `verify:clean-clone` script.
- Upgraded `verify:wall` to always emit `WALL_RESULT.json` and `WALL_MARKERS.txt`, include clean-clone stage, and support recursion guards for nested runs.
- Upgraded release governor to consume machine-readable wall outputs first, validate markers, and honor clean-clone bootstrap mode.
- Hardened manifest generation to exclude volatile gate/wall files from evidence checksum drift.
- Updated runbook/README for clean-clone and machine-readable wall outputs.
- Updated `LEDGER.json` to keep EPOCH-01..16 as legacy (`LEGACY_DONE` + docs gate owner) and linked all epochs to evidence cycle `EPOCH-30-CLOSEOUT`.

## Gate outcome
- verify:specs x2: PASS
- verify:wall: PASS (20 steps)
- verify:release-governor x2: PASS
- clean-clone bootstrap: PASS (`CLEAN_CLONE.OK`)
- manifests/source/evidence/export checksum checks: PASS

## Artifacts
- FINAL_VALIDATED.zip + sha256
- artifacts/incoming/EVIDENCE_PACK_EPOCH-30-CLOSEOUT.tar.gz + sha256
