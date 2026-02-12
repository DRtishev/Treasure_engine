# EPOCH-37 — Walk-Forward Optimization + Leakage Sentinel v2

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines anti-overfit court with pre-committed WFO windows, purging/embargo, and leakage battery controls.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 6: Validation Plane)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#1, #3, #19)
- AI constraints: `docs/EDGE_RESEARCH/AI_MODULE.md` (dataset discipline, leakage controls, evaluation baseline)
- Sources: `docs/EDGE_RESEARCH/SOURCES.md` (Lopez de Prado, Bailey et al.)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D8)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E37)

## REALITY SNAPSHOT
- E36 is READY (risk FSM contracts defined). E37 provides validation controls that feed into E34-E35 decision quality.
- Depends on: **EPOCH-36** (RiskState contract for escalation on validation failures).
- Consumes: E31 FeatureManifest for dataset provenance, E33 StrategyManifest for evaluation targets.
- Produces: `WFOReport` contract for E38 gap comparison and E40 certification.

## GOALS
- Define anti-overfit court with pre-committed walk-forward windows, purging/embargo rules, and leakage battery controls.
- Specify WFOReport schema with all required fields per CONTRACTS_CATALOG.md.
- Specify positive-control (injected leakage must FAIL) and negative-control (clean data must PASS) fixtures.

## NON-GOALS
- Implement WFO runtime or model training logic.
- Implement advanced techniques (CPCV, PBO, DSR, SPA) in MVP scope (deferred to WOW-14/15).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: WFO windows are pre-committed and hash-locked; same seed and data produce identical report.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.
- AI module constraints: training on future labels forbidden; point-in-time snapshots only; stable sample ordering persisted in run manifest; deterministic rerun must yield identical fingerprint (`docs/EDGE_RESEARCH/AI_MODULE.md`).

## DESIGN / CONTRACTS
### Contract
- Schema: `WFOReport` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### WFOReport example
```json
{
  "schema_version": "1.0.0",
  "run_id": "wfo-20260115-001",
  "windows": [
    {"is_start": "2025-01-01", "is_end": "2025-06-30", "oos_start": "2025-07-01", "oos_end": "2025-09-30"},
    {"is_start": "2025-04-01", "is_end": "2025-09-30", "oos_start": "2025-10-01", "oos_end": "2025-12-31"}
  ],
  "purge_bars": 10,
  "embargo_bars": 5,
  "selection_criteria": {
    "metric": "sharpe_ratio",
    "threshold": 0.50,
    "threshold_label": "HEURISTIC"
  },
  "is_metrics": {
    "sharpe_ratio": 1.85,
    "max_drawdown": 0.08
  },
  "oos_metrics": {
    "sharpe_ratio": 0.92,
    "max_drawdown": 0.12
  },
  "seed_dispersion": {
    "seeds_tested": [12345, 54321, 99999],
    "sharpe_std": 0.15,
    "pass": true
  },
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "a7b8c9d0e1f2..."
  },
  "forbidden_values": {
    "purge_bars": "must be >= 0",
    "embargo_bars": "must be >= 0",
    "windows": "must not be empty"
  }
}
```

### Invariants
- WFO windows are pre-committed before any model training; post-hoc window selection is forbidden.
- Window definitions are hash-locked in the WFOReport manifest.
- Purge bars remove label-horizon overlap between IS and OOS windows.
- Embargo bars add additional buffer after purge to prevent subtle leakage.
- Leakage positive-control: injecting known future labels must trigger sentinel FAIL.
- Leakage negative-control: clean point-in-time data must pass sentinel.
- Selection criteria thresholds are **HEURISTIC** and require documented calibration protocol.
- Forbidden values: empty windows, negative purge/embargo bars.

### Fingerprint rules
- Material: `canonical_json(window_definitions + purge_embargo_config + metric_set + seed_vector + schema_version)`.
- Drift definition: identical inputs must yield identical WFOReport fingerprint.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch37`.
- Gate inputs: WFOReport contracts + leakage battery fixtures (positive and negative control) + seed config.
- Gate outputs: gate log, leakage sentinel results, cross-seed dispersion report, verdict file.
- Machine-check gate rule: gate result is PASS only when exit code is 0 and every listed evidence file exists under `reports/evidence/<EVIDENCE_EPOCH>/epoch37/`.
- PASS semantics: clean dataset passes sentinel, injected leakage detected, cross-seed dispersion within bounds, evidence complete, replay stable.
- FAIL semantics: any of: leakage not detected on positive control, clean data fails sentinel, dispersion exceeds bound, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: clean dataset passes leakage battery.
  - Must-fail: injected label leakage not detected.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch37/SPEC_CONTRACTS.md` — WFOReport field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch37/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch37/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch37/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if leakage battery positive-control fixture is not specified.
- BLOCKED if WFO window pre-commitment and hash-locking are not enforced.
- BLOCKED if purge/embargo rules are ambiguous.
- BLOCKED if deterministic fingerprint rules are incomplete.
- Rollback trigger: revert E37 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note.

## RISK REGISTER
- Look-ahead leakage in WFO windows: future labels leak into training set. Mitigation: purge/embargo bars and positive-control leakage battery (Anti-pattern #1).
- Normalization leakage across IS/OOS: scaler fit on combined data. Mitigation: train-only fit with split-aware stat-hash check (Anti-pattern #3).
- Evidence theater: PASS claim without actual leakage sentinel execution. Mitigation: evidence completeness linter requires sentinel logs (Anti-pattern #19).
- OOS threshold is **HEURISTIC** and may be too permissive. Mitigation: quarterly calibration with documented data window and objective.
- Cross-seed instability masked by single-seed evaluation. Mitigation: mandatory multi-seed dispersion check.
- Window selection bias. Mitigation: pre-committed windows hash-locked before any model training.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] WFOReport schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload includes windows, purge/embargo, IS/OOS metrics, and seed dispersion.
- [ ] Leakage battery positive-control fixture is specified (inject future labels, sentinel must FAIL).
- [ ] Leakage battery negative-control fixture is specified (clean data, sentinel must PASS).
- [ ] Purge/embargo rules are explicit and testable.
- [ ] Selection criteria thresholds are labeled **HEURISTIC** with calibration protocol.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#1 Look-ahead leakage**: future data in features or labels. Detection: leakage battery positive/negative control.
- **#3 Normalization leakage**: scaler fit stats computed over train+test. Detection: split-aware stat-hash check.
- **#19 Evidence theater**: PASS claim without logs/manifests/verdict. Detection: evidence completeness linter.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-14**: Combinatorial Purged Cross-Validation (CPCV) Pipeline — advanced overfit court technique.
- **WOW-15**: Probability of Backtest Overfitting (PBO) — selection bias quantification.
- **WOW-30**: Leakage Sentinel v3: Automatic Fuzzing Pipeline — automated leakage discovery.
- **D8 MAX**: CPCV + PBO/DSR/SPA/WRC (post-E37 per decision matrix).

## NOTES
- Rollback plan: revert E37 spec, restore prior READY chain, and publish diagnostic evidence.
- Decision matrix reference: D8 (MVP: locked WFO + leakage battery) applies to this epoch.
- Source references: Lopez de Prado (2018) for purging/embargo/CPCV foundations; Bailey et al. (2014) for PBO (Tier-1).
