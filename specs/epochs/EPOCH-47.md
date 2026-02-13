# EPOCH-47 — Truth Sync + Evidence Uniformity + Release Discipline

## REALITY SNAPSHOT
- Current state: E42..E46 required ledger/index truth synchronization.
- Dependency baseline: EPOCH-46.
- Evidence root for this epoch: `reports/evidence/EPOCH-47/`.

## GOALS
- Remove SSOT drift between ledger/index and real evidence.
- Normalize evidence pack format for recent stage-2 epochs.
- Establish release artifact discipline to remove ghost checksums.

## NON-GOALS
- No live trading changes.
- No network-required default verify path.
- No PASS claims without logs and checksums.

## CONSTRAINTS
- Deterministic evidence handling and checksums.
- Two-run discipline for required gates in `CI=true` mode.
- Offline-first default behavior.

## DESIGN / CONTRACTS
- Ledger updates must point to real evidence roots.
- Evidence packs must include standard files and `SHA256SUMS.EVIDENCE`.
- Release checks must be enforceable via explicit verify script.

## PATCH PLAN
- [ ] Sync ledger/index state for E42..E46.
- [ ] Normalize E44..E46 evidence packs.
- [ ] Add release build/verify doctrine.

## VERIFY
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:treasure`
- strict mode: `CI=true` on all required gate runs

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-47/PREFLIGHT.log`
- `reports/evidence/EPOCH-47/COMMANDS.log`
- `reports/evidence/EPOCH-47/SNAPSHOT.md`
- `reports/evidence/EPOCH-47/SUMMARY.md`
- `reports/evidence/EPOCH-47/VERDICT.md`
- `reports/evidence/EPOCH-47/SHA256SUMS.EVIDENCE`

## STOP RULES
- BLOCKED if any required gate fails twice.
- BLOCKED if ledger/index/evidence are inconsistent.
- BLOCKED if release verification cannot be reproduced.

## RISK REGISTER
- Legacy evidence layout can cause false readiness claims.
- Missing release artifacts can leave stale checksum ghosts.
- Weak evidence checks can allow silent drift.

## ACCEPTANCE CRITERIA
- [ ] E42..E46 ledger/index synchronized to DONE/PASS with valid evidence roots.
- [ ] E44..E46 packs normalized with complete standard file set.
- [ ] Release build/verify commands implemented and validated.
- [ ] Required gate suite executed with two-run discipline.
- [ ] E47 evidence pack includes logs, summary, verdict, and checksums.

## NOTES
This epoch establishes deterministic truth-sync discipline for stage-2 continuation.

Fallback verifier: This epoch is evidence-only; fallback verifier is epoch sweep pack_index validation.
