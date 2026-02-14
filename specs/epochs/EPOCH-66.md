# EPOCH-66 — Factory Acceleration + Attestation + Kill-Criteria Lock

## Goal
Harden `verify:phoenix` execution with deterministic x2 wrapper, optional deterministic cache, provenance attestation, commit-binding checks, and fail-fast kill criteria.

## Acceptance (falsifiable)
- `CI=true npm run verify:phoenix:x2` produces `reports/evidence/EPOCH-66/gates/manual/phoenix_x2_report.json` with `status=PASS`.
- `PHOENIX_CACHE=1` path preserves correctness and passes `npm run verify:cache:policy`.
- `npm run truth:provenance` writes `truth/PROVENANCE.json`; `npm run verify:provenance` validates hashes and normalized run equality.
- Critical gates (`verify:phoenix`, `verify:ledger`, `verify:release`, `verify:baseline`) stop chain after two failures and emit kill report.
- `npm run verify:evidence:commit_binding` exists; strict release mode blocks on mismatch.

## Required artifacts
- `reports/evidence/EPOCH-66/gates/manual/phoenix_x2_report.json`
- `reports/evidence/EPOCH-66/gates/manual/cache_report.json`
- `reports/evidence/EPOCH-66/gates/manual/provenance.json`
- `reports/evidence/EPOCH-66/gates/manual/kill_criteria_report.json`
- `reports/evidence/EPOCH-66/gates/manual/evidence_commit_binding_report.json`
- `reports/evidence/EPOCH-66/gates/manual/verify_epoch66_result.json`
