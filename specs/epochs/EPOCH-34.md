# EPOCH-34 — Signal to Intent Pipeline

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines deterministic signal-to-intent transformation with hard reject rules and auditable constraints.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 4: Decision Plane)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#11, #8)
- AI constraints: `docs/EDGE_RESEARCH/AI_MODULE.md` (forbidden: auto-trade from AI outputs)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D5)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E34)

## REALITY SNAPSHOT
- E33 is READY (strategy registry contracts defined). E34 consumes strategy signals and produces constrained intents.
- Depends on: **EPOCH-33** (StrategyManifest contract).
- Consumes: E33 StrategyManifest for strategy identity, E31 FeatureManifest references.
- Produces: `Signal` and `Intent` contracts for E35 allocation and E39 shadow harness.

## GOALS
- Define deterministic signal-to-intent transformation with hard reject rules and auditable constraints.
- Specify `Signal` and `Intent` schemas with all required fields per CONTRACTS_CATALOG.md.
- Define staleness, liquidity, and risk constraint checks applied during transformation.

## NON-GOALS
- Implement signal generation logic or intent execution runtime.
- Define allocation sizing (deferred to E35).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: mapping is a pure function; same Signal + context yields byte-identical Intent.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.
- AI module constraint: AI outputs are decision-support only; auto-trade or direct order placement from AI outputs is forbidden (`docs/EDGE_RESEARCH/AI_MODULE.md`).

## DESIGN / CONTRACTS
### Contracts
- Schemas: `Signal`, `Intent` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### Signal example
```json
{
  "schema_version": "1.0.0",
  "signal_id": "sig-20260115-001",
  "strategy_id": "strat.mean_reversion.btc",
  "symbol": "ETHUSDT",
  "timestamp": "2026-01-15T12:00:00Z",
  "side_hint": "LONG",
  "strength": 0.650000,
  "confidence": 0.720000,
  "reasons": ["z_score_below_threshold", "vol_regime_favorable"],
  "feature_manifest_ref": "snap-20260101",
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "f1e2d3c4b5a6..."
  },
  "forbidden_values": {
    "confidence": "must be in [0, 1]",
    "strength": "must not be NaN/Inf"
  }
}
```

#### Intent example
```json
{
  "schema_version": "1.0.0",
  "intent_id": "int-20260115-001",
  "signal_id": "sig-20260115-001",
  "symbol": "ETHUSDT",
  "timestamp": "2026-01-15T12:00:01Z",
  "side": "BUY",
  "size_units": 0.12000000,
  "limit_price": 3250.50000000,
  "time_in_force": "GTC",
  "max_slippage_bps": 8.0000,
  "risk_tags": ["mean_reversion", "normal_risk_mode"],
  "constraints_applied": ["staleness_check", "liquidity_check", "risk_mode_check"],
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "a6b5c4d3e2f1..."
  },
  "forbidden_values": {
    "size_units": "must be > 0",
    "max_slippage_bps": "must be >= 0"
  }
}
```

### Invariants
- Signal-to-Intent mapping is a deterministic pure function: same inputs produce identical output.
- Reject reasons must be explicit and logged (not silent drops).
- Constraints enforce: staleness (signal age vs. max_staleness threshold), liquidity (size vs. available liquidity), risk mode (HALTED blocks all new intents).
- Stale signals (exceeding freshness threshold) must be rejected, not emitted as executable intents.
- Forbidden values: NaN/Inf in strength/confidence, negative size, negative slippage.

### Fingerprint rules
- Material: `canonical_json(Signal_payload + policy_version + portfolio_context_hash + risk_mode)`.
- Drift definition: identical Signal + context must yield byte-identical Intent payload.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch34`.
- Gate inputs: Signal/Intent contracts + deterministic fixtures + staleness scenario + seed config.
- Gate outputs: gate log, contract validation log, deterministic replay diff, reject log, verdict file.
- PASS semantics: identical signal+context yields byte-identical Intent, stale signals rejected, evidence complete, replay stable.
- FAIL semantics: any of: nondeterministic mapping, stale signal emitted as intent, missing reject reason, fingerprint mismatch, missing evidence.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: identical signal+context yields byte-identical Intent payload.
  - Must-fail: stale signal violating freshness threshold still emitted as executable intent.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/SPEC_CONTRACTS.md` — Signal and Intent field lists, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if Signal-to-Intent mapping determinism cannot be tested.
- BLOCKED if reject reason logging is not specified.
- BLOCKED if staleness threshold is not defined.
- BLOCKED if deterministic fingerprint rules are incomplete.
- Rollback trigger: revert E34 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note.

## RISK REGISTER
- Nondeterministic signal-to-intent transform: same inputs produce different intents. Mitigation: pure function contract with deterministic replay diff (Anti-pattern #11).
- Stale signal execution causes adverse selection. Mitigation: freshness threshold per strategy class; stale signals hard-rejected with logged reason.
- Backtest/live path mismatch in mapping logic. Mitigation: shared contracts and replay parity between sim and live paths (Anti-pattern #8).
- AI auto-trade bypass: AI outputs directly generate orders. Mitigation: Intent is not an Order; order placement requires separate canary governor approval (AI_MODULE.md forbidden behavior).
- Silent constraint violations. Mitigation: all constraint checks must produce explicit pass/reject log entries.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.
- Policy version drift between environments. Mitigation: policy_version included in fingerprint material.

## ACCEPTANCE CRITERIA
- [ ] Signal and Intent schemas define all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payloads are present with complete field sets.
- [ ] Deterministic pure-function mapping invariant is explicit and testable.
- [ ] Staleness threshold and rejection rule are specified.
- [ ] Reject reason logging is mandatory and explicit.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#11 Nondeterministic signal-to-intent transform**: same inputs produce different intents. Detection: deterministic replay diff on intent payload.
- **#8 Backtest/live path mismatch**: different code paths for signal or risk logic. Detection: path parity check on canonical fixtures.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-05**: Latency-Aware Signal Freshness Engine — adaptive staleness with latency percentile tracking.
- **WOW-10**: Smart Execution Router with TWAP/VWAP Fallback — order splitting logic in intent-to-order path.
- **WOW-18**: Multi-Horizon Signal Ensemble with Confidence Decay — aggregation of signals across timeframes.
- **D5 MAX**: Policy DSL engine (post-E34 per decision matrix).

## NOTES
- Rollback plan: revert E34 spec, restore prior READY chain, and publish diagnostic evidence.
- Decision matrix reference: D5 (MVP: pure deterministic mapper) applies to this epoch.
