# EPOCH-34 — Signal → Intent Pipeline

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
- `docs/EDGE_RESEARCH/AI_MODULE.md`
- `docs/EDGE_RESEARCH/ANTI_PATTERNS.md`

## REALITY SNAPSHOT
- EDGE runway specs exist; this epoch defines implementation contract quality bar.

## GOALS
Define deterministic signal-to-intent transformation with hard reject rules and auditable constraints.

## NON-GOALS
- Implement runtime logic or integrations.
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism required: stable ordering, fixed seeds, canonical hashing.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.

## DESIGN / CONTRACTS
### Contracts
- Schemas: `Signal`, `Intent`.
- Example `Signal`:
```json
{"schema_version":"1.0.0","signal_id":"sig-1","symbol":"ETHUSDT","side_hint":"LONG","confidence":0.72}
```
- Example `Intent`:
```json
{"schema_version":"1.0.0","intent_id":"int-1","signal_id":"sig-1","side":"BUY","size_units":0.12,"max_slippage_bps":8}
```
### Invariants
- Mapping is deterministic pure function.
- Reject reasons must be explicit and logged.
- Constraints enforce liquidity/caps/staleness checks.
### Fingerprint rules
- Hash Signal payload + policy version + portfolio/risk context hash.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch34`.
- Gate inputs: epoch contracts + deterministic fixtures + seed config.
- Gate outputs: gate log, contract validation log, deterministic replay diff, verdict file.
- PASS semantics: all invariants hold, evidence complete, replay stable.
- FAIL semantics: leakage/bypass/nondeterminism/missing evidence triggers FAIL.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/SPEC_CONTRACTS.md` (contracts + examples).
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/GATE_PLAN.md` (inputs/outputs/pass-fail semantics).
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/FINGERPRINT_POLICY.md` (hash material and drift definition).
- `reports/evidence/<EVIDENCE_EPOCH>/epoch34/VERDICT.md` (PASS/BLOCKED with references).

## STOP RULES
- BLOCKED if any contract field/invariant is ambiguous or untestable.
- BLOCKED if deterministic fingerprint rules are incomplete.
- BLOCKED if a safety invariant can be bypassed.
- Rollback trigger: revert epoch READY claim and restore previous ledger/index dependency state with diagnostic note.

## RISK REGISTER
- Contract ambiguity leads to inconsistent implementation. Mitigation: explicit examples + invariant tests.
- Deterministic replay drift. Mitigation: stable ordering and canonical serialization checks.
- Missing evidence blocks auditability. Mitigation: evidence completeness checklist gate.
- Safety invariant bypass under edge case. Mitigation: explicit negative fixtures and fail-fast checks.
- HEURISTIC thresholds stale over time. Mitigation: scheduled calibration protocol and guardrails.
- Dependency chain drift across docs. Mitigation: INDEX/LEDGER consistency checks.
- Operator misuse due to unclear language. Mitigation: operator summary + concrete pass/fail semantics.

## ACCEPTANCE CRITERIA
- [ ] Contract schema name and required fields are explicit.
- [ ] Minimal example payload is present and valid JSON.
- [ ] Invariants are testable and include forbidden values.
- [ ] Deterministic fingerprint inputs are explicitly defined.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Evidence file set is complete with purpose per file.
- [ ] Stop rules include hard BLOCKED conditions.
- [ ] Risks include concrete mitigations and owner actionability.
- [ ] Rollback/disable path is explicit and safe.

## NOTES
- Rollback plan: revert EPOCH-34 spec, restore prior READY chain, and publish diagnostic evidence.
