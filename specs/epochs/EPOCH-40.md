# EPOCH-40 — EDGE Freeze + Release Discipline

## Operator Summary
- This epoch is specification-only and implementation-ready.
- It defines certification and clean-clone reproducibility requirements for release freeze governance.
- Offline-first, no-secrets, and no-live-order defaults are mandatory.
- Evidence artifacts are required to claim completion.
- Failure conditions are explicit and blocking.
- Rollback path is required before implementation begins.
- SSOT references: `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`.
- This document is authoritative for epoch implementation scope.

## Where to look next
- Architecture: `docs/SDD_EDGE_EPOCHS_31_40.md` (Module 6: Validation Plane — certification freeze)
- Anti-patterns: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` (#19, #20)
- Decision matrix: `docs/EDGE_RESEARCH/DECISION_MATRIX.md` (D9 MAX)
- Test vectors: `docs/EDGE_RESEARCH/TEST_VECTORS.md` (E40)

## REALITY SNAPSHOT
- E39 is READY (shadow harness and canary governor contracts defined). E40 certifies the complete E31..E40 runway.
- Depends on: **EPOCH-39** (ShadowRunRecord contract and all preceding epoch contracts).
- Consumes: all E31..E39 gate results, LEDGER.json snapshot, all spec and evidence hashes.
- Produces: `CertificationReport` — the final release artifact for the EDGE runway.

## GOALS
- Define certification and clean-clone reproducibility requirements for release freeze governance.
- Specify CertificationReport schema with all required fields per CONTRACTS_CATALOG.md.
- Require all E31..E40 implementation gates green before certification.
- Require clean-clone replay to reproduce certification fingerprint.

## NON-GOALS
- Implement certification runtime automation.
- Enable live trading (remains shadow-only by default).
- Relax safety constraints or default offline policy.

## CONSTRAINTS
- Offline-first default; network tests only via `ENABLE_NETWORK_TESTS=1`.
- Determinism per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`: certification fingerprint must be reproducible from clean clone.
- No live trading by default; shadow/canary remain no-order unless explicitly unlocked in future governance.
- No secrets in repo or evidence artifacts.

## DESIGN / CONTRACTS
### Contract
- Schema: `CertificationReport` (full field list: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`).

#### CertificationReport example
```json
{
  "schema_version": "1.0.0",
  "release_id": "edge-r1-20260201",
  "epoch_gate_results": {
    "31": "PASS",
    "32": "PASS",
    "33": "PASS",
    "34": "PASS",
    "35": "PASS",
    "36": "PASS",
    "37": "PASS",
    "38": "PASS",
    "39": "PASS",
    "40": "PASS"
  },
  "ledger_snapshot_hash": "a1b2c3d4e5f6...",
  "spec_hash": "f6e5d4c3b2a1...",
  "evidence_hash": "1a2b3c4d5e6f...",
  "clean_clone_repro_refs": {
    "clone_commit": "abc123",
    "repro_fingerprint": "d4e5f6a7...",
    "repro_log": "reports/evidence/.../clean_clone_replay.log"
  },
  "approvals": {
    "quant_lead": {"approved": true, "timestamp": "2026-02-01T10:00:00Z"},
    "risk_officer": {"approved": true, "timestamp": "2026-02-01T11:00:00Z"}
  },
  "deterministic_fingerprint": {
    "algo": "sha256",
    "value": "e2f3a4b5c6d7..."
  },
  "forbidden_values": {
    "epoch_gate_results": "all values must be PASS",
    "approvals": "must include required signoffs"
  }
}
```

### Invariants
- Certification requires all E31..E40 implementation gates to report PASS.
- Any single epoch FAIL blocks certification (no partial certification).
- Clean-clone replay must reproduce the certification fingerprint exactly.
- Evidence pack hash manifest must be immutable after certification.
- Approvals must include all required signoffs (defined in governance policy).
- Forbidden values: any epoch gate result not PASS, missing approval signoffs.

### Fingerprint rules
- Material: `canonical_json(epoch_gate_results + ledger_snapshot_hash + spec_hash + evidence_hash + schema_version)`.
- Clean-clone test: fresh `git clone` + `npm ci` + full gate battery must produce identical certification fingerprint.
- Drift definition: any fingerprint mismatch on clean-clone replay is a certification failure.

## PATCH PLAN
- Keep changes in docs/specs/gates only; no runtime trading logic.
- Maintain canonical template heading order.
- Keep dependency and gate mappings aligned with INDEX and LEDGER.

## VERIFY
- `npm run verify:specs` must pass.
- Planned implementation gate: `npm run verify:epoch40`.
- Gate inputs: CertificationReport contracts + all E31..E39 gate results + clean-clone replay environment.
- Gate outputs: gate log, certification report, clean-clone replay log, verdict file.
- PASS semantics: all epoch gates PASS, clean-clone replay reproduces fingerprint, evidence complete, all approvals present.
- FAIL semantics: any of: epoch gate not PASS, clean-clone fingerprint mismatch, missing evidence or approval, hash mismatch.
- Test vectors (from `docs/EDGE_RESEARCH/TEST_VECTORS.md`):
  - Must-pass: clean-clone replay reproduces certification fingerprint.
  - Must-fail: certification produced with missing epoch gate evidence or hash mismatch.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/epoch40/SPEC_CONTRACTS.md` — CertificationReport field list, types, and examples.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch40/GATE_PLAN.md` — gate inputs, outputs, and pass/fail semantics.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch40/FINGERPRINT_POLICY.md` — hash material and drift definition.
- `reports/evidence/<EVIDENCE_EPOCH>/epoch40/VERDICT.md` — PASS or BLOCKED with rationale and evidence links.

## STOP RULES
- BLOCKED if any E31..E39 epoch gate is not PASS.
- BLOCKED if clean-clone reproducibility requirement is not specified.
- BLOCKED if evidence hash manifest is not immutable.
- BLOCKED if approval requirements are not defined.
- BLOCKED if deterministic fingerprint rules are incomplete.
- Rollback trigger: revert E40 READY claim in LEDGER.json, restore prior dependency state, publish diagnostic note identifying which epoch(s) block certification.

## RISK REGISTER
- Evidence theater: PASS claim without actual gate execution or evidence. Mitigation: evidence completeness linter blocks certification without full evidence set (Anti-pattern #19).
- Clean-clone irreproducibility: certification cannot be replayed on fresh clone. Mitigation: clean-clone replay gate with immutable evidence hashes (Anti-pattern #20).
- Partial certification with failing epochs. Mitigation: all-or-nothing gate matrix; single FAIL blocks certification.
- Stale LEDGER snapshot. Mitigation: ledger_snapshot_hash computed at certification time and included in fingerprint.
- Approval process bypassed. Mitigation: required signoff fields in CertificationReport; missing approval is a FAIL.
- Dependency drift between certification and deployment. Mitigation: pinned lockfiles and environment manifests verified during clean-clone replay.
- Evidence omission. Mitigation: required file checklist gate blocks PASS without all evidence files.

## ACCEPTANCE CRITERIA
- [ ] CertificationReport schema defines all required fields per CONTRACTS_CATALOG.md.
- [ ] Minimal example payload includes all epoch gate results, hashes, and approvals.
- [ ] All E31..E40 gates must be PASS for certification.
- [ ] Clean-clone reproducibility requirement is explicit and testable.
- [ ] Evidence hash manifest immutability is specified.
- [ ] Approval requirements are defined.
- [ ] Deterministic fingerprint inputs are explicitly defined per DETERMINISM_POLICY.md.
- [ ] Verify gate defines inputs, outputs, and pass/fail semantics.
- [ ] Offline-first and no-live-default safety invariants are explicit.
- [ ] Rollback/disable path is explicit and safe.

## TRAPS (Anti-Pattern Cross-References)
- **#19 Evidence theater**: PASS claim without logs/manifests/verdict. Detection: evidence completeness linter.
- **#20 Clean-clone irreproducibility**: certification cannot be replayed on fresh clone. Detection: E40 clean-clone replay gate.

## WOW HOOKS (Optional Enhancements — Not MVP)
- **WOW-35**: AI Research Agent Mesh — automated hypothesis factory with deterministic reproduction.
- **D9 MAX**: Full governor automation (E40+ per decision matrix).

## NOTES
- Rollback plan: revert E40 spec, restore prior READY chain, and publish diagnostic note identifying blocking epoch(s).
- This is the terminal epoch of the EDGE runway. Successful certification unlocks post-E40 enhancements from the decision matrix MAX paths.
