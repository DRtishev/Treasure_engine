# RISK REGISTER — EDGE SPECS CLAUDE EXPERIMENT 1

## Remaining Risks

### R1: No verify:epochNN scripts exist yet for E31..E40
- **Impact**: Spec VERIFY sections reference `npm run verify:epochNN` that do not exist.
- **Status**: Acceptable — this is a SPECS cycle; implementation gates are out of scope.
- **Mitigation**: Each spec clearly marks gate as "spec-defined, implementation pending".

### R2: HEURISTIC thresholds lack concrete initial values
- **Impact**: Gap score thresholds, Kelly fraction caps, freshness thresholds are named but not numerically pinned.
- **Status**: Acceptable — initial values depend on data calibration during implementation.
- **Mitigation**: All HEURISTIC values labeled with quarterly calibration protocol requirement.

### R3: SSOT docs are new and have no prior review
- **Impact**: GLOSSARY, DETERMINISM_POLICY, CONTRACTS_CATALOG are created fresh; may contain inaccuracies.
- **Status**: Acceptable — derived directly from SDD and research docs; no external sources used.
- **Mitigation**: verify:specs passes; manual review recommended before E31 implementation.

### R4: WOW hook IDs reference docs that may evolve
- **Impact**: WOW-01..WOW-35 IDs from EDGE_WOW_PROPOSALS.md may change.
- **Status**: Low risk — WOW proposals are stable and versioned.
- **Mitigation**: Epoch specs reference WOW by ID and title; changes require spec update.
