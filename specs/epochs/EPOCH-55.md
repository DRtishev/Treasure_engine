# EPOCH-55 — Paper Fitness Lab (Bounded Parameter Sweeps + Anti-Overfit)

## REALITY SNAPSHOT
- Paper trading harness exists but lacks bounded frontier-style fitness exploration.
- E55 adds deterministic parameter sweeps with anti-overfit context integration.
- Evidence root: `reports/evidence/EPOCH-55/`.

## GOALS
- Implement finite deterministic parameter grid for paper sessions.
- Produce frontier report with top-k configs and fingerprints.
- Integrate E43 overfit output as warning/constraint metadata.

## NON-GOALS
- No dynamic strategy mutation.
- No external models or network calls.
- No unbounded optimization loops.

## CONSTRAINTS
- Parameter grid must be explicit and finite.
- Determinism must hold across repeated runs.
- Report must remain machine-readable.

## DESIGN / CONTRACTS
- Sweep harness in `core/paper/paper_fitness_lab.mjs`.
- Gate in `scripts/verify/epoch55_paper_fitness_lab.mjs`.
- Output contract `epoch55_frontier.json` under evidence manual folder.

## PATCH PLAN
- [ ] Add bounded grid sweep harness.
- [ ] Emit frontier report with top-k and fingerprints.
- [ ] Add anti-overfit constraint metadata.
- [ ] Add and pass `verify:epoch55` x2.

## VERIFY
- `npm run verify:epoch55`
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:ledger`
- `npm run verify:release`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-55/PREFLIGHT.log`
- `reports/evidence/EPOCH-55/COMMANDS.log`
- `reports/evidence/EPOCH-55/SNAPSHOT.md`
- `reports/evidence/EPOCH-55/SUMMARY.md`
- `reports/evidence/EPOCH-55/VERDICT.md`
- `reports/evidence/EPOCH-55/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-55/pack_index.json`

## STOP RULES
- BLOCKED if frontier report is missing/invalid.
- BLOCKED if determinism check fails.
- BLOCKED if evidence pack validation fails.

## RISK REGISTER
- Small bounded grid may miss profitable zones.
- Score formula is intentionally simple and may evolve.
- Overfit metadata availability can vary by prior epoch evidence presence.

## ACCEPTANCE CRITERIA
- [ ] Frontier report generated from finite explicit grid.
- [ ] Top-k configs include metrics + fingerprints.
- [ ] Determinism x2 holds for frontier fingerprint.
- [ ] Overfit metadata included as warning/constraint context.
- [ ] E55 evidence pack validates via packager.

## NOTES
E55 is deterministic tuning only; strategy logic remains unchanged.
