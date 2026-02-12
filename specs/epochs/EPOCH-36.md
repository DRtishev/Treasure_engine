# EPOCH-36 — Risk Brain

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines non-bypassable FSM risk governance with kill-switch matrix and cooldown semantics.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 5: Safety Plane — risk FSM)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#13, #14)
- AI constraints: `docs/EDGE_RESEARCH/AI_MODULE.md` (HALTED mode non-bypassable by AI)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D7)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E36)

## REALITY SNAPSHOT
- E35 is READY (portfolio allocation contracts defined). E36 governs risk state for E35 allocation and E38 gap monitoring.
- Depends on: **EPOCH-35** (PortfolioState contract).
- Consumes: E35 PortfolioState for drawdown/exposure triggers, E38 GapReport for gap-based triggers.
- Produces: `RiskState` contract for E35 HALTED blocking, E38 escalation target, and E39 shadow guards.

## GOALS
- Define non-bypassable FSM risk governance with kill-switch matrix and cooldown semantics.
- Specify RiskState schema with all required fields per CONTRACTS_CATALOG.md.
- Define FSM transition rules: NORMAL -> CAUTIOUS -> RESTRICTED -> HALTED and governed exit.

## NON-GOALS
- Implement risk FSM runtime logic.
- Build adaptive thresholds (deferred to post-E38 per decision matrix).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: FSM transitions are deterministic given trigger state.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.
- AI module constraint: HALTED risk mode is non-bypassable by AI module (`docs/EDGE_RESEARCH/AI_MODULE.md`).

## DESIGN / CONTRACTS
### Contract
- Schema: `RiskState` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### RiskState example
```json
{
  "schema_version": "1.0.0",
  "timestamp": "2026-01-15T12:00:00Z",
  "mode": "CAUTIOUS",
  "active_triggers": ["drawdown_warn", "loss_streak_3"],
  "cooldown_until": "2026-01-15T13:00:00Z",
  "kill_switches": {
    "max_drawdown": {"threshold": 0.10, "current": 0.07, "state": "ARMED"},
    "gap_score": {"threshold": 0.80, "current": 0.42, "state": "OK"},
    "slippage_spike": {"threshold": 15.0, "current": 3.2, "state": "OK"},
    "data_integrity": {"state": "OK"}
  },
  "manual_override": null,
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "e1f2a3b4c5d6..."
  },
  "forbidden_values": {
    "mode": "must be one of NORMAL/CAUTIOUS/RESTRICTED/HALTED",
    "active_triggers": "must not contain unknown trigger types"
  }
}
```

### Invariants
- FSM transitions: NORMAL -> CAUTIOUS -> RESTRICTED -> HALTED (forward escalation).
- HALTED cannot be bypassed by manual toggle alone; exit requires: cooldown expired + operator ack + successful deterministic replay.
- Kill-switch matrix triggers: max drawdown breach, consecutive loss streak, gap score breach, slippage spike, latency spike, rejection spike, data integrity failure, determinism mismatch replay, manual emergency halt.
- NORMAL -> CAUTIOUS: first warning trigger.
- CAUTIOUS -> RESTRICTED: repeated warning or one severe trigger.
- RESTRICTED -> HALTED: critical trigger or two severe triggers within rolling window.
- All trigger thresholds are **HEURISTIC** and require quarterly calibration.
- Forbidden values: unknown mode, unknown trigger types.

### Fingerprint rules
- Material: `canonical_json(mode + active_triggers_sorted + cooldown_until + threshold_config_hash + timestamp_bucket)`.
- Drift definition: identical trigger state must yield identical FSM mode.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch36`.
- Gate inputs: RiskState contracts + FSM transition fixtures + HALTED-bypass-attempt fixture + seed config.
- Gate outputs: gate log, FSM transition log, HALTED-bypass rejection log, verdict file.
- Machine-check gate rule: gate result is PASS only when exit code is 0 and every listed evidence file exists under `reports/evidence/<EVIDENCE_EPOCH>/epoch36/`.
- PASS semantics: FSM transitions follow defined rules, HALTED non-bypassable, evidence complete, replay stable.
- FAIL semantics: any of: HALTED bypassed without proper exit protocol, invalid FSM transition, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: severe trigger escalates FSM per transition policy.
  - Must-fail: HALTED mode bypassed without cooldown+ack+replay pass.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch36/SPEC_CONTRACTS.md` — RiskState field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch36/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch36/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch36/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if FSM transition rules are ambiguous or allow skip transitions.
- BLOCKED if HALTED exit protocol is not fully specified (cooldown + ack + replay).
- BLOCKED if kill-switch matrix triggers are not enumerated.
- BLOCKED if deterministic fingerprint rules are incomplete.
- Rollback trigger: revert E36 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note.

## RISK REGISTER
- Risk FSM bypass: system exits HALTED without proper protocol. Mitigation: non-bypass transition assertion with three-part exit (cooldown + ack + replay) (Anti-pattern #13).
- Gap drift ignored: large sim-shadow drift without brake escalation. Mitigation: gap_score kill-switch in matrix with defined thresholds (Anti-pattern #14).
- Threshold values are **HEURISTIC** and may be miscalibrated. Mitigation: quarterly calibration protocol with documented data window and objective.
- Trigger proliferation makes FSM unpredictable. Mitigation: enumerated trigger set in kill-switch matrix; unknown triggers rejected.
- Cooldown too short allows rapid HALTED exit. Mitigation: minimum cooldown duration specified in config.
- Manual override without audit trail. Mitigation: manual_override field records operator, reason, and timestamp.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] RiskState schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload includes mode, triggers, cooldown, and kill-switches.
- [ ] FSM transition rules are explicit and testable (4 modes, defined escalation).
- [ ] HALTED exit requires cooldown + operator ack + deterministic replay.
- [ ] Kill-switch matrix enumerates all trigger types.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#13 Risk FSM bypass**: system exits HALTED without cooldown and signoff. Detection: non-bypass transition assertion.
- **#14 Gap drift ignored**: large sim-shadow drift without brake escalation. Detection: synthetic drift scenario should trigger brake action.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-22**: Anti-Blowup Shield — drawdown-conditional sizing integrated into risk governance.
- **WOW-24**: Tail Hedge Automation — automatic hedge placement on extreme risk events.
- **D7 MAX**: Adaptive thresholds (post-E38 per decision matrix).

## NOTES
- Rollback plan: revert E36 spec, restore prior READY chain, and publish diagnostic evidence.
- Decision matrix reference: D7 (MVP: FSM + static thresholds) applies to this epoch.
