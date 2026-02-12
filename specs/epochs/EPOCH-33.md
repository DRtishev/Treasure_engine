# EPOCH-33 — Strategy Registry + Contracts

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines immutable strategy product contracts with semver compatibility and breaking-change detection.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 3: Strategy Product Plane)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#9, #10, #18)
- AI constraints: `docs/EDGE_RESEARCH/AI_MODULE.md` (model registry and promotion rules)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D4)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E33)

## REALITY SNAPSHOT
- E32 is READY (simulator contracts defined). E33 builds on E32 for strategy evaluation context.
- Depends on: **EPOCH-32** (SimReport contract).
- Consumes: E31 FeatureManifest for data compatibility checks, E32 SimReport for evaluation context.
- Produces: `StrategyManifest` contract for E34 signal generation and E37 WFO evaluation.

## GOALS
- Define immutable strategy product contracts with semver compatibility and breaking-change detection.
- Specify StrategyManifest schema with all required fields per CONTRACTS_CATALOG.md.
- Define MAJOR/MINOR/PATCH bump policy for strategy changes.

## NON-GOALS
- Implement strategy runtime logic or parameter optimization.
- Build signed artifact attestation (deferred to post-E36 per decision matrix).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: stable ordering, fixed seeds, canonical JSON hashing.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.
- AI module constraint: model promotion requires immutable registry records and evidence links (`docs/EDGE_RESEARCH/AI_MODULE.md` promotion rules).

## DESIGN / CONTRACTS
### Contract
- Schema: `StrategyManifest` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### StrategyManifest example
```json
{
  "schema_version": "1.0.0",
  "strategy_id": "strat.mean_reversion.btc",
  "name": "BTC Mean Reversion v2",
  "semver": "2.1.0",
  "engine_api_version": "1.3.0",
  "params_schema": {
    "type": "object",
    "properties": {
      "lookback_bars": {"type": "integer", "minimum": 10},
      "z_entry": {"type": "number", "minimum": 0.5}
    },
    "required": ["lookback_bars", "z_entry"]
  },
  "default_params": {
    "lookback_bars": 24,
    "z_entry": 2.0
  },
  "compatibility": {
    "min_data_schema": "1.0.0",
    "max_data_schema": "1.x"
  },
  "deterministic_settings": {
    "seed_policy": "fixed",
    "ordering": "stable_by_symbol_timestamp"
  },
  "artifact_hashes": {
    "code_sha256": "a1b2c3d4...",
    "config_sha256": "e5f6a7b8..."
  },
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "d4e5f6a7b8c9..."
  },
  "forbidden_values": {
    "semver": "must be valid semver",
    "strategy_id": "must not be empty"
  }
}
```

### Invariants
- Manifest is immutable after publish; any mutation requires a new semver.
- Breaking changes (params schema, data schema, label contract) require MAJOR bump.
- Compatible model upgrades require MINOR bump.
- Metadata/bugfix changes require PATCH bump.
- `params_schema` must validate `default_params` (self-consistent).
- Forbidden values: empty strategy_id, invalid semver, missing params_schema.

### Fingerprint rules
- Material: `canonical_json(params_schema + default_params + compatibility + artifact_hashes + semver + schema_version)`.
- Drift definition: any fingerprint mismatch under identical manifest is a failure.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch33`.
- Gate inputs: StrategyManifest contracts + version-change fixtures + seed config.
- Gate outputs: gate log, contract validation log, compatibility check log, verdict file.
- PASS semantics: all invariants hold, semver bump policy enforced, evidence complete, replay stable.
- FAIL semantics: any of: breaking change with non-MAJOR bump, invalid manifest, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: backward-compatible param update increments MINOR.
  - Must-fail: breaking param/schema change with non-MAJOR bump.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch33/SPEC_CONTRACTS.md` — StrategyManifest field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch33/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch33/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch33/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if semver bump policy is ambiguous or untestable.
- BLOCKED if manifest immutability invariant has no enforcement mechanism specified.
- BLOCKED if deterministic fingerprint rules are incomplete.
- BLOCKED if compatibility check logic is not specified.
- Rollback trigger: revert E33 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note.

## RISK REGISTER
- Unversioned strategy changes make audit impossible. Mitigation: immutable semver manifests with registry diff gate (Anti-pattern #9).
- Silent breaking changes cause runtime misconfiguration. Mitigation: compatibility checker across adjacent versions enforces MAJOR bump policy (Anti-pattern #10).
- Dependency drift invalidates strategy reproducibility. Mitigation: pinned lockfiles and environment manifests in artifact_hashes (Anti-pattern #18).
- Default params violate params_schema. Mitigation: self-validation gate (params_schema must validate default_params).
- Strategy proliferation without governance. Mitigation: registry immutability and promotion gate requirements.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.
- Schema evolution without migration path. Mitigation: schema_version bump policy with documented migration notes.

## ACCEPTANCE CRITERIA
- [ ] StrategyManifest schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload is present with complete field set.
- [ ] Semver bump policy (MAJOR/MINOR/PATCH) is explicit and testable.
- [ ] Manifest immutability invariant is specified.
- [ ] params_schema self-validates default_params.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#9 Unversioned strategies**: strategy behavior changes without semver bump. Detection: registry diff gate on StrategyManifest.
- **#10 Silent breaking changes**: incompatible params/data schema with minor/patch bump. Detection: compatibility checker across adjacent versions.
- **#18 Dependency drift during run**: unpinned package resolution changes behavior. Detection: lock-hash mismatch gate.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-07**: Regime Detection Engine — strategy compatibility with regime context input.
- **WOW-18**: Multi-Horizon Signal Ensemble — strategy manifest extension for multi-timeframe coordination.
- **D4 MAX**: Signed artifacts + attestation (post-E36 per decision matrix).

## NOTES
- Rollback plan: revert E33 spec, restore prior READY chain, and publish diagnostic evidence.
- Decision matrix reference: D4 (MVP: JSON manifest + semver guard) applies to this epoch.
