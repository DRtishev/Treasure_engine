# EPOCH-31 — Deterministic Data Model + Point-in-Time Feature Pipeline

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines deterministic contracts, invariants, and gate semantics for the PiT feature pipeline.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 1: Data Plane)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#1, #2, #3, #4, #17, #18)
- AI constraints: `docs/EDGE_RESEARCH/AI_MODULE.md` (dataset discipline)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E31)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D1, D2)

## REALITY SNAPSHOT
- E30 is DONE (status in LEDGER.json). E31 starts the EDGE runway and chains from E30.
- Depends on: **EPOCH-30** (legacy runway complete).
- Consumes: existing data pipeline primitives from E01..E16.
- Produces: `FeatureFrame` and `FeatureManifest` contracts for E32+.

## GOALS
- Produce an implementation-ready PiT feature contract that guarantees no look-ahead leakage, train-only normalization, and reproducible feature fingerprints across reruns.
- Define `FeatureFrame` and `FeatureManifest` schemas with all required fields per CONTRACTS_CATALOG.md.
- Specify positive and negative control fixtures for look-ahead leakage detection.

## NON-GOALS
- Implement extractor runtime code or data ingestion jobs.
- Introduce network dependence in default verification path.
- Define feature selection or model training logic (deferred to E37).

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: stable ordering by `(symbol, timestamp, row_id)`, fixed seeds, canonical JSON hashing, rounding to `price:1e-8`, `features:1e-6`.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.
- AI module constraint: point-in-time snapshots only; no forward-filled future labels (`docs/EDGE_RESEARCH/AI_MODULE.md` dataset discipline).

## DESIGN / CONTRACTS
### Contracts
- Schemas: `FeatureFrame`, `FeatureManifest` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### FeatureFrame example
```json
{
  "schema_version": "1.0.0",
  "symbol": "BTCUSDT",
  "ts_event": "2026-01-01T00:00:00Z",
  "ts_feature": "2026-01-01T00:00:01Z",
  "bar_interval": "1h",
  "features": {
    "ret_1": 0.001200,
    "vol_24h": 0.032100
  },
  "feature_vector_order": ["ret_1", "vol_24h"],
  "source_snapshot_id": "snap-20260101",
  "provenance": {
    "extractor": "batch_v1",
    "config_hash": "abc123def456"
  },
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "forbidden_values": {
    "features": "no NaN/Inf/negative prices"
  }
}
```

#### FeatureManifest example
```json
{
  "schema_version": "1.0.0",
  "snapshot_id": "snap-20260101",
  "dataset_hash_sha256": "a1b2c3d4e5f6...",
  "feature_hash_sha256": "f6e5d4c3b2a1...",
  "config_hash_sha256": "1a2b3c4d5e6f...",
  "seed": 12345,
  "extraction_params": {
    "bar_interval": "1h",
    "feature_set": "baseline_v1"
  },
  "row_count": 87600,
  "ts_min": "2025-01-01T00:00:00Z",
  "ts_max": "2025-12-31T23:00:00Z",
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "b4ae68c1f929..."
  },
  "forbidden_values": {
    "row_count": "must be > 0",
    "seed": "must be explicit integer"
  }
}
```

### Invariants
- For all rows, feature computation uses only records with `source_ts <= ts_event` (no look-ahead).
- Normalization fit statistics are derived from train partition only (no train+test leakage).
- Timestamps are monotonic per `(symbol, bar_interval)`.
- Forbidden values: NaN, Inf, negative price/volume (per DETERMINISM_POLICY.md).
- `feature_vector_order` must be stable and explicit; reordering is a fingerprint-breaking change.

### Fingerprint rules
- Material: `canonical_json(dataset_hash + feature_hash + config_hash + seed + schema_version)`.
- Canonical JSON per DETERMINISM_POLICY.md (sorted keys, fixed decimal, UTF-8, compact).
- Any replay mismatch for identical inputs is deterministic drift (FAIL).

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch31`.
- Gate inputs: epoch contracts + deterministic fixtures + seed config.
- Gate outputs: gate log, contract validation log, deterministic replay diff, verdict file.
- PASS semantics: all invariants hold, all evidence files present, replay fingerprint identical across 2 runs.
- FAIL semantics: any of: look-ahead leakage detected, normalization leakage detected, fingerprint mismatch, missing evidence file, forbidden value present.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: future rows unchanged => feature at `t` unchanged.
  - Must-fail: mutate future row (`ts > t`) and feature at `t` changes.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/FEATURE_CONTRACTS.md` — final field list and types for FeatureFrame and FeatureManifest.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/LOOKAHEAD_SENTINEL_PLAN.md` — positive and negative control fixture definitions.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/FINGERPRINT_RULES.md` — hash material, canonicalization rules, and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if any contract field or invariant is ambiguous or untestable.
- BLOCKED if deterministic fingerprint rules are incomplete or produce non-reproducible hashes.
- BLOCKED if a safety invariant (no-lookahead, no-network-default) can be bypassed.
- BLOCKED if positive-control leakage fixture is not specified.
- Rollback trigger: revert E31 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note with cause and owner.

## RISK REGISTER
- Look-ahead leakage in multi-symbol joins: feature at time `t` for symbol A uses data from symbol B at `t+1`. Mitigation: positive-control fixture covering multi-symbol temporal join (Anti-pattern #1).
- Normalization leakage across splits: scaler fit on train+test data. Mitigation: train-only fit with persisted transform artifacts and split-aware stat-hash check (Anti-pattern #3).
- Feature ordering drift: same values, different vector order, hash mismatch. Mitigation: explicit `feature_vector_order` contract invariant (Anti-pattern #4).
- Survivorship bias in dataset: dead/delisted symbols absent. Mitigation: symbol-universe snapshots by date (Anti-pattern #2).
- Rounding policy mismatch across tools. Mitigation: enforce DETERMINISM_POLICY.md decimal policy in contract validation.
- Split-map corruption. Mitigation: hash split-map and verify before extraction.
- Evidence omission under pressure. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] Contract defines all required fields and types for `FeatureFrame` and `FeatureManifest` per CONTRACTS_CATALOG.md.
- [ ] Deterministic hash material is explicitly listed and canonicalized per DETERMINISM_POLICY.md.
- [ ] No-lookahead positive-control fixture is specified (mutate future row, verify feature unchanged).
- [ ] No-lookahead negative-control fixture is specified (clean data passes sentinel).
- [ ] Train-only normalization invariant is explicit and testable.
- [ ] Offline-first and no-network default is explicit.
- [ ] Evidence file set is complete and path-stable.
- [ ] Replay determinism criterion is binary and testable (2-run fingerprint match).
- [ ] Rollback plan is actionable.
- [ ] Safety invariant (no live orders) remains preserved.

## TRAPS (Anti-Pattern Cross-References)
- **#1 Look-ahead leakage**: feature at time `t` changes when future rows are modified. Detection: E31 future-mutation sentinel fixture.
- **#2 Survivorship bias**: dead/delisted symbols absent from training sets. Detection: dataset completeness audit.
- **#3 Normalization leakage**: scaler fit stats computed over train+test. Detection: split-aware stat-hash check.
- **#4 Unstable feature ordering**: same values, different vector ordering. Detection: shuffled-input replay fingerprint check.
- **#17 Hidden network dependency**: default gates require internet. Detection: offline CI run.
- **#18 Dependency drift during run**: unpinned packages change behavior. Detection: lock-hash mismatch gate.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-01**: Point-in-Time Feature Store with Temporal Join Engine — advanced lineage DAG and cache graph.
- **WOW-02**: Order Flow Imbalance Features (OFI) from L2 Snapshots — extended FeatureFrame with VPIN/OFI.
- **WOW-06**: Cross-Venue Feature Divergence Detector — multi-venue divergence metric in FeatureFrame.
- **WOW-07**: Regime Detection Engine — regime context features from HMM.
- **WOW-08**: Funding Rate Alpha — funding rate z-score features.
- **WOW-09**: Volatility Surface Features — IV skew and term structure.

## NOTES
- Rollback plan: revert E31 spec + index/ledger linkage; mark E31 BLOCKED with cause and owner.
- Decision matrix reference: D1 (MVP: immutable local snapshots + manifests) and D2 (MVP: deterministic batch extractor) apply to this epoch.
