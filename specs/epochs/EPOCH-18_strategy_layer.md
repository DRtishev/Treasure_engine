# EPOCH-18 — Strategy Layer

## 1) Reality Snapshot (current repo)
- Multi-strategy and profit tooling already exists: `core/portfolio/multi_strategy.mjs`, `scripts/profit/*`.
- Execution pipeline exists but lacks a formal strategy-orchestrator contract: `core/exec/master_executor.mjs`.
- Risk/safety gates already exist and must remain in path: `core/risk/risk_governor.mjs`, `core/exec/safety_gate_validator.mjs`.

## 2) Goal / Non-goals
### Goal
Introduce a deterministic strategy orchestration layer that converts strategy outputs into validated execution intents.

### Non-goals
- No model training/AI architecture rewrite.
- No changes to exchange adapter semantics.
- No live-mode auto enablement.

## 3) Constraints
- Determinism: seed-controlled strategy selection/ordering.
- Verify paths must remain network-off by default.
- Existing schemas and verify gates must stay backward compatible.

## 4) Design (interfaces, contracts, events)
### Proposed modules
- `StrategyOrchestrator`: aggregates candidate signals with deterministic ranking.
- `SignalConverter`: normalizes strategy output to execution intent contract.
- `PortfolioAllocator`: converts risk budget to per-intent notional caps.

### Contracts
- strategy signal: `{strategy_id, symbol, side, confidence, ts_ms?, features}`
- normalized intent: `{intent_id, symbol, side, qty/notional, reason, strategy_id}`
- allocation output: `{intent_id, allocated_notional, cap_reason}`

### Event requirements
- add `SYS/strategy_selected` and `SYS/allocation_applied` events (schema-compliant).

## 5) Patch Plan
### New files
- `core/strategy/strategy_orchestrator.mjs`
- `core/exec/signal_converter.mjs`
- `core/portfolio/portfolio_allocator.mjs`
- `core/exec/strategy_aware_executor.mjs`
- `scripts/verify/strategy_check.mjs`

### Modified files
- `package.json` (`verify:strategy`, `verify:epoch18`)
- optional wiring in `core/exec/master_executor.mjs`

## 6) New/updated verify gates
- `npm run verify:strategy`
- `npm run verify:epoch18` (strategy + integration assertions)
- Asserts deterministic ordering under same seed, risk-cap compliance, schema-valid events.

## 7) Evidence requirements
- `reports/evidence/EPOCH-18/` with gate logs and anti-flake baseline logs.
- source/evidence checksums and summary with explicit seed list.

## 8) Stop rules
PASS only if deterministic strategy ranking is reproducible and all baseline gates still pass.
FAIL on nondeterministic ordering, uncapped allocation, or schema drift.

## 9) Risk register
1. Hidden nondeterminism in strategy ranking → seed and stable sort required.
2. Over-allocation beyond risk limits → enforce allocator cap test cases.
3. Event schema drift → validate against `truth/event.schema.json`.
4. Coupling strategy to adapter implementation → keep converter boundary strict.
5. Regression in phase2/core gates → run full regression wall before merge.

## 10) Rollback plan
Revert strategy-layer wiring and restore prior execution path; validate with `verify:core`.
