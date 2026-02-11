# PLAN — EPOCH-17

## Files to add
- `core/risk/risk_governor_wrapper.mjs`
- `core/exec/safety_integrated_executor.mjs`
- `truth/live_config.schema.json`
- `scripts/verify/safety_integrated_executor_check.mjs`

## Files to modify
- `package.json` (add `verify:epoch17`)
- `TASK_TRACKER.md` (mark EPOCH-17 items completed after gate success)

## Interfaces/contracts
- SafetyIntegratedExecutor enforces order: safety validate -> risk preCheck -> adapter route.
- RiskGovernorWrapper provides deterministic risk state + pre/post update wrappers.
- Event payloads must remain schema-compatible categories (`SYS`, `RISK`, `EXEC`).

## Gate plan (order)
1. npm ci
2. npm run verify:epoch17
3. npm run verify:e2 (run1)
4. npm run verify:e2 (run2)
5. npm run verify:paper (run1)
6. npm run verify:paper (run2)
7. npm run verify:e2:multi
8. npm run verify:phase2
9. npm run verify:integration
10. npm run verify:core
