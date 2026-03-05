# REGRESSION_ND_CORE_SAN01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## SCAN_SCOPE (P0 core zones)
- core/backtest/engine.mjs
- core/court/court_v2.mjs
- core/execution/e122_execution_adapter_v3.mjs
- core/persist/repo_state.mjs
- core/sim/engine_paper.mjs

## FORBIDDEN_PATTERNS
- `Math.random()`
- `Date.now()`
- `new Date()`

## VIOLATIONS
- NONE

## CHECKS
- [PASS] nd_clean_engine_mjs: core/backtest/engine.mjs — no bare ND APIs
- [PASS] nd_clean_court_v2_mjs: core/court/court_v2.mjs — no bare ND APIs
- [PASS] nd_clean_e122_execution_adapter_v3_mjs: core/execution/e122_execution_adapter_v3.mjs — no bare ND APIs
- [PASS] nd_clean_repo_state_mjs: core/persist/repo_state.mjs — no bare ND APIs
- [PASS] nd_clean_engine_paper_mjs: core/sim/engine_paper.mjs — no bare ND APIs
- [PASS] total_nd_violations_zero: 0 bare ND API usages in P0 core zones
