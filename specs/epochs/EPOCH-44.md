# EPOCH-44 — Risk Fortress Evolution

## REALITY SNAPSHOT
- Current state: Stage-2 bridge/planning required after E40 closeout.
- Dependency baseline: EPOCH-43.
- Evidence root for this epoch: `reports/evidence/EPOCH-44/`.

## GOALS
- Implement drawdown-conditional sizing and hard-stop hierarchy.
- Add deterministic stress-path tests and rollback criteria.
- Integrate risk escalations with release-governor evidence.

## NON-GOALS
- Do not enable live trading paths by default.
- Do not add network-dependent behavior to default verify gates.
- Do not mark implementation complete without executable tests.

## CONSTRAINTS
- Offline-first by default (`ENABLE_NETWORK_TESTS=1` opt-in only).
- Deterministic outputs and reproducible evidence.
- All critical gates run twice before status promotion.

## DESIGN / CONTRACTS
- Primary artifact: epoch spec + evidence pack + checksums.
- Required docs and ledger updates must be atomic with implementation deltas.
- Each promoted capability must include a falsifiable gate.

## PATCH PLAN
- [ ] Add/refresh epoch artifacts and matrix updates.
- [ ] Execute bridge checks and capture results in evidence.
- [ ] Validate repo/spec gates with two-run discipline.

## VERIFY
- `npm run verify:specs`
- `npm run verify:config`
- `npm run verify:truth-layer`

## EVIDENCE REQUIREMENTS
- `PREFLIGHT.log` and `COMMANDS.log` for execution traceability.
- Gate logs under `reports/evidence/EPOCH-44/gates/` or equivalent.
- `SHA256SUMS` manifest for generated evidence files.

## STOP RULES
- BLOCKED if required gate fails twice.
- BLOCKED if determinism drift appears across repeated runs.
- BLOCKED if SSOT docs and ledger diverge.

## RISK REGISTER
- Incomplete gate coverage can produce false readiness.
- Overclaiming implementation status without executable proof.
- Drift between matrix, ledger, and executable scripts.

## ACCEPTANCE CRITERIA
- [ ] Spec committed with deterministic verify commands.
- [ ] Evidence directory created and checksummed.
- [ ] Ledger and index include this epoch.
- [ ] Offline-first constraints preserved.
- [ ] Summary/verdict recorded with explicit PASS/BLOCKED.

## NOTES
Planned Stage-2 risk hardening epoch.
