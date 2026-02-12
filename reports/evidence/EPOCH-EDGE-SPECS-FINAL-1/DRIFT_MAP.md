# DRIFT MAP — EPOCH-EDGE-SPECS-FINAL-1

## Scan scope
- SSOT docs: glossary / determinism / contracts.
- EDGE specs E31..E40 + SDD + index/ledger consistency checks.

## Findings and fixes
1. **Terminology drift risk**: canonical request terms (`StrategySpec`, `AllocationPlan`, `RiskDecision`, `RealityGapReport`, `ShadowEvent`, `CanaryPhaseState`) differed from legacy names in existing docs.
   - Fix: established canonical terms in `GLOSSARY.md` with explicit alias mapping to legacy names.
2. **Determinism policy too advisory**: lacked explicit break-glass procedure and strict include/exclude rule language.
   - Fix: rewrote `DETERMINISM_POLICY.md` as normative law with machine-checkable obligations.
3. **Contract catalog coverage gap**: existing catalog missed canonical contract set requested for final polish.
   - Fix: rebuilt `CONTRACTS_CATALOG.md` with canonical contracts, invariants, versioning rule, and JSON micro-examples.
4. **Governance gap for docs-only cycles**: constraints did not explicitly codify docs-only prohibitions and anti-flake x2 requirement.
   - Fix: added section 8 in `specs/CONSTRAINTS.md`.
5. **Post-40 planning artifact absent**: roadmap file missing.
   - Fix: created planning-only `WOW_ROADMAP_POST_40.md` for E41..E45.
6. **SDD traceability drift risk**: SDD used legacy terms without mapping to canonical SSOT.
   - Fix: added SSOT linkage and canonical mapping section in SDD.

## Outstanding
- No blocking contradictions found after sync.
