# TRACEABILITY MATRIX V2

> Маппинг: Finding → Requirement → Gate → Evidence → DoD

---

## Sprint 4: ND-EXORCISM

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-ND-01 | S4 | No Math.random in repo_state._generateRunId | `core/persist/repo_state.mjs:256` | `regression_nd_runid01_no_bare_random` | `gates/manual/regression_nd_runid01.json` | S4-DoD-1 |
| REQ-ND-02 | S4 | No Date.now in court_v2 reports | `core/court/court_v2.mjs:36,52` | `regression_nd_court01_no_bare_datenow` | `gates/manual/regression_nd_court01.json` | S4-DoD-2 |
| REQ-ND-03 | S4 | No new Date in court_v2 output | `core/court/court_v2.mjs:248` | `regression_nd_court01_no_bare_datenow` | `gates/manual/regression_nd_court01.json` | S4-DoD-2 |
| REQ-ND-04 | S4 | No Date.now/new Date in e122 adapter | `core/execution/e122_execution_adapter_v3.mjs:34-50` | `regression_nd_exec01_no_bare_clock` | `gates/manual/regression_nd_exec01.json` | S4-DoD-3 |
| REQ-ND-05 | S4 | No new Date in engine_paper output | `core/sim/engine_paper.mjs:376` | `regression_nd_paper01_no_bare_clock` | `gates/manual/regression_nd_paper01.json` | S4-DoD-4 |
| REQ-NET-01 | S4 | All data providers behind NET guard | `core/data/provider_*_live.mjs` | `regression_net_guard01_all_fetchers_gated` | `gates/manual/regression_net_guard01.json` | S4-DoD-5 |
| REQ-PERF-01 | S4 | Performance Law V2: ms_per_gate ≤ 80ms | `verify:fast` chain | `regression_perf_budget01_ms_per_gate` | `gates/manual/regression_perf_budget01.json` | S4-DoD-6 |
| REQ-DRIFT-01 | S4 | Sprint 0 spec fixed (runEdgeLabPipeline) | `specs/roadmap_v1/SPRINT_0_*.md` | `regression_spec_drift01_sprint0_fixed` | `gates/manual/regression_spec_drift01.json` | S4-DoD-7 |

## Sprint 5: PROFIT LANE WIRING

| Requirement | Sprint | Description | Code Location | Gate | Evidence Path | DoD |
|------------|--------|------------|---------------|------|---------------|-----|
| REQ-WIRE-KS-01 | S5 | Kill switch evaluator in safety_loop | `core/live/safety_loop.mjs` | `regression_profit_ks_wired01` | `gates/manual/regression_profit_ks_wired01.json` | S5-DoD-1 |
| REQ-WIRE-KS-02 | S5 | FLATTEN trigger → emergency_flatten | `core/live/safety_loop.mjs` | `regression_profit_ks_flatten01` | `gates/manual/regression_profit_ks_flatten01.json` | S5-DoD-2 |
| REQ-WIRE-PS-01 | S5 | Position sizer enforceTier before order | `core/exec/adapters/*.mjs` | `regression_profit_sizer_wired01` | `gates/manual/regression_profit_sizer_wired01.json` | S5-DoD-3 |
| REQ-WIRE-RC-01 | S5 | Reconcile after fill batch | fill handler | `regression_profit_recon_wired01` | `gates/manual/regression_profit_recon_wired01.json` | S5-DoD-4 |
| REQ-E2E-01 | S5 | E2E: trigger → flatten → positions=0 | test harness | `regression_profit_e2e_ks01` | `gates/manual/regression_profit_e2e_ks01.json` | S5-DoD-5 |
| REQ-E2E-02 | S5 | E2E: tier violation → order rejected | test harness | `regression_profit_e2e_sizer01` | `gates/manual/regression_profit_e2e_sizer01.json` | S5-DoD-6 |

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

### Sprint 5

| Invariant | Sprint | Gate |
|-----------|--------|------|
| INV-S5-1: Kill switch in safety_loop | S5 | regression_profit_ks_wired01 |
| INV-S5-2: FLATTEN → emergency_flatten | S5 | regression_profit_ks_flatten01 |
| INV-S5-3: Sizer before every order | S5 | regression_profit_sizer_wired01 |
| INV-S5-4: Tier violation → reject + log | S5 | regression_profit_e2e_sizer01 |
| INV-S5-5: Reconcile after fill batch | S5 | regression_profit_recon_wired01 |
| INV-S5-6: verify:fast x2 PASS | S5 | standard |
| INV-S5-7: e108 x2 PASS | S5 | standard |

---

## Cross-Reference: V1 → V2

| V1 Finding | V1 Status | V2 Continuation |
|-----------|-----------|-----------------|
| FINDING-B (Courts orphaned) | CLOSED ✓ | — |
| FINDING-C (Metrics bifurcation) | CLOSED ✓ | — |
| FINDING-E (engine_paper calling) | CLOSED ✓ | — |
| FINDING-D (ND surface) | MONITOR | Sprint 4 (ND-EXORCISM) |
| Profit Lane mock-only | PARTIAL | Sprint 5 (WIRING) |
| Performance budget | POLICY CONFLICT | Sprint 4 (PERF LAW V2) |
| Spec drift | DOCUMENTATION | Sprint 4 (DRIFT-01 fix) |
| Doctor liveness | NEW (POSTV1) | Sprint 6 (DOCTOR_LIVENESS_FIX) |
