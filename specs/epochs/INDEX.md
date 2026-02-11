# EPOCH SPECS INDEX (17 → 21)

## Epochs
1. **EPOCH-17 — Safety Integrated Executor**
   - Spec: `specs/epochs/EPOCH-17_safety_integrated_executor.md`
   - Intent: enforce pre-trade safety + risk checks in execution bridge.
   - Primary gates: `verify:epoch17`, `verify:e2`, `verify:paper`, `verify:e2:multi`, `verify:core`.

2. **EPOCH-18 — Strategy Layer**
   - Spec: `specs/epochs/EPOCH-18_strategy_layer.md`
   - Intent: deterministic strategy orchestration and intent conversion.
   - Primary gates: `verify:strategy`, `verify:epoch18`, baseline regression wall.

3. **EPOCH-19 — Governance + Mode FSM**
   - Spec: `specs/epochs/EPOCH-19_governance_mode_fsm.md`
   - Intent: enforce mode transitions and governance approvals.
   - Primary gates: `verify:governance`, `verify:epoch19`, baseline regression wall.

4. **EPOCH-20 — Monitoring + Performance**
   - Spec: `specs/epochs/EPOCH-20_monitoring_perf.md`
   - Intent: deterministic monitoring/perf contract and schema validation.
   - Primary gates: `verify:monitoring`, `verify:epoch20`, baseline regression wall.

5. **EPOCH-21 — Deployment + Release Governor**
   - Spec: `specs/epochs/EPOCH-21_deployment_release.md`
   - Intent: SAFE/BLOCKED release discipline with evidence integrity checks.
   - Primary gates: `verify:release-governor`, `verify:epoch21`, baseline regression wall.

## Dependency chain
- EPOCH-17 is prerequisite for EPOCH-18 execution coupling.
- EPOCH-18 feeds strategy outputs that are governed by EPOCH-19.
- EPOCH-19 mode/governance events feed EPOCH-20 monitoring contracts.
- EPOCH-21 depends on all prior epochs for release readiness assertions.

## Ready-to-implement order
EPOCH-17 → EPOCH-18 → EPOCH-19 → EPOCH-20 → EPOCH-21.
