# EPOCH-39 — Shadow Live Harness + Canary Governor

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines no-order shadow enforcement and canary phase progression with rollback guards.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 5: Safety Plane — shadow guards, canary governor)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#15, #16, #17)
- AI constraints: `docs/EDGE_RESEARCH/AI_MODULE.md` (shadow mode cannot place orders)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D9)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E39)

## REALITY SNAPSHOT
- E38 is READY (gap monitor and auto-brake contracts defined). E39 defines the shadow execution environment.
- Depends on: **EPOCH-38** (GapReport contract for gap-triggered canary decisions).
- Consumes: E34 Intent payloads for shadow execution, E36 RiskState for safety guards, E38 GapReport for gap monitoring.
- Produces: `ShadowRunRecord` contract for E38 shadow reference and E40 certification evidence.

## GOALS
- Define no-order shadow enforcement with compile-time and runtime guards.
- Specify ShadowRunRecord schema with all required fields per CONTRACTS_CATALOG.md.
- Define canary phase progression (5 -> 15 -> 35 -> 70 -> 100) with rollback gates at each transition.

## NON-GOALS
- Implement shadow harness or canary governor runtime logic.
- Enable live order placement (remains forbidden by default).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: shadow run outputs are deterministic given identical intents and context.
- No live trading by default; shadow mode enforces `orders_submitted == 0` and `order_adapter_state == "DISABLED"`.
- No secrets in repo or evidence artifacts.
- AI module constraint: shadow inference outputs Signal/Intent candidates only; shadow mode cannot place orders (`docs/EDGE_RESEARCH/AI_MODULE.md`).

## DESIGN / CONTRACTS
### Contract
- Schema: `ShadowRunRecord` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### ShadowRunRecord example
```json
{
  "schema_version": "1.0.0",
  "run_id": "shadow-20260115-001",
  "timestamp": "2026-01-15T12:00:00Z",
  "intents_emitted": 41,
  "orders_submitted": 0,
  "order_adapter_state": "DISABLED",
  "guards": {
    "compile_time_disable": true,
    "runtime_assert": true,
    "adapter_state_check": true,
    "risk_mode_check": true
  },
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "d0e1f2a3b4c5..."
  },
  "forbidden_values": {
    "orders_submitted": "must be 0 in shadow mode",
    "order_adapter_state": "must be DISABLED in shadow mode"
  }
}
```

### Canary Phase Progression
- Phases: 5% -> 15% -> 35% -> 70% -> 100% allocation ramp.
- Each phase transition requires:
  - Previous phase duration met (minimum observation period).
  - GapReport score below escalation threshold.
  - RiskState not in RESTRICTED or HALTED.
  - Operator acknowledgment.
- Phase skipping is forbidden; sequence must be strictly followed.
- Rollback: any phase can revert to previous phase or to shadow (0%) on trigger.

### Invariants
- `orders_submitted` must equal `0` in shadow mode.
- `order_adapter_state` must be `"DISABLED"` in shadow mode.
- Both compile-time and runtime guards are required (defense in depth).
- Canary phases must follow 5 -> 15 -> 35 -> 70 -> 100 sequence strictly.
- Phase skipping is a hard FAIL.
- Forbidden values: non-zero orders_submitted in shadow, non-DISABLED adapter state in shadow.

### Fingerprint rules
- Material: `canonical_json(guard_states + emitted_intent_ids_sorted + canary_phase + runtime_policy_hash + schema_version)`.
- Drift definition: identical inputs must yield identical ShadowRunRecord fingerprint.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch39`.
- Gate inputs: ShadowRunRecord contracts + shadow-mode fixtures + canary-phase-skip fixture + seed config.
- Gate outputs: gate log, shadow guard assertion log, canary phase log, verdict file.
- PASS semantics: shadow run emits intents with `orders_submitted == 0`, canary phases follow sequence, evidence complete, replay stable.
- FAIL semantics: any of: non-zero order submission in shadow, adapter not DISABLED, canary phase skipped, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: shadow run emits intents with `orders_submitted=0`.
  - Must-fail: any non-zero order submission or enabled order adapter in shadow.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch39/SPEC_CONTRACTS.md` — ShadowRunRecord field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch39/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch39/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch39/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if shadow no-order invariant enforcement (compile-time + runtime) is not specified.
- BLOCKED if canary phase sequence is not strictly defined.
- BLOCKED if phase transition requirements are ambiguous.
- BLOCKED if deterministic fingerprint rules are incomplete.
- Rollback trigger: revert E39 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note.

## RISK REGISTER
- Shadow places real orders: order adapter emits live submissions in shadow mode. Mitigation: compile-time disable + runtime hard assert + adapter state check (Anti-pattern #15).
- Canary phase skipping: direct jump to high allocation percentage. Mitigation: phase progression gate with strict sequence constraints (Anti-pattern #16).
- Hidden network dependency in shadow harness. Mitigation: explicit `ENABLE_NETWORK_TESTS=1` guard; default path is offline (Anti-pattern #17).
- Guard checks incomplete or missing. Mitigation: all guard checks must produce explicit pass entries in guards object.
- Phase rollback not tested. Mitigation: rollback fixture must demonstrate safe phase regression.
- Canary observation period too short. Mitigation: minimum observation period per phase specified in config.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] ShadowRunRecord schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload includes intents, zero orders, DISABLED adapter, and guard checks.
- [ ] Shadow no-order invariant enforced at both compile-time and runtime.
- [ ] Canary phase sequence (5/15/35/70/100) is explicit and strictly ordered.
- [ ] Phase transition requirements are specified (duration, gap score, risk mode, ack).
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#15 Shadow places real orders**: order adapter emits live submissions in shadow mode. Detection: assert `orders_submitted==0` and adapter state DISABLED.
- **#16 Canary phase skipping**: direct jump to high allocation. Detection: phase progression gate with sequence constraints.
- **#17 Hidden network dependency**: default gates require internet. Detection: offline CI run with network denied.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-03**: Adaptive microstructure model — shadow fills for calibration feedback.
- **D9 MAX**: Full governor automation (E40+ per decision matrix).

## NOTES
- Rollback plan: revert E39 spec, restore prior READY chain, and publish diagnostic evidence.
- Decision matrix reference: D9 (MVP: shadow-only + canary ladder) applies to this epoch.
