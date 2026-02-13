# EPOCH-53 — Canary Forensics + Fitness Score

## REALITY SNAPSHOT
- E52 canary controller exists with deterministic state machine and mode outputs.
- Missing forensic-grade explainability and fitness scoring across deterministic scenarios.
- Evidence root: `reports/evidence/EPOCH-53/`.

## GOALS
- Add reason-code taxonomy SSOT.
- Upgrade canary report with pause/risk forensic traces.
- Add deterministic offline fitness suite across fixed scenarios.

## NON-GOALS
- No live order submission.
- No network dependency.
- No non-deterministic event ordering.

## CONSTRAINTS
- Pause/risk events must include machine-readable reason codes.
- Event ordering must be deterministic.
- Fitness score formula must be explicit and reproducible.

## DESIGN / CONTRACTS
- `docs/CANARY_REASON_CODES.md` + `core/canary/reason_codes.mjs` as taxonomy SSOT.
- `core/canary/canary_runner.mjs` emits forensic fields.
- `core/canary/fitness_suite.mjs` produces scenario table + scalar fitness score.

## PATCH PLAN
- [ ] Add reason code taxonomy docs + module.
- [ ] Upgrade canary report forensic fields.
- [ ] Implement deterministic fitness suite.
- [ ] Add and pass `verify:epoch53` x2 with machine outputs.

## VERIFY
- `npm run verify:epoch53`
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:ledger`
- `npm run verify:release`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-53/PREFLIGHT.log`
- `reports/evidence/EPOCH-53/COMMANDS.log`
- `reports/evidence/EPOCH-53/SNAPSHOT.md`
- `reports/evidence/EPOCH-53/SUMMARY.md`
- `reports/evidence/EPOCH-53/VERDICT.md`
- `reports/evidence/EPOCH-53/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-53/pack_index.json`

## STOP RULES
- BLOCKED if reason codes are missing in pause events.
- BLOCKED if deterministic fingerprints diverge across two runs.
- BLOCKED if fitness suite output is missing or malformed.

## RISK REGISTER
- Scenario set is intentionally small and may under-represent edge turbulence.
- Fitness scalar may require retuning with future data regimes.
- Strictness mapping must stay synchronized between docs and code.

## ACCEPTANCE CRITERIA
- [ ] Pause/risk event reason codes are emitted and non-empty.
- [ ] thresholds_used is fully enumerated in report.
- [ ] Determinism holds across two repeated runs.
- [ ] Fitness suite emits machine-readable scenario table + scalar score.
- [ ] E53 evidence pack validates via packager.

## NOTES
Forensics and fitness are offline-first and deterministic by default.
