# EDGE Operator Playbook

## Day 0 / Day 1 / Day 2 Sprint Rhythm
- **Day 0 (Contract Lock):** freeze schema fields, invariants, fixture definitions, and gate I/O.
- **Day 1 (Implementation + Local Replay):** build to contracts, run deterministic fixture battery, collect draft evidence.
- **Day 2 (Audit + Closeout):** run anti-flake (2x), verify evidence completeness, publish verdict + rollback status.

## How to run an epoch (operator path)
1. Read epoch spec + TRACEABILITY row.
2. Confirm dependencies DONE/READY chain in `specs/epochs/LEDGER.json`.
3. Execute epoch gate command and preserve run logs in epoch evidence folder.
4. Re-run gate with same inputs to confirm deterministic replay.
5. Publish `VERDICT.md` with PASS/BLOCKED and explicit evidence links.

## Folder navigation
- Contracts and architecture: `docs/SDD_EDGE_EPOCHS_31_40.md`
- Research controls: `docs/EDGE_RESEARCH/*`
- Epoch implementation specs: `specs/epochs/EPOCH-31.md` ... `EPOCH-40.md`
- Evidence root per cycle: `reports/evidence/<EVIDENCE_EPOCH>/`

## Evidence completeness checklist
- [ ] PREFLIGHT log
- [ ] INSTALL log
- [ ] verify gate run #1 log
- [ ] verify gate run #2 log
- [ ] DIFF.patch
- [ ] SUMMARY.md
- [ ] VERDICT.md

## Typical failure cases
- Deterministic drift between run1/run2 with identical inputs.
- Leakage sentinel not failing on injected future-label fixture.
- Shadow mode emits any live order attempt.
- Missing required evidence files despite gate PASS output.

## Escalation rule
If critical gate fails twice without clear root cause, stop and publish diagnostic hypotheses + next experiments.
