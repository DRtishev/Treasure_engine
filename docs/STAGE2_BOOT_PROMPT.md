# STAGE2 BOOT PROMPT (TREASURE ENGINE)

## Context
- Complete EPOCH-41 first to baseline implementation reality vs WOW-01..WOW-38 matrix.
- Use `docs/STAGE2_IMPLEMENTATION_MATRIX.md` as implementation truth map.
- Respect offline-first + determinism policies (`docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`).

## Stage2 sequence
1. **EPOCH-42** — Execution Realism Hardening.
2. **EPOCH-43** — Overfit Defense (CPCV/PBO/DSR).
3. **EPOCH-44** — Risk Fortress Evolution.
4. **EPOCH-45** — Deterministic Agent Mesh MVP.

## Non-negotiables
- No implementation claim without file + gate evidence.
- Two-run discipline for critical gates with `CI=true`.
- Evidence pack required per epoch (`reports/evidence/<EPOCH-ID>/`).

## Minimum gate set
- `CI=true npm run verify:specs`
- `CI=true npm run verify:repo`
- `CI=true npm run verify:edge`
- `CI=true npm run verify:truth-layer`
- `CI=true npm run verify:config`
- `CI=true npm run verify:e2:multi`
- `CI=true npm run verify:treasure`
