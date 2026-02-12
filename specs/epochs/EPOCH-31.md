# EPOCH-31 — Deterministic Data Model + Point-in-Time Feature Pipeline

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines deterministic contracts, invariants, and gate semantics.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- Contracts are designed for JSON Schema and TS-shape parity.
- Fingerprint rules define reproducibility criteria.
- Safety invariants are non-bypassable.
- This document is authoritative for epoch implementation scope.

## Where to look next
- `docs/SDD_EDGE_EPOCHS_31_40.md`
- `docs/EDGE_RESEARCH/ANTI_PATTERNS.md`

## REALITY SNAPSHOT
- E30 is DONE; E31 starts EDGE runway and must chain from E30 in ledger dependencies.

## GOALS
Produce an implementation-ready PiT feature contract that guarantees no look-ahead leakage, train-only normalization, and reproducible feature fingerprints across reruns.

## NON-GOALS
- Implement extractor runtime code or data ingestion jobs.
- Introduce network dependence in default verification path.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism required: stable ordering, fixed seeds, canonical hashing.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.

## DESIGN / CONTRACTS
### Contracts
- Schema: `FeatureFrame` and `FeatureManifest`.
- Minimal `FeatureFrame` example:
```json
{"schema_version":"1.0.0","symbol":"BTCUSDT","ts_event":"2026-01-01T00:00:00Z","features":{"ret_1":0.0012},"feature_vector_order":["ret_1"],"deterministic_fingerprint":{"algo":"sha256","value":"<hex>"}}
```
- Minimal `FeatureManifest` example:
```json
{"schema_version":"1.0.0","snapshot_id":"snap-20260101","dataset_hash_sha256":"<hex>","feature_hash_sha256":"<hex>","config_hash_sha256":"<hex>","seed":12345}
```
### Invariants
- For all rows, feature computation uses only records with `source_ts <= ts_event`.
- Normalization fit statistics are derived from train partition only.
- Timestamps are monotonic per `(symbol, bar_interval)`.
- Forbidden values: NaN, Inf, negative price/volume.
### Fingerprint rules
- `fingerprint = sha256(canonical_json(dataset_hash + feature_hash + config_hash + seed + schema_version))`.
- Canonical JSON uses sorted keys and deterministic decimal formatting (1e-8).
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
- PASS semantics: all invariants hold, evidence complete, replay stable.
- FAIL semantics: leakage/bypass/nondeterminism/missing evidence triggers FAIL.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/FEATURE_CONTRACTS.md` (final field list + types).
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/LOOKAHEAD_SENTINEL_PLAN.md` (positive/negative controls).
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/FINGERPRINT_RULES.md` (hash material and canonicalization).
- `reports/evidence/<EVIDENCE_EPOCH>/epoch31/VERDICT.md` (PASS/BLOCKED rationale).

## STOP RULES
- BLOCKED if any contract field/invariant is ambiguous or untestable.
- BLOCKED if deterministic fingerprint rules are incomplete.
- BLOCKED if a safety invariant can be bypassed.
- Rollback trigger: revert epoch READY claim and restore previous ledger/index dependency state with diagnostic note.

## RISK REGISTER
- Leakage fixture does not cover multi-symbol joins. Mitigation: include multi-symbol positive control.
- Rounding policy mismatch across tools. Mitigation: enforce decimal policy in contract.
- Split-map corruption. Mitigation: hash split-map and verify before extraction.
- Clock/timezone conversion mistakes. Mitigation: UTC-only timestamps and parser lint.
- Feature ordering drift. Mitigation: explicit `feature_vector_order` invariant.
- Evidence omission under pressure. Mitigation: required file checklist gate.
- Schema evolution drift. Mitigation: schema_version bump policy and migration note.

## ACCEPTANCE CRITERIA
- [ ] Contract defines all required fields and types for `FeatureFrame` and `FeatureManifest`.
- [ ] Deterministic hash material is explicitly listed and canonicalized.
- [ ] No-lookahead positive-control fixture is specified.
- [ ] No-lookahead negative-control fixture is specified.
- [ ] Train-only normalization invariant is explicit.
- [ ] Offline-first and no-network default is explicit.
- [ ] Evidence file set is complete and path-stable.
- [ ] Replay determinism criterion is binary and testable.
- [ ] Rollback plan is actionable.
- [ ] Safety invariant (no live orders) remains preserved.

## NOTES
- Rollback plan: revert E31 spec + index/ledger linkage; mark E31 BLOCKED with cause and owner.
