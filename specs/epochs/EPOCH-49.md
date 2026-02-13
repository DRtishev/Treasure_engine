# EPOCH-49 — Live Public Collector: Shadow Record/Replay + Data Quality

## REALITY SNAPSHOT
- Current state: no dedicated live public trades collector with deterministic replay + quality gate in SSOT.
- Dependency baseline: EPOCH-48.
- Evidence root for this epoch: `reports/evidence/EPOCH-49/`.

## GOALS
- Implement public-market trades collector in shadow mode (network opt-in only).
- Enforce deterministic offline replay over fixture dataset as default PASS path.
- Add data-quality checks: dedup, gap detection, out-of-order detection.

## NON-GOALS
- No live trading integration.
- No private endpoints or API-key workflows.
- No network requirement in default CI path.

## CONSTRAINTS
- `ENABLE_NETWORK=1` + provider allowlist required for record mode.
- `DATASET_ID` is mandatory for record/replay commands.
- Default verification uses committed fixture dataset and runs offline.

## DESIGN / CONTRACTS
- TradeEvent contract in `core/edge/data_contracts.mjs` with stable keys and fingerprints.
- Data quality engine in `core/edge/data_quality.mjs` returns deterministic quality metrics and warnings.
- Verify gate `verify:epoch49` produces machine-readable outputs under `reports/evidence/EPOCH-49/gates/manual/`.

## PATCH PLAN
- [ ] Add data contracts + quality module + live recorder/replayer CLI.
- [ ] Commit fixture dataset with raw/normalized chunks, manifest, and SHA256SUMS.DATA.
- [ ] Add verify gate with determinism + quality assertions and machine outputs.
- [ ] Generate E49 evidence pack using packager and update ledger/index after PASS.

## VERIFY
- `npm run verify:epoch49`
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:ledger`
- `npm run verify:release`
- strict mode: `CI=true` for all gates; `RELEASE_BUILD=1` for release verification

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-49/PREFLIGHT.log`
- `reports/evidence/EPOCH-49/COMMANDS.log`
- `reports/evidence/EPOCH-49/SNAPSHOT.md`
- `reports/evidence/EPOCH-49/SUMMARY.md`
- `reports/evidence/EPOCH-49/VERDICT.md`
- `reports/evidence/EPOCH-49/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-49/pack_index.json`

## STOP RULES
- BLOCKED if required gates fail twice.
- BLOCKED if replay fingerprint differs across repeated runs on same dataset.
- BLOCKED if manifest/hash contract fails.

## RISK REGISTER
- Heuristic dedup mode may over-collapse trades when identifiers are absent.
- Time-gap thresholds may need tuning for different symbols/providers.
- Network volatility can affect optional record-mode reproducibility.

## ACCEPTANCE CRITERIA
- [ ] Offline fixture replay passes determinism checks in `verify:epoch49`.
- [ ] Quality report emits dedup/gap/out-of-order metrics and warnings.
- [ ] Dataset manifest + SHA256 checks pass in `verify:epoch49`.
- [ ] Machine-readable verify outputs are written under evidence manual gate path.
- [ ] E49 evidence pack is generated with packager and ledger reflects DONE/PASS.

## NOTES
Provider chosen for E49 implementation: Binance public trades stream (`<symbol>@trade`).
