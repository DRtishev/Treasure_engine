# DRIFT MAP — EDGE Specs E31..E40

## Date: 2026-02-12
## Scope: Pre-rewrite analysis of E31..E40 specs vs. EDGE research suite

## Issues Found

### 1. Boilerplate Homogeneity (E32..E40)
- **Files**: `specs/epochs/EPOCH-32.md` through `EPOCH-40.md`
- **Heading**: All sections
- **Issue**: E32-E40 share near-identical boilerplate for Operator Summary, REALITY SNAPSHOT, RISK REGISTER, ACCEPTANCE CRITERIA. Only GOALS, DESIGN/CONTRACTS, and contract examples differ minimally.
- **Fix**: Rewrite each epoch with domain-specific content that reflects the SDD module boundaries, anti-pattern matrix, and research decisions.

### 2. Generic REALITY SNAPSHOT
- **Files**: `specs/epochs/EPOCH-32.md` through `EPOCH-40.md`
- **Heading**: `## REALITY SNAPSHOT`
- **Issue**: All say "EDGE runway specs exist; this epoch defines implementation contract quality bar." instead of referencing predecessor epoch and chaining from its outputs.
- **Fix**: Each spec must state its predecessor's status and what artifacts it consumes.

### 3. Missing Explicit Dependency Inside Specs
- **Files**: All E31..E40
- **Heading**: Various
- **Issue**: Dependencies only exist in INDEX.md and LEDGER.json. Specs themselves don't declare `depends_on` explicitly.
- **Fix**: Add explicit dependency reference in each spec's metadata or REALITY SNAPSHOT.

### 4. Identical Risk Registers
- **Files**: `specs/epochs/EPOCH-32.md` through `EPOCH-40.md`
- **Heading**: `## RISK REGISTER`
- **Issue**: All 9 specs have the same 7 generic risk bullets. No epoch-specific risks.
- **Fix**: Rewrite each with 3+ epoch-specific risks drawn from ANTI_PATTERNS.md and domain context.

### 5. Missing SSOT Foundation Documents
- **Files**: Not present
- **Issue**: No standalone GLOSSARY.md, DETERMINISM_POLICY.md, or CONTRACTS_CATALOG.md. The SDD has a glossary and fingerprint rules inline, but specs don't reference a central SSOT.
- **Fix**: Create `docs/EDGE_RESEARCH/GLOSSARY.md`, `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`, `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md` extracted from SDD as canonical references.

### 6. Contract JSON Examples Missing Required Fields
- **Files**: E32..E40
- **Heading**: `## DESIGN / CONTRACTS`
- **Issue**: JSON examples are minimal stubs missing many SDD-required fields (e.g., `forbidden_values`, full `deterministic_fingerprint` structure, etc.).
- **Fix**: Expand each JSON example to include all required fields per SDD Contract Catalog.

### 7. No Anti-Pattern Cross-References
- **Files**: All E31..E40
- **Issue**: ANTI_PATTERNS.md defines 20 items with detection/mitigation per epoch. None of the specs reference them.
- **Fix**: Add "Traps" section to each spec linking relevant anti-patterns by number.

### 8. No WOW Hooks Section
- **Files**: All E31..E40
- **Issue**: EDGE_WOW_PROPOSALS.md maps WOW items to epochs. Specs don't reference them.
- **Fix**: Add "WOW HOOKS" section to each spec listing optional enhancements separated from MVP.

### 9. No AI Module Constraint Cross-References
- **Files**: E37, E38, E39 (and partially E31, E34)
- **Issue**: AI_MODULE.md defines forbidden behaviors and deterministic contract requirements. Specs that touch AI paths don't reference these constraints.
- **Fix**: Add explicit AI module invariants where relevant.

### 10. Test Vector Alignment
- **Files**: All E31..E40
- **Issue**: TEST_VECTORS.md defines must-pass and must-fail for each epoch. Specs don't reference these.
- **Fix**: Incorporate test vector descriptions into VERIFY section of each spec.

### 11. LEDGER evidence_id Stale
- **File**: `specs/epochs/LEDGER.json`
- **Issue**: All E31..E40 reference `evidence_id: "EPOCH-EDGE-POLISH-CODEX-1"` which is a previous experiment. Should be updated to current experiment ID.
- **Fix**: Update to `EPOCH-EDGE-SPECS-CLAUDE-EXPERIMENT-1` for this cycle.

### 12. EPOCH_DEPENDENCY_GRAPH.md Only Covers E17..E21
- **File**: `specs/epochs/EPOCH_DEPENDENCY_GRAPH.md`
- **Issue**: Graph stops at E21, doesn't include E31..E40.
- **Fix**: Out of scope for this cycle (not in E31..E40 spec files), but noted.
