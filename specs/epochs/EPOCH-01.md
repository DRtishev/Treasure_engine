# EPOCH-01 — Foundation Baseline

## REALITY SNAPSHOT
- Legacy epoch captured from historical implementation artifacts and current surviving contracts.

## GOALS
- Record authoritative contract and acceptance criteria for EPOCH-01.
- Keep offline-first deterministic verification with reproducible evidence.

## NON-GOALS
- Introduce non-specified product behavior.
- Enable live trading by default.

## CONSTRAINTS
- Offline-first verification path unless `ENABLE_NETWORK_TESTS=1`.
- Deterministic execution with seed and run-scoped artifact directories.
- No secrets in code, logs, or evidence outputs.

## DESIGN / CONTRACTS
- Epoch type: LEGACY.
- Dependencies: none.
- Primary owner gate: `verify:specs`.
- Ledger row remains the source of truth for status/evidence linkage.

## PATCH PLAN
- Keep minimal patch scope to close explicit epoch requirements.
- Update specs + ledger + gate wiring before claiming DONE.
- Store run logs and checksums in final evidence pack.

## VERIFY
- `npm run verify:specs`
- `npm run verify:specs`
- `npm run verify:wall`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-30-FINAL/` contains gate logs and summaries.
- Include run-scoped artifacts under `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- Ledger snapshot and checksum manifests must be included.

## STOP RULES
- Stop and mark BLOCKED if gate fails twice after root-cause fix attempt.
- Stop if completion would require unspecced product behavior.
- Reopen plan if deterministic/run-scope invariant is violated.

## RISK REGISTER
- Risk: flaky gate output. Mitigation: anti-flake reruns and deterministic seed.
- Risk: stale ledger/evidence mapping. Mitigation: update ledger only after verified logs exist.
- Risk: hidden network dependency. Mitigation: explicit opt-in env flag for network tests only.

## ACCEPTANCE CRITERIA
- [ ] Spec exists with canonical headings and explicit verify commands.
- [ ] Gate coverage is defined and executable for this epoch.
- [ ] Evidence path is linked in ledger metadata.
- [ ] Determinism/run-scope constraints are preserved.
- [ ] Status can be set to DONE only after reproducible PASS logs.

## NOTES
- LEGACY mapping uses docs/EPOCH_MAP.md + historical evidence references.
