# EPOCH-41 — Stage2 Bridge: WOW Audit + Fast Experiments

## REALITY SNAPSHOT
- Current state: Stage-2 bridge/planning required after E40 closeout.
- Dependency baseline: EPOCH-40.
- Evidence root for this epoch: `reports/evidence/EPOCH-41/`.

## GOALS
- Build evidence-backed WOW-01..WOW-38 implementation matrix.
- Run 3 bridge experiments (microstructure gap, CPCV/PBO POC, regime detection POC).
- Define Stage-2 sequencing and handoff for E42..E45.

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
- `npm run verify:epoch41`
- `CI=true npm run verify:specs`
- `CI=true npm run verify:edge`

## EVIDENCE REQUIREMENTS
- `PREFLIGHT.log` and `COMMANDS.log` for execution traceability.
- Gate logs under `reports/evidence/EPOCH-41/gates/` or equivalent.
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
Bridge epoch that converts proposals into executable implementation accounting.
