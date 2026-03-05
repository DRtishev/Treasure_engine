# TRACEABILITY MATRIX V2

> Маппинг: Finding → Requirement → Gate → Evidence → DoD

---

## Sprint 4: ND-EXORCISM

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-ND-01 | S4 | HYBRID RUN_ID: no Math.random in _generateRunId | `core/persist/repo_state.mjs:256` | `regression_nd_core_san01` | `gates/manual/regression_nd_core_san01.json` | S4-DoD-1 |
| REQ-ND-02 | S4 | No Date.now in court_v2 reports | `core/court/court_v2.mjs:36,52` | `regression_nd_court01_no_bare_datenow` | `gates/manual/regression_nd_court01.json` | S4-DoD-2 |
| REQ-ND-03 | S4 | No new Date in court_v2 output | `core/court/court_v2.mjs:248` | `regression_nd_court01_no_bare_datenow` | `gates/manual/regression_nd_court01.json` | S4-DoD-2 |
| REQ-ND-04 | S4 | No Date.now/new Date in e122 adapter | `core/execution/e122_execution_adapter_v3.mjs:34-50` | `regression_nd_exec01_no_bare_clock` | `gates/manual/regression_nd_exec01.json` | S4-DoD-3 |
| REQ-ND-05 | S4 | No new Date in engine_paper output | `core/sim/engine_paper.mjs:376` | `regression_nd_paper01_no_bare_clock` | `gates/manual/regression_nd_paper01.json` | S4-DoD-4 |
| REQ-NET-01 | S4 | All data providers behind NET guard | `core/data/provider_*_live.mjs` | `regression_net_guard01_all_fetchers_gated` | `gates/manual/regression_net_guard01.json` | S4-DoD-5 |
| REQ-PERF-01 | S4 | Performance Law V2: ms_per_gate ≤ 80ms | `verify:fast` chain | `regression_perf_budget01_ms_per_gate` | `gates/manual/regression_perf_budget01.json` | S4-DoD-6 |
| REQ-DRIFT-01 | S4 | Sprint 0 spec fixed (runEdgeLabPipeline) | `specs/roadmap_v1/SPRINT_0_*.md` | `regression_spec_drift01_sprint0_fixed` | `gates/manual/regression_spec_drift01.json` | S4-DoD-7 |

## Sprint 5: PROFIT LANE WIRING (foundation)

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-WIRE-FOUND-01 | S5 | Module existence: safety_loop, position_sizer, kill_switch, recon | `core/live/`, `core/risk/`, `core/recon/` | `regression_profit_wiring01` | `gates/manual/regression_profit_wiring01.json` | S5-DoD-1 |
| REQ-WIRE-FOUND-02 | S5 | Profit foundation freeze (SSOT + autogen) | `core/live/`, `core/risk/`, `core/exec/` | `regression_profit_foundation_freeze_ssot` | `gates/manual/regression_profit_foundation_freeze_ssot.json` | S5-DoD-2 |

## Sprint 5b: PROFIT LANE WIRING (real integration)

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-WIRE-KS-01 | S5b | Kill switch gate in MasterExecutor (Phase 1b) | `core/exec/master_executor.mjs` | `regression_profit_e2e_ks01` | `gates/manual/regression_profit_e2e_ks01.json` | S5b-DoD-1 |
| REQ-WIRE-PS-01 | S5b | Position sizer gate in MasterExecutor (Phase 1c) | `core/exec/master_executor.mjs` | `regression_profit_e2e_sizer01` | `gates/manual/regression_profit_e2e_sizer01.json` | S5b-DoD-2 |
| REQ-WIRE-RC-01 | S5b | Reconcile after fill in MasterExecutor (Phase 4) | `core/exec/master_executor.mjs` | `dryrun_live_e2e_v2` | `gates/manual/dryrun_live_e2e_v2.json` | S5b-DoD-3 |
| REQ-E2E-01 | S5b | E2E: FLATTEN → orders blocked → resume | `scripts/verify/regression_profit_e2e_ks01.mjs` | `regression_profit_e2e_ks01` | `gates/manual/regression_profit_e2e_ks01.json` | S5b-DoD-4 |
| REQ-E2E-02 | S5b | E2E: tier violation → order rejected | `scripts/verify/regression_profit_e2e_sizer01.mjs` | `regression_profit_e2e_sizer01` | `gates/manual/regression_profit_e2e_sizer01.json` | S5b-DoD-5 |
| REQ-E2E-03 | S5b | E2E: full offline path (dryrun_live_e2e_v2) | `scripts/verify/dryrun_live_e2e_v2.mjs` | `dryrun_live_e2e_v2` | `gates/manual/dryrun_live_e2e_v2.json` | S5b-DoD-6 |

## Sprint 5c: SAFETYLOOP FRESHNESS

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-FRESH-01 | S5c | SafetyLoop auto-tick before order gating | `core/exec/master_executor.mjs:156` | `regression_profit_e2e_ks02_autotick` | `gates/manual/regression_profit_e2e_ks02_autotick.json` | S5c-DoD-1 |
| REQ-FRESH-02 | S5c | Position sizer enforcement with tier downgrade | `core/exec/master_executor.mjs:173` | `regression_profit_e2e_sizer02_enforced` | `gates/manual/regression_profit_e2e_sizer02_enforced.json` | S5c-DoD-2 |
| REQ-FRESH-03 | S5c | No stale state — evaluate() called, not just getState() | `core/exec/master_executor.mjs:156` | `regression_profit_e2e_ks02_autotick` | `EPOCH-V2-S5C-AUDIT/WIRING_GAP_PROOF.md` | S5c-DoD-3 |

## Sprint 6: DOCTOR LIVENESS FIX

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-DOC-01 | S6 | Fix recursive doctor/life nesting (depth guard) | `scripts/ops/life.mjs:63`, `scripts/ops/doctor_v2.mjs:128` | `ops:doctor` | `EPOCH-V2-S6-AUDIT/AUDIT_SPRINT_6_DOCTOR_LIVENESS.md` | S6-DoD-1 |
| REQ-DOC-02 | S6 | Fix EVT_SCHEMA_ERROR budget_ms → timeout_budget | `scripts/ops/state_manager.mjs:460` | `ops:doctor` | `EPOCH-V2-S6-AUDIT/AUDIT_SPRINT_6_DOCTOR_LIVENESS.md` | S6-DoD-2 |
| REQ-DOC-03 | S6 | Add METAAGENT to VALID_COMPONENTS | `scripts/ops/event_schema_v1.mjs` | `ops:doctor` | `EPOCH-V2-S6-AUDIT/AUDIT_SPRINT_6_DOCTOR_LIVENESS.md` | S6-DoD-3 |
| REQ-DOC-04 | S6 | Fix x2 determinism — normalize stateful fields | `scripts/ops/doctor_v2.mjs:132` | `ops:doctor` | `EPOCH-V2-S6-AUDIT/AUDIT_SPRINT_6_DOCTOR_LIVENESS.md` | S6-DoD-4 |
| REQ-DOC-05 | S6 | Doctor score 70 → 100/100 HEALTHY | `scripts/ops/doctor_v2.mjs` | `ops:doctor` | `EPOCH-V2-S6-AUDIT/AUDIT_SPRINT_6_DOCTOR_LIVENESS.md` | S6-DoD-5 |

---

## Invariant → Gate Mapping

### Sprint 4

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S4-1: No Math.random in core/ (except sys/rng.mjs) | S4 | regression_nd_san_extended01 |
| INV-S4-2: No bare Date.now in core/ (except sys/clock.mjs) | S4 | regression_nd_san_extended01 |
| INV-S4-3: No bare new Date in core/ (except sys/clock.mjs) | S4 | regression_nd_san_extended01 |
| INV-S4-4: All fetch behind enforceNetGuard | S4 | regression_net_guard01 |
| INV-S4-5: Sprint 0 spec corrected | S4 | regression_spec_drift01 |
| INV-S4-6: ms_per_gate ≤ 80ms | S4 | regression_perf_budget01 |
| INV-S4-7: verify:fast x2 PASS | S4 | standard |
| INV-S4-8: e108 x2 PASS | S4 | standard |

### Sprint 5 (foundation)

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S5-1: Modules exist (safety_loop, position_sizer, kill_switch, recon) | S5 | regression_profit_wiring01 |
| INV-S5-2: Foundation freeze SSOT hashes match | S5 | regression_profit_foundation_freeze_ssot |
| INV-S5-3: verify:fast x2 PASS | S5 | standard |
| INV-S5-4: e108 x2 PASS | S5 | standard |

### Sprint 5b (real integration)

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S5b-1: Kill switch gate in MasterExecutor blocks when paused | S5b | regression_profit_e2e_ks01 |
| INV-S5b-2: Position sizer gate rejects oversized orders | S5b | regression_profit_e2e_sizer01 |
| INV-S5b-3: Full offline path: adapter → executor → safety → sizer → recon | S5b | dryrun_live_e2e_v2 |
| INV-S5b-4: verify:fast x2 PASS | S5b | standard |
| INV-S5b-5: e108 x2 PASS | S5b | standard |
| INV-S5b-6: verify:deep PASS | S5b | verify:deep chain |

### Sprint 5c (freshness)

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S5c-1: SafetyLoop auto-tick in MasterExecutor (no stale state) | S5c | regression_profit_e2e_ks02_autotick |
| INV-S5c-2: Position sizer enforced with tier downgrade (REDUCE) | S5c | regression_profit_e2e_sizer02_enforced |
| INV-S5c-3: verify:fast x2 PASS | S5c | standard |
| INV-S5c-4: verify:deep PASS (5 gates) | S5c | verify:deep chain |

### Sprint 6

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S6-1: ops:doctor HEALTHY (100/100) | S6 | ops:doctor |
| INV-S6-2: No recursive doctor/life nesting | S6 | ops:doctor liveness_alive |
| INV-S6-3: Doctor x2 deterministic | S6 | ops:doctor liveness_deterministic |
| INV-S6-4: verify:fast x2 PASS | S6 | standard |

## Sprint 7: PROFIT REALISM LAYER

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-COST-01 | S7 | SSOT cost_model with computeTotalCost | `core/cost/cost_model.mjs` | `RG_REALISM01_COST_CONTRACT` | `gates/manual/regression_realism01_cost_contract.json` | S7-DoD-1 |
| REQ-COST-02 | S7 | fees_model maker/taker separation | `core/cost/fees_model.mjs` | `RG_REALISM01_COST_CONTRACT` | `gates/manual/regression_realism01_cost_contract.json` | S7-DoD-2 |
| REQ-COST-03 | S7 | Deterministic slippage model | `core/cost/slippage_model.mjs` | `RG_REALISM01_COST_CONTRACT` | `gates/manual/regression_realism01_cost_contract.json` | S7-DoD-3 |
| REQ-COST-04 | S7 | Funding bounds model (fail-closed) | `core/cost/funding_model.mjs` | `RG_REALISM01_COST_CONTRACT` | `gates/manual/regression_realism01_cost_contract.json` | S7-DoD-4 |
| REQ-PARITY-01 | S7 | No inline cost bypass in backtest/paper/live | `core/backtest/`, `core/paper/`, `core/live/` | `RG_REALISM02_NO_PROXY_METRICS` | `gates/manual/regression_realism02_no_proxy_metrics.json` | S7-DoD-6 |
| REQ-PARITY-02 | S7 | Parity: identical costs for identical input | `core/cost/cost_model.mjs` | `RG_REALISM03_PARITY_E2E` | `gates/manual/regression_realism03_parity_e2e.json` | S7-DoD-7 |
| REQ-FILL-01 | S7 | Partial fills: fill_ratio < 1.0 for large orders | `core/cost/cost_model.mjs` | `RG_REALISM04_PARTIAL_FILL_E2E` | `gates/manual/regression_realism04_partial_fill_e2e.json` | S7-DoD-8 |
| REQ-FUND-01 | S7 | Funding bounds: cost > 0 when holding | `core/cost/funding_model.mjs` | `RG_REALISM05_FUNDING_BOUNDS` | `gates/manual/regression_realism05_funding_bounds.json` | S7-DoD-9 |

### Sprint 7 Invariants

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S7-1: computeTotalCost returns all required fields | S7 | RG_REALISM01 |
| INV-S7-2: No inline cost calculation bypassing cost_model | S7 | RG_REALISM02 |
| INV-S7-3: Parity across backtest/paper for identical input | S7 | RG_REALISM03 |
| INV-S7-4: Partial fill ratio < 1.0 for large orders | S7 | RG_REALISM04 |
| INV-S7-5: Funding > 0 for holding positions | S7 | RG_REALISM05 |
| INV-S7-6: verify:fast x2 PASS | S7 | standard |
| INV-S7-7: e108 x2 PASS | S7 | standard |
| INV-S7-8: verify:deep PASS | S7 | standard |
| INV-S7-9: Frozen params contract hash valid | S7 | contract |

## Sprint 8: PROMOTION LADDER

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-PROMO-01 | S8 | evaluatePromotion with criteria schema | `core/promotion/promotion_ladder.mjs` | `RG_PROMO01_CONTRACT_VALID` | `gates/manual/regression_promo01_contract_valid.json` | S8-DoD-1 |
| REQ-PROMO-02 | S8 | Promotion criteria met -> PROMOTE_ELIGIBLE | `core/promotion/promotion_ladder.mjs` | `RG_PROMO_E2E01_PAPER_TO_MICROLIVE` | `gates/manual/regression_promo_e2e01.json` | S8-DoD-5 |
| REQ-PROMO-03 | S8 | Missing metrics -> INSUFFICIENT_DATA | `core/promotion/promotion_ladder.mjs` | `RG_PROMO_E2E02_FAILCLOSED_UNCERTAINTY` | `gates/manual/regression_promo_e2e02.json` | S8-DoD-6 |
| REQ-CANARY-01 | S8 | evaluateCanary with limits schema | `core/promotion/canary_policy.mjs` | `RG_CANARY01_POLICY_CONTRACT` | `gates/manual/regression_canary01_policy_contract.json` | S8-DoD-2 |
| REQ-CANARY-02 | S8 | Daily loss exceeded -> FLATTEN | `core/promotion/canary_policy.mjs` | `RG_CANARY_E2E01_DAILY_LOSS_TRIGGER` | `gates/manual/regression_canary_e2e01.json` | S8-DoD-7 |
| REQ-CANARY-03 | S8 | Order rate limit -> PAUSE | `core/promotion/canary_policy.mjs` | `RG_CANARY_E2E02_ORDER_RATE_LIMIT` | `gates/manual/regression_canary_e2e02.json` | S8-DoD-8 |

### Sprint 8 Invariants

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S8-1: evaluatePromotion returns valid PromotionResult | S8 | RG_PROMO01 |
| INV-S8-2: evaluateCanary returns valid CanaryResult | S8 | RG_CANARY01 |
| INV-S8-3: Fail-closed on missing data | S8 | RG_PROMO_E2E02 |
| INV-S8-4: Daily loss triggers FLATTEN | S8 | RG_CANARY_E2E01 |
| INV-S8-5: Order rate limit enforced | S8 | RG_CANARY_E2E02 |
| INV-S8-6: verify:fast x2 PASS | S8 | standard |
| INV-S8-7: e108 x2 PASS | S8 | standard |
| INV-S8-8: verify:deep PASS | S8 | standard |

## Sprint 9: REAL PIPELINE INTEGRATION

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-WIRE-C1 | S9 | Paper runner uses computeTotalCost() SSOT | `core/paper/paper_live_runner.mjs` | `RG_REALISM_WIRING_FAST01`, `RG_REALISM06_PAPER_USES_COSTMODEL_E2E` | `gates/manual/regression_realism_wiring_fast01.json` | S9-DoD-1 |
| REQ-WIRE-C2 | S9 | Paper real-feed uses computeTotalCost() SSOT | `core/paper/e111_paper_live_real_feed_runner.mjs` | `RG_REALISM_WIRING_FAST01`, `RG_REALISM07_DRYRUN_USES_COSTMODEL_E2E` | `gates/manual/regression_realism07_dryrun_uses_costmodel_e2e.json` | S9-DoD-2 |
| REQ-WIRE-C3 | S9 | Paper harness uses computeTotalCost() SSOT | `core/paper/paper_trading_harness.mjs` | `RG_REALISM_WIRING_FAST01` | `gates/manual/regression_realism_wiring_fast01.json` | S9-DoD-3 |
| REQ-WIRE-P1 | S9 | evaluatePromotion() called in paper pipeline | `core/paper/paper_live_runner.mjs` | `RG_PROMO_CANARY_WIRING_FAST01`, `RG_PROMO03_INTEGRATION_E2E` | `gates/manual/regression_promo03_integration_e2e.json` | S9-DoD-4 |
| REQ-WIRE-P2 | S9 | evaluateCanary() called in paper loop | `core/paper/paper_live_runner.mjs` | `RG_PROMO_CANARY_WIRING_FAST01`, `RG_CANARY03_INTEGRATION_E2E` | `gates/manual/regression_canary03_integration_e2e.json` | S9-DoD-5 |
| REQ-WIRE-P3 | S9 | Canary PAUSE blocks orders | `core/paper/paper_live_runner.mjs` | `RG_CANARY03_INTEGRATION_E2E` | `gates/manual/regression_canary03_integration_e2e.json` | S9-DoD-6 |

### Sprint 9 Invariants

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S9-1: Paper modules use computeTotalCost (no legacy feeBps/slipBps) | S9 | RG_REALISM_WIRING_FAST01 |
| INV-S9-2: evaluatePromotion + evaluateCanary imported in paper_live_runner | S9 | RG_PROMO_CANARY_WIRING_FAST01 |
| INV-S9-3: Paper loop generates promotion receipt | S9 | RG_PROMO03_INTEGRATION_E2E |
| INV-S9-4: Canary breach blocks orders in paper loop | S9 | RG_CANARY03_INTEGRATION_E2E |
| INV-S9-5: verify:fast x2 PASS | S9 | standard |
| INV-S9-6: e108 x2 PASS | S9 | standard |
| INV-S9-7: verify:deep PASS | S9 | standard |

---

## Cross-Reference: V1 → V2

| V1 Finding | V1 Status | V2 Continuation |
|-----------|-----------|-----------------|
| FINDING-B (Courts orphaned) | CLOSED ✓ | — |
| FINDING-C (Metrics bifurcation) | CLOSED ✓ | — |
| FINDING-E (engine_paper calling) | CLOSED ✓ | — |
| FINDING-D (ND surface) | CLOSED ✓ | Sprint 4 (ND-EXORCISM) |
| Profit Lane mock-only | CLOSED ✓ | Sprint 5 (foundation) + Sprint 5b (real wiring into MasterExecutor) |
| Performance budget | CLOSED ✓ | Sprint 4 (PERF LAW V2) |
| Spec drift | CLOSED ✓ | Sprint 4 (DRIFT-01 fix) + Sprint 5b (doc drift update) |
| Doctor liveness | CLOSED ✓ | Sprint 6 (DOCTOR_LIVENESS_FIX) — 70→100/100 |
