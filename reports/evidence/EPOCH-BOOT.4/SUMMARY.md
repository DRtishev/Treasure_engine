# EPOCH-BOOT.4 Summary

## Scope
- Implemented Specs Factory deliverables: SSOT governance docs, epoch specs (17..21), epoch indexes, and conflict registry.
- Re-ran baseline deterministic gates to prove no regression and preserve run-scoped output discipline.

## Specs created/updated
- SSOT/Governance:
  - `specs/SSOT_INDEX.md`
  - `specs/CONSTRAINTS.md`
  - `specs/DECISIONS.md`
  - `specs/QUALITY_BAR.md`
  - `specs/PIPELINE.md`
  - `specs/SPEC_CONFLICTS.md`
- Epoch package:
  - `specs/epochs/README.md`
  - `specs/epochs/EPOCH-17..21.md`
  - `specs/epochs/EPOCH-17..21_TODO.md`
  - `specs/epochs/EPOCH-17..21_GATES.md`
  - `specs/epochs/EPOCH-17..21_EVIDENCE.md`

## Conflict handling
- Conflicts documented in `specs/SPEC_CONFLICTS.md` (missing `specs/epochs/` baseline and missing auxiliary tracker files).
- Resolution: establish `specs/epochs/` as canonical epoch-spec location and use available SSOT inputs.

## Gate outcomes
- `npm ci`: PASS
- `npm run verify:paper` run #1: PASS (161/0)
- `npm run verify:paper` run #2: PASS (161/0)
- `npm run verify:e2` run #1: PASS
- `npm run verify:e2` run #2: PASS
- `npm run verify:e2:multi`: PASS (3 seeds + same-seed repeat)
- `npm run verify:phase2`: PASS
- `npm run verify:integration`: PASS (20/0)
- `sha256sum -c reports/evidence/EPOCH-BOOT.4/SHA256SUMS.SOURCE.txt`: PASS
- `npm run verify:core`: PASS

## Determinism/run-scope checks
- Paper repeat outputs are isolated (`default`, `default_2`) under `reports/runs/paper/<seed>/<repeat>/<run_id>/`.
- E2 repeat outputs are isolated under `reports/runs/e2/<seed>/<repeat>/<run_id>/`.

## Export checksums
- `FINAL_VALIDATED.zip`: `a0ae38e89982387c08c51d5ae50a710aa9e7e2aed753a14e4bc2868546a04aa8`
- Evidence export checksum is recorded in `SHA256SUMS.EXPORT.txt`.

## Remaining risks
- `specs/epochs/` now canonical but some older planning docs remain outside specs tree (legacy drift risk).
- `verify:*` logs still include non-blocking npm env warning (`Unknown env config "http-proxy"`).
