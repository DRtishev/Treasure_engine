# EPOCH-38 — Reality Gap Monitor + Auto-Brake

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines deterministic gap scoring between simulation and shadow/live with calibrated brake actions.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 5: Safety Plane — gap monitor)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#14, #8)
- AI constraints: `docs/EDGE_RESEARCH/AI_MODULE.md` (drift/degradation triggers, confidence caps)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D7 MAX: adaptive thresholds post-E38)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E38)

## REALITY SNAPSHOT
- E37 is READY (WFO and leakage sentinel contracts defined). E38 monitors sim-vs-shadow drift.
- Depends on: **EPOCH-37** (WFOReport contract for baseline comparison).
- Consumes: E32 SimReport for simulation baseline, E39 ShadowRunRecord for live observations.
- Produces: `GapReport` contract for E36 RiskState escalation and E40 certification.

## GOALS
- Define deterministic gap scoring and brake actions with calibrated thresholds and escalation rules.
- Specify GapReport schema with all required fields per CONTRACTS_CATALOG.md.
- Define brake action escalation: NONE -> WARNING -> REDUCE -> FULL_STOP, with FULL_STOP triggering RiskState HALTED.

## NON-GOALS
- Implement gap monitor runtime logic.
- Build adaptive threshold calibration (deferred to D7 MAX post-E38).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: gap scoring is deterministic given component deltas and threshold config.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.
- AI module constraint: drift/degradation must trigger confidence caps and risk escalation; safe fallback chain: primary model -> conservative baseline -> no-trade (`docs/EDGE_RESEARCH/AI_MODULE.md`).

## DESIGN / CONTRACTS
### Contract
- Schema: `GapReport` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### GapReport example
```json
{
  "schema_version": "1.0.0",
  "timestamp": "2026-01-15T12:00:00Z",
  "sim_ref": "sim-20260115-001",
  "shadow_ref": "shadow-20260115-001",
  "delta_slippage_bps": 1.8000,
  "delta_fill_rate": -0.0700,
  "delta_latency_ms": 12.0000,
  "delta_reject_rate": 0.0200,
  "delta_pnl": -450.00000000,
  "gap_score": 0.4200,
  "brake_action": "WARNING",
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "c9d0e1f2a3b4..."
  },
  "forbidden_values": {
    "gap_score": "must be in [0, 1]",
    "brake_action": "must be one of NONE/WARNING/REDUCE/FULL_STOP"
  }
}
```

### Invariants
- Gap components: delta_slippage_bps, delta_fill_rate, delta_latency_ms, delta_reject_rate, delta_pnl are all required.
- gap_score is a composite scalar in [0, 1] derived from weighted component deltas.
- Brake action mapping: gap_score thresholds determine action level.
  - `gap_score < T_warn`: NONE.
  - `T_warn <= gap_score < T_reduce`: WARNING.
  - `T_reduce <= gap_score < T_stop`: REDUCE.
  - `gap_score >= T_stop`: FULL_STOP.
- FULL_STOP must escalate RiskState to HALTED (cross-epoch invariant with E36).
- All thresholds (`T_warn`, `T_reduce`, `T_stop`) are **HEURISTIC** and require quarterly calibration.
- Forbidden values: gap_score outside [0, 1], unknown brake_action.

### Fingerprint rules
- Material: `canonical_json(component_deltas + threshold_config + action_decision + policy_version + schema_version)`.
- Drift definition: identical component deltas and config must yield identical gap_score and brake_action.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch38`.
- Gate inputs: GapReport contracts + threshold-crossing fixtures + FULL_STOP escalation fixture + seed config.
- Gate outputs: gate log, gap score computation log, brake action log, RiskState escalation proof, verdict file.
- PASS semantics: gap_score thresholds correctly trigger brake actions, FULL_STOP escalates to HALTED, evidence complete, replay stable.
- FAIL semantics: any of: FULL_STOP does not escalate to HALTED, threshold miscategorization, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: elevated gap_score triggers WARNING/REDUCE/FULL_STOP per thresholds.
  - Must-fail: FULL_STOP condition occurs but risk mode does not escalate to HALTED.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch38/SPEC_CONTRACTS.md` — GapReport field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch38/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch38/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch38/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if gap_score composition formula is not specified.
- BLOCKED if FULL_STOP -> HALTED escalation is not explicitly linked to E36 RiskState.
- BLOCKED if threshold values are not labeled **HEURISTIC** with calibration protocol.
- BLOCKED if deterministic fingerprint rules are incomplete.
- Rollback trigger: revert E38 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note.

## RISK REGISTER
- Gap drift ignored: large sim-shadow drift without brake escalation. Mitigation: gap_score thresholds with mandatory brake action mapping (Anti-pattern #14).
- Backtest/live path mismatch causes persistent gap. Mitigation: shared contracts and replay parity gates (Anti-pattern #8).
- Threshold values are **HEURISTIC** and may be miscalibrated. Mitigation: quarterly calibration protocol with documented data window and objective.
- Gap score composition weights are subjective. Mitigation: weights documented as **HEURISTIC** with sensitivity analysis requirement.
- FULL_STOP not wired to RiskState. Mitigation: cross-epoch integration test with E36 contract.
- Stale shadow data produces misleading gap. Mitigation: shadow freshness check; stale shadow data triggers WARNING.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] GapReport schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload includes all component deltas, gap_score, and brake_action.
- [ ] Brake action mapping is explicit: NONE/WARNING/REDUCE/FULL_STOP with threshold ranges.
- [ ] FULL_STOP escalation to HALTED is explicitly linked to E36 RiskState.
- [ ] All thresholds labeled **HEURISTIC** with calibration protocol.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#14 Gap drift ignored**: large sim-shadow drift without brake escalation. Detection: synthetic drift scenario should trigger brake action.
- **#8 Backtest/live path mismatch**: different code paths for signal or risk logic. Detection: path parity check on canonical fixtures.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-03**: Adaptive microstructure model — calibration feedback loop from gap monitoring.
- **WOW-07**: Regime Detection Engine — regime-aware gap threshold adjustment.
- **D7 MAX**: Adaptive thresholds (post-E38 per decision matrix).

## NOTES
- Rollback plan: revert E38 spec, restore prior READY chain, and publish diagnostic evidence.
- Cross-epoch dependency: E38 FULL_STOP must integrate with E36 RiskState HALTED transition.
