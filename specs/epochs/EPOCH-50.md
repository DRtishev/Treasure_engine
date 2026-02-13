# EPOCH-50 — Private Fills Ingest + Real Calibration Upgrade

## REALITY SNAPSHOT
- Current state: execution realism supports proxy/fill records, but lacks strict private-fills ingest SSOT pipeline.
- Dependency baseline: EPOCH-49.
- Evidence root for this epoch: `reports/evidence/EPOCH-50/`.

## GOALS
- Add deterministic private-fills ingest (file path required, offline default).
- Upgrade execution realism calibration to REAL mode from normalized private fills dataset.
- Enforce strict mode for private fills (`fill_id` required, no heuristic dedup fallback).

## NON-GOALS
- No secret-bearing API integration in default path.
- No live trading enablement.
- No network-required verification path.

## CONSTRAINTS
- `ENABLE_NETWORK=1` and `PRIVATE_DATA_ALLOW=1` required for optional network fetch.
- Strict mode (`EXEC_REALISM_STRICT=1`) fails on missing/invalid fill IDs.
- Deterministic output fingerprints required for repeated runs on same dataset.

## DESIGN / CONTRACTS
- `core/edge/private_fill_contracts.mjs` defines FillRecord normalization contract.
- `core/edge/private_data_quality.mjs` defines strict/non-strict dedup/gap/outlier behavior.
- `core/edge/execution_realism.mjs` exposes REAL/PROXY calibration manifest path with strict-mode policy.

## PATCH PLAN
- [ ] Add private fill contracts, quality engine, ingest script, and fixture dataset.
- [ ] Add verify gate with strict + negative expected-fail coverage.
- [ ] Emit machine-readable artifacts under E50 manual evidence gate path.
- [ ] Generate E50 evidence pack via packager and sync ledger/index.

## VERIFY
- `npm run verify:epoch50`
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:ledger`
- `npm run verify:release`
- strict mode: `CI=true` for all gate runs and `RELEASE_BUILD=1` for release checks

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-50/PREFLIGHT.log`
- `reports/evidence/EPOCH-50/COMMANDS.log`
- `reports/evidence/EPOCH-50/SNAPSHOT.md`
- `reports/evidence/EPOCH-50/SUMMARY.md`
- `reports/evidence/EPOCH-50/VERDICT.md`
- `reports/evidence/EPOCH-50/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-50/pack_index.json`

## STOP RULES
- BLOCKED if required gates fail twice.
- BLOCKED if strict-mode negative test does not fail as expected.
- BLOCKED if REAL mode calibration is non-deterministic on fixture.

## RISK REGISTER
- Provider CSV schema variance can break parsing.
- Strict-mode requirements can reject legacy datasets missing fill IDs.
- Outlier thresholds may need tuning for high-volatility assets.

## ACCEPTANCE CRITERIA
- [ ] Private fills ingest produces normalized dataset + manifest + SHA256SUMS.PRIVATE_DATA.
- [ ] REAL mode calibration is selected for valid fixture private fills dataset.
- [ ] Strict-mode negative fixture fails as expected on missing fill IDs.
- [ ] `verify:epoch50` emits machine-readable outputs and passes determinism checks.
- [ ] E50 evidence pack exists with standard files and pack index.

## NOTES
Fixture dataset is committed under `data/fixtures/private/epoch50_fixture/` for offline reproducible verification.
