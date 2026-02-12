# EPOCH-32 — Microstructure Simulator Spec + SimReport

## REALITY SNAPSHOT
- E31 is the immediate upstream dependency and this epoch remains specification-only.
- Runtime trading implementation is out of scope for this rewrite cycle.

## GOALS
- Deliver implementation-ready contract language for SimReport without ambiguity.
- Lock deterministic/offline-first gate semantics for future `npm run verify:epoch32` implementation.
- Define evidence checklist and rollback paths that prevent false PASS claims.

## NON-GOALS
- Implement production execution code, live adapters, or exchange integrations.
- Depend on internet access for default verification.

## CONSTRAINTS
- Offline-first by default; optional network checks only behind `ENABLE_NETWORK_TESTS=1`.
- Determinism-first per `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`.
- Contract terms and examples must align with `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md` and `docs/EDGE_RESEARCH/GLOSSARY.md`.
- No secrets, no autonomous trading, no hidden dynamic dependencies.

## DESIGN / CONTRACTS
### Dependencies
- Dependency: `EPOCH-31` as declared in `specs/epochs/INDEX.md` and `specs/epochs/LEDGER.json`.
- Primary contract family: `SimReport`.
- Local canonical example:
```json
{"schema_version":"1.0.0","epoch":32,"contract":"SimReport","seed":12345,"fingerprint":{"algo":"sha256","value":"<hex>"}}
```
- Determinism invariant: canonical JSON serialization + hash normalization + boundary rounding.
- Offline invariant: any optional network probe is skipped unless `ENABLE_NETWORK_TESTS=1`.
- Gate semantics:
  - Inputs: epoch spec, contract catalog references, deterministic fixtures, seed.
  - Outputs: gate log, contract validation report, replay diff report, epoch verdict.
  - PASS conditions:
    - Contract fields map to catalog-required fields with no missing invariants.
    - Deterministic replay under identical seed produces identical canonical digests.
    - Stop-rule controls (BLOCKED/ROLLBACK) are machine-checkable in evidence.
    - Required evidence files are present and hash-listed.
    - Offline-default run passes without network calls.
  - FAIL conditions:
    - Ambiguous contract field or unverifiable acceptance wording.
    - Replay drift, hash policy mismatch, or rounding mismatch.
    - Missing evidence artifact or unverifiable verdict chain.
    - Hidden network dependency in default mode.
    - Any bypass path that allows trading behavior in prohibited modes.

## PATCH PLAN
- Keep edits within docs/specs and verification metadata only.
- Preserve required epoch template headings and check-list formatting for `verify:specs`.
- Update index/ledger references only when chain consistency requires it.

## VERIFY
- `npm run verify:specs`
- Planned future gate command: `npm run verify:epoch32`.
- Anti-flake policy: run `npm run verify:specs` twice; both runs must PASS.
- Evidence routing: all outputs under `reports/evidence/<EVIDENCE_EPOCH>/gates/`.

## EVIDENCE REQUIREMENTS
- `reports/evidence/<EVIDENCE_EPOCH>/gates/verify_specs_run1.log`
- `reports/evidence/<EVIDENCE_EPOCH>/gates/verify_specs_run2.log`
- `reports/evidence/<EVIDENCE_EPOCH>/SUMMARY.md`
- `reports/evidence/<EVIDENCE_EPOCH>/RISK_REGISTER.md`
- `reports/evidence/<EVIDENCE_EPOCH>/VERDICT.md`
- `reports/evidence/<EVIDENCE_EPOCH>/DIFF.patch`

## STOP RULES
- BLOCKED if dependency chain (`EPOCH-31` -> `EPOCH-32`) is inconsistent between ledger and index.
- BLOCKED if deterministic rules conflict with `DETERMINISM_POLICY.md`.
- BLOCKED if PASS cannot be proven with required evidence files.
- ROLLBACK trigger: revert epoch spec changes and mark epoch BLOCKED in ledger notes until ambiguity is removed.

## RISK REGISTER
- Contract drift between epoch file and shared catalog. Mitigation: single-source field list in catalog and link checks.
- Evidence theater via incomplete logs. Mitigation: required-file checklist and verdict hash references.
- Determinism regression from ad-hoc serialization. Mitigation: enforce canonical serialization and fixed seed in gate spec.
- Operator misread of stop rules. Mitigation: explicit BLOCKED/ROLLBACK language in gate semantics.

## ACCEPTANCE CRITERIA
- [ ] Purpose, scope, and non-goals are explicit and implementation-ready.
- [ ] Dependency is explicit and matches INDEX plus LEDGER.
- [ ] Contract references shared catalog and includes valid local JSON example.
- [ ] Determinism/offline invariants reference canonical policy and are testable.
- [ ] PASS and FAIL conditions are concrete, checkable, and non-overlapping.
- [ ] Evidence checklist includes required files and stable paths.
- [ ] At least three risks and mitigations are concrete and operational.
- [ ] Stop rules include BLOCKED criteria and an actionable rollback trigger.
- [ ] Typical traps are listed with prevention guidance.
- [ ] WOW hooks include priorities and proof method.

## NOTES
- Typical traps:
  - Treating example JSON as optional guidance instead of mandatory contract shape; avoid by schema linting.
  - Claiming PASS after one run; avoid by mandatory 2-run anti-flake evidence.
  - Hiding nondeterministic fields in fingerprints; avoid by canonical exclusion list.
- WOW hooks:
  - P0: WOW-04 calibrated latency/slippage lanes — prove via epoch gate report and deterministic replay digest.
  - P1: WOW-10 partial-fill realism hooks — prove via contract coverage checklist in evidence summary.
  - P2: WOW-17 cost sensitivity sweep — prove via explicit artifact reference in future epoch gate.
