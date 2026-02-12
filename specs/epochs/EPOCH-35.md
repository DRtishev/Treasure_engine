# EPOCH-35 — Portfolio Allocation

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines deterministic sizing and allocation with bounded Kelly-inspired controls and exposure constraints.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 4: Decision Plane — allocation)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#12)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D6)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E35)

## REALITY SNAPSHOT
- E34 is READY (Signal/Intent pipeline contracts defined). E35 sizes intents into portfolio allocations.
- Depends on: **EPOCH-34** (Signal and Intent contracts).
- Consumes: E34 Intent payloads, E36 RiskState for mode-based blocking.
- Produces: `PortfolioState` contract for E36 risk governance and E39 shadow evaluation.

## GOALS
- Define deterministic sizing/allocation with bounded fractional Kelly controls and exposure constraints.
- Specify PortfolioState schema with all required fields per CONTRACTS_CATALOG.md.
- Define leverage, concentration, and turnover caps as enforceable invariants.

## NON-GOALS
- Implement allocation runtime logic or optimizer.
- Build unconstrained Kelly sizing (deferred to WOW-22 anti-blowup controls).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: stable ordering, fixed seeds, canonical JSON hashing.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.
- HALTED risk mode (from E36) blocks all new risk allocation.

## DESIGN / CONTRACTS
### Contract
- Schema: `PortfolioState` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### PortfolioState example
```json
{
  "schema_version": "1.0.0",
  "timestamp": "2026-01-15T12:00:00Z",
  "equity": 100000.00000000,
  "cash": 65000.00000000,
  "gross_exposure": 0.35000000,
  "net_exposure": 0.20000000,
  "leverage": 1.10000000,
  "positions": [
    {"symbol": "BTCUSDT", "qty": 0.20000000, "notional": 20000.00},
    {"symbol": "ETHUSDT", "qty": 5.00000000, "notional": 15000.00}
  ],
  "asset_caps": {
    "max_single_asset_pct": 0.25,
    "max_leverage": 2.0,
    "max_turnover_1d": 0.50
  },
  "turnover_1d": 0.12000000,
  "drawdown": 0.03500000,
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "b8c9d0e1f2a3..."
  },
  "forbidden_values": {
    "equity": "must be > 0",
    "leverage": "must not exceed max_leverage cap"
  }
}
```

### Invariants
- Bounded fractional Kelly: `f <= f_cap` where `f_cap` is **HEURISTIC** with quarterly calibration.
- Leverage cap: `leverage <= max_leverage` (from asset_caps).
- Concentration cap: no single asset exceeds `max_single_asset_pct` of equity.
- Turnover cap: `turnover_1d <= max_turnover_1d`.
- HALTED mode blocks all new risk allocation (zero new positions).
- Positions sorted by symbol for deterministic fingerprinting.
- Forbidden values: negative equity, leverage exceeding cap, NaN/Inf in any numeric field.

### Fingerprint rules
- Material: `canonical_json(sorted_positions + cap_config_hash + risk_mode + seed + schema_version)`.
- Drift definition: identical inputs must yield identical PortfolioState fingerprint.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch35`.
- Gate inputs: PortfolioState contracts + cap-violation fixtures + HALTED-mode fixture + seed config.
- Gate outputs: gate log, contract validation log, cap enforcement log, verdict file.
- PASS semantics: allocation respects all caps, HALTED blocks new risk, evidence complete, replay stable.
- FAIL semantics: any of: cap exceeded without rejection, HALTED mode allows new risk, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: allocation respects leverage/concentration caps and HALTED blocking.
  - Must-fail: unconstrained sizing exceeds cap without rejection.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch35/SPEC_CONTRACTS.md` — PortfolioState field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch35/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch35/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch35/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if leverage/concentration/turnover caps are not defined with enforceable bounds.
- BLOCKED if HALTED-mode blocking is not specified.
- BLOCKED if Kelly fraction cap is not labeled **HEURISTIC** with calibration protocol.
- BLOCKED if deterministic fingerprint rules are incomplete.
- Rollback trigger: revert E35 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note.

## RISK REGISTER
- Unbounded Kelly sizing causes leverage spikes and blowup. Mitigation: bounded fractional Kelly with hard f_cap (Anti-pattern #12).
- Concentration in single asset during low-vol creates tail risk. Mitigation: per-asset concentration cap enforced before allocation.
- HALTED mode bypass allows risk in unsafe state. Mitigation: explicit zero-allocation invariant under HALTED with test fixture.
- Turnover churn erodes returns via fees. Mitigation: turnover_1d cap enforced.
- Cap config drift between environments. Mitigation: cap_config_hash in fingerprint material.
- **HEURISTIC** thresholds stale. Mitigation: quarterly calibration protocol for f_cap and cap values.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] PortfolioState schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload includes positions, caps, and drawdown.
- [ ] Bounded Kelly invariant is explicit with f_cap labeled **HEURISTIC**.
- [ ] Leverage, concentration, and turnover caps are testable.
- [ ] HALTED mode blocks all new risk allocation.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#12 Unbounded Kelly sizing**: leverage spikes from unconstrained fraction. Detection: leverage cap invariant tests.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-22**: Anti-Blowup Shield: Drawdown-Conditional Sizing — exponential position compression near max DD.
- **WOW-23**: Tail Risk Hedging — automatic hedge triggers.
- **D6 MAX**: Bounded fractional Kelly optimizer (post-E35 per decision matrix).

## NOTES
- Rollback plan: revert E35 spec, restore prior READY chain, and publish diagnostic evidence.
- Decision matrix reference: D6 (MVP: capped vol targeting) applies to this epoch.
