# PLAN — EPOCH-18

## Add files
- core/strategy/strategy_orchestrator.mjs
- core/exec/signal_converter.mjs
- core/portfolio/portfolio_allocator.mjs
- core/exec/strategy_aware_executor.mjs
- scripts/verify/strategy_check.mjs

## Modify files
- package.json (verify:strategy, verify:epoch18)
- TASK_TRACKER.md
- README.md, RUNBOOK.md

## Gate plan
1) npm ci
2) verify:strategy (run1/run2)
3) verify:epoch18 (run1)
4) verify:e2 (run1/run2)
5) verify:paper (run1/run2)
6) verify:e2:multi
7) verify:phase2
8) verify:integration
9) verify:core
