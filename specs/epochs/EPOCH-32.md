# EPOCH-32 — Microstructure Simulator

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines deterministic contracts for execution realism: slippage, fees, latency, and partial fills.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 2: Simulation Plane)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#5, #6, #7, #8)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D3)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E32)

## REALITY SNAPSHOT
- E31 is READY (PiT feature contracts defined). E32 builds on E31 feature outputs.
- Depends on: **EPOCH-31** (FeatureFrame/FeatureManifest contracts).
- Consumes: E31 feature pipeline outputs as simulation input data.
- Produces: `SimReport` contract for E33+ strategy evaluation and E38 gap monitoring.

## GOALS
- Define deterministic execution realism contracts for slippage, fees, latency, and partial fills with calibration evidence requirements.
- Eliminate fantasy fills by mandating non-zero spread/fee/latency models.
- Specify liquidity bucket classification for partial fill assumptions.

## NON-GOALS
- Implement simulator runtime logic or exchange integrations.
- Build adaptive microstructure models (deferred to WOW-03).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: stable ordering, fixed seeds, canonical JSON hashing, rounding to `price:1e-8`, `bps:1e-4`.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.

## DESIGN / CONTRACTS
### Contract
- Schema: `SimReport` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### SimReport example
```json
{
  "schema_version": "1.0.0",
  "sim_run_id": "sim-20260115-001",
  "slippage_model": "MVP_spread_v1",
  "fee_model": "venue_fee_binance_v1",
  "latency_model": "fixed_plus_dist",
  "partial_fill_assumptions": {
    "bucket": "MID",
    "estimated_fill_rate": 0.82,
    "adv_threshold_usd": 500000
  },
  "inputs_fingerprint": "a1b2c3d4e5f6...",
  "output_metrics": {
    "total_trades": 1024,
    "avg_slippage_bps": 3.2000,
    "avg_fee_bps": 7.5000,
    "avg_latency_ms": 45
  },
  "calibration_refs": {
    "fee_schedule_source": "binance_spot_2026Q1",
    "spread_data_snapshot": "snap-spread-20260101"
  },
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "c4d5e6f7a8b9..."
  },
  "forbidden_values": {
    "avg_slippage_bps": "must not be negative",
    "avg_fee_bps": "must not be negative",
    "avg_latency_ms": "must not be negative"
  }
}
```

### Invariants
- No fill without market context (bar data must exist at fill timestamp).
- Fees, slippage, and latency must be non-negative (zero only for zero-cost venues with explicit calibration evidence).
- Partial-fill assumptions must be explicit per liquidity bucket (HIGH/MID/LOW/MICRO).
- Slippage model must produce non-zero effective slippage under non-zero spread conditions.
- Forbidden values: NaN, Inf, negative fees/slippage/latency (per DETERMINISM_POLICY.md).

### Fingerprint rules
- Material: `canonical_json(model_config + input_dataset_hash + seed + schema_version + output_metrics_hash)`.
- Drift definition: any fingerprint mismatch under identical fixtures is deterministic failure (FAIL).

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch32`.
- Gate inputs: SimReport contracts + deterministic fixtures (non-zero spread scenario) + seed config.
- Gate outputs: gate log, contract validation log, deterministic replay diff, verdict file.
- PASS semantics: all invariants hold, non-zero slippage confirmed, evidence complete, replay fingerprint identical across 2 runs.
- FAIL semantics: any of: fantasy fill detected (zero slippage under non-zero spread), negative fee/slippage/latency, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: non-zero spread fixture yields non-zero effective slippage.
  - Must-fail: simulator returns zero slippage under non-zero spread and latency.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch32/SPEC_CONTRACTS.md` — SimReport field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch32/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch32/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch32/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if slippage/fee/latency models are not defined with non-negative invariants.
- BLOCKED if partial-fill assumptions are missing or ambiguous.
- BLOCKED if deterministic fingerprint rules are incomplete.
- BLOCKED if fantasy-fill detection fixture is not specified.
- Rollback trigger: revert E32 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note with cause and owner.

## RISK REGISTER
- Fantasy fills inflate backtest PnL leading to live losses. Mitigation: mandatory non-zero spread fixture and anti-pattern #5 detection (Anti-pattern #5).
- Partial fill assumptions ignore liquidity realities. Mitigation: explicit liquidity bucket classification with fill-rate bounds per bucket (Anti-pattern #6).
- Latency model ignores queue effects. Mitigation: latency perturbation test must shift fill quality; at minimum fixed+distribution model (Anti-pattern #7).
- Backtest/live path mismatch in simulator code. Mitigation: shared contracts and replay parity gates; SimReport used by both sim and shadow (Anti-pattern #8).
- Calibration data goes stale. Mitigation: calibration_refs in SimReport with explicit source and date; quarterly recalibration protocol (**HEURISTIC**).
- Fee schedule changes without detection. Mitigation: fee model version in SimReport; mismatch triggers WARN.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] SimReport schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload includes non-zero slippage, fees, and latency.
- [ ] Invariants are testable: non-negative fees/slippage/latency enforced.
- [ ] Partial-fill assumptions explicit per liquidity bucket.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Fantasy-fill detection fixture is specified (must-fail test vector).
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#5 Fantasy fills**: midpoint fills with zero spread/fees. Detection: E32 realism fixture with non-zero spread expected slippage.
- **#6 Ignoring partial fills**: all orders fill 100%. Detection: illiquid-book fixture requiring partial fill outcome.
- **#7 Latency blindness**: execution ignores queue/latency effects. Detection: latency perturbation test must shift fill quality.
- **#8 Backtest/live path mismatch**: different code paths. Detection: path parity check on canonical fixtures.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-03**: Adaptive microstructure model with calibration from real fills — parametric spread+fee+impact model.
- **WOW-04**: Partial Fill Simulator with Liquidity Buckets — dynamic bucket assignment and calibration.
- **WOW-05**: Latency-Aware Signal Freshness Engine — staleness-based rejection integrated into sim.

## NOTES
- Rollback plan: revert E32 spec, restore prior READY chain, and publish diagnostic evidence.
- Decision matrix reference: D3 (MVP: spread+fee+latency model) applies to this epoch.
