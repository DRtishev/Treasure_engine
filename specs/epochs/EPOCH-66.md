# EPOCH-66 — Bulletproof Verify Factory (md-only evidence)

## Goal
Harden verification into a deterministic, offline-first, read-only-in-CI factory with dual-run anti-flake and self-verifying md evidence.

## Acceptance (falsifiable)
- `CI=true npm run -s verify:e66` passes and does not mutate tracked files.
- `CI=true npm run -s verify:phoenix:x2` passes with identical deterministic fingerprints.
- `CI=true npm run -s verify:evidence` validates `SHA256SUMS.md` (without self-reference), provenance materials, and completeness checklist.
- Snapshot/CAS/provenance updates are forbidden in CI and only allowed via explicit flags:
  - `APPROVE_SNAPSHOTS=1` (non-CI)
  - `UPDATE_CAS=1` (non-CI)
  - `UPDATE_PROVENANCE=1` (non-CI)
  - `UPDATE_E66_EVIDENCE=1` (non-CI)
- Double critical failure in `verify:phoenix:x2` writes kill lock `.foundation-seal/E66_KILL_LOCK.md` and blocks future runs unless manually cleared in non-CI (`CLEAR_LOCK=1`).

## Evidence contract (md-only)
All artifacts under `reports/evidence/E66/` are markdown only:
- `VERDICT.md`
- `PACK.md`
- `CHECKLIST.md`
- `SHA256SUMS.md`
- `PROVENANCE.md`
- `RUNS.md`
- `CAS.md`
- `DIFFS.md`
