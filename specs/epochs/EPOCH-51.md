# EPOCH-51 — Paper Trading Harness + Adapter Hardening + Multi-Chunk Invariants

## REALITY SNAPSHOT
- Current state: private fills ingest and REAL calibration exist; paper trading harness and rechunk invariants were missing.
- Dependency baseline: EPOCH-50.
- Evidence root for this epoch: `reports/evidence/EPOCH-51/`.

## GOALS
- Implement deterministic offline paper trading harness using E49 market replay + E50 REAL calibration.
- Harden private-fills adapter mappings for CSV/JSONL variance in strict mode.
- Prove multi-chunk ingest invariants and strict expected-fail behavior.

## NON-GOALS
- No live order submission.
- No network dependency in default verification path.
- No silent fallback in strict mode when REAL fills dataset requested.

## CONSTRAINTS
- `SHADOW_ONLY=1` hard fuse must be enforced in paper harness.
- Strict mode requires valid private fills dataset with stable IDs.
- Determinism must hold across repeated runs with same inputs+seed.

## DESIGN / CONTRACTS
- Adapter mapping contract in `core/edge/private_fills_adapters.mjs` + `docs/PRIVATE_FILLS_ADAPTERS.md`.
- Paper session runner in `core/paper/paper_trading_harness.mjs` emits deterministic `session_report` and fingerprints.
- Verify gate emits required machine-readable outputs under E51 manual evidence path.

## PATCH PLAN
- [ ] Add adapter hardening and mapping documentation.
- [ ] Extend ingest for chunk-size invariants and stable dataset fingerprints.
- [ ] Add paper trading harness and E51 verifier.
- [ ] Run required gates x2 and finalize evidence pack via packager.

## VERIFY
- `npm run verify:epoch51`
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:ledger`
- `npm run verify:release`
- strict mode: `CI=true` for all gates and `RELEASE_BUILD=1` for release checks

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-51/PREFLIGHT.log`
- `reports/evidence/EPOCH-51/COMMANDS.log`
- `reports/evidence/EPOCH-51/SNAPSHOT.md`
- `reports/evidence/EPOCH-51/SUMMARY.md`
- `reports/evidence/EPOCH-51/VERDICT.md`
- `reports/evidence/EPOCH-51/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-51/pack_index.json`

## STOP RULES
- BLOCKED if required gates fail twice.
- BLOCKED if session fingerprint differs across repeated runs.
- BLOCKED if strict expected-fail does not fail.

## RISK REGISTER
- Adapter variance beyond documented mappings can still fail strict ingest.
- Risk-fortress trigger fixtures may under-cover extreme regimes.
- Session model remains simplified and requires further strategy diversity.

## ACCEPTANCE CRITERIA
- [ ] Paper session runs offline with deterministic fingerprints across two runs.
- [ ] At least one hard stop event is triggered and logged in fixture session.
- [ ] Rechunk ingest invariants hold for dataset and calibration fingerprints.
- [ ] Strict expected-fail on missing REAL fills dataset is observed.
- [ ] E51 evidence pack contains standard files and required machine outputs.

## NOTES
Paper harness is hard-fused to shadow-only mode and never submits real orders.
Use `CI=true npm run verify:epoch51` as the single reproducibility gate for this epoch.
