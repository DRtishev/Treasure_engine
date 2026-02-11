# PLAN — EPOCH-19

## Files to add
- core/governance/governance_engine.mjs
- core/governance/rules_engine.mjs
- core/governance/approval_workflow.mjs
- core/exec/mode_aware_executor.mjs
- scripts/verify/governance_check.mjs

## Files to modify
- package.json (`verify:governance`, `verify:epoch19`)
- TASK_TRACKER.md
- README.md, RUNBOOK.md

## Gate plan
1. npm ci
2. verify:governance (run1/run2)
3. verify:epoch19
4. verify:e2 run1/run2
5. verify:paper run1/run2
6. verify:e2:multi
7. verify:phase2
8. verify:integration
9. verify:core
