# TRACEABILITY_MATRIX.md — Finding → Requirement → Gate → Evidence

**Цель:** Каждая проверка имеет цепочку "почему это существует". Нет orphaned gates, нет findings без fixes.

---

## Полная матрица трассировки

### FINDING-B: Courts не wired в sweep/backtest pipeline (P1, ПОДТВЕРЖДЕНО)

| Requirement ID | Sprint | Описание | Code Area | Gate/Regression | Evidence Artifact | DoD Item |
|---|---|---|---|---|---|---|
| REQ-B1 | S0 | strategy_sweep imports runEdgeLabPipeline | `scripts/edge/strategy_sweep.mjs:16` | `regression_court_wiring01_sweep_uses_pipeline` | `gates/manual/regression_court_wiring01.json` | S0-DoD-1 |
| REQ-B2 | S0 | strategy_sweep calls runEdgeLabPipeline per candidate | `scripts/edge/strategy_sweep.mjs:54-103` | `regression_court_wiring01_sweep_uses_pipeline` | `gates/manual/regression_court_wiring01.json` | S0-DoD-2 |
| REQ-B3 | S0 | guard_backtest_pass rejects empty court_verdicts | `scripts/ops/candidate_fsm.mjs:45-52` | `regression_court_wiring02_guard_rejects_empty` | `gates/manual/regression_court_wiring02.json` | S0-DoD-3 |
| REQ-B4 | S0 | guard_backtest_pass rejects missing court_verdicts | `scripts/ops/candidate_fsm.mjs:45` | `regression_court_wiring02_guard_rejects_empty` | `gates/manual/regression_court_wiring02.json` | S0-DoD-4 |

### FINDING-C: Metrics bifurcation (P1, ПОДТВЕРЖДЕНО)

| Requirement ID | Sprint | Описание | Code Area | Gate/Regression | Evidence Artifact | DoD Item |
|---|---|---|---|---|---|---|
| REQ-C1 | S1 | metric_contract.mjs с required keys | `core/metrics/metric_contract.mjs` (CREATE) | `regression_metric_parity03_required_keys` | `gates/manual/regression_metric_parity03.json` | S1-DoD-1 |
| REQ-C2 | S1 | overfit_court imports unified_sharpe (no inline) | `core/edge_lab/courts/overfit_court.mjs:18-48` | `regression_metric_parity01_overfit_uses_unified` | `gates/manual/regression_metric_parity01.json` | S1-DoD-2 |
| REQ-C3 | S1 | No inline Sharpe in core/edge_lab/courts/ | `core/edge_lab/courts/*.mjs` | `regression_sharpe_ssot01_no_inline` | `gates/manual/regression_sharpe_ssot01.json` | S1-DoD-2 |
| REQ-C4 | S1 | canary real HWM drawdown (no proxy) | `core/canary/fitness_suite.mjs:21` | `regression_metric_parity02_canary_real_dd` | `gates/manual/regression_metric_parity02.json` | S1-DoD-3 |
| REQ-C5 | S1 | SimReport required metric fields | `core/edge/contracts.mjs:100-113` | `regression_metric_parity03_required_keys` | `gates/manual/regression_metric_parity03.json` | S1-DoD-5 |

### FINDING-E: engine_paper calling convention (P2, ВЫЯВЛЕНО)

| Requirement ID | Sprint | Описание | Code Area | Gate/Regression | Evidence Artifact | DoD Item |
|---|---|---|---|---|---|---|
| REQ-E1 | S1 | computePenalizedMetrics correct signature | `core/sim/engine_paper.mjs:351` | _inline in Sprint 1 test plan_ | verify:fast PASS | S1-DoD-4 |

### FSM HEALING (Enhancement)

| Requirement ID | Sprint | Описание | Code Area | Gate/Regression | Evidence Artifact | DoD Item |
|---|---|---|---|---|---|---|
| REQ-H1 | S2 | Deadlock detection in runToGoal | `scripts/ops/state_manager.mjs:579+` | `regression_fsm_deadlock01_detection` | `gates/manual/regression_fsm_deadlock01.json` | S2-DoD-1 |
| REQ-H2 | S2 | Doctor confidence score 0-100 | `scripts/ops/doctor_v2.mjs:630+` | `regression_doctor_score01_confidence` | `gates/manual/regression_doctor_score01.json` | S2-DoD-2 |
| REQ-H3 | S2 | Cockpit dynamic ONE_NEXT_ACTION | `scripts/ops/cockpit.mjs:585-588` | `regression_cockpit_dynamic_next01` | `gates/manual/regression_cockpit_dynamic_next01.json` | S2-DoD-3 |
| REQ-H4 | S2 | Doctor history JSONL ledger | `scripts/ops/doctor_history.mjs` (CREATE) | _existence check_ | `EXECUTOR/DOCTOR_HISTORY.jsonl` | S2-DoD-4 |

### PROFIT LANE (Enhancement)

| Requirement ID | Sprint | Описание | Code Area | Gate/Regression | Evidence Artifact | DoD Item |
|---|---|---|---|---|---|---|
| REQ-P1 | S3 | Kill switch matrix spec | `specs/kill_switch_matrix.json` (CREATE) | `regression_kill_switch01_triggers` | `gates/manual/regression_kill_switch01.json` | S3-DoD-1 |
| REQ-P2 | S3 | Kill switch evaluator fires on conditions | `core/risk/kill_switch.mjs` (CREATE) | `regression_kill_switch01_triggers` | `gates/manual/regression_kill_switch01.json` | S3-DoD-2 |
| REQ-P3 | S3 | Fill reconciliation detects drift | `core/recon/reconcile_v1.mjs` (CREATE) | `regression_reconcile01_detects_drift` | `gates/manual/regression_reconcile01.json` | S3-DoD-3 |
| REQ-P4 | S3 | Emergency flatten closes mock positions | `scripts/ops/emergency_flatten.mjs` (CREATE) | `regression_flatten01_closes_all` | `gates/manual/regression_flatten01.json` | S3-DoD-4 |
| REQ-P5 | S3 | Position sizer enforces tiers | `core/risk/position_sizer.mjs` (CREATE) | `regression_kill_switch01_triggers` | _inline_ | S3-DoD-5 |

---

## Сводка по спринтам

| Sprint | Requirements | New Gates | New Files (CREATE) | Modified Files |
|---|---|---|---|---|
| S0 | 4 (REQ-B1..B4) | 2 | 2 gates | 3 (sweep, fsm, verify_fast) + package.json |
| S1 | 5 (REQ-C1..C5) + 1 (REQ-E1) | 4 | 1 module + 4 gates | 4 (overfit, canary, engine_paper, contracts) + verify_fast + package.json |
| S2 | 4 (REQ-H1..H4) | 3 | 1 module + 3 gates | 3 (state_manager, doctor_v2, cockpit) + verify_fast + package.json |
| S3 | 5 (REQ-P1..P5) | 3 | 5 modules + 3 gates | package.json + verify_fast |
| **TOTAL** | **19** | **12** | **20 files** | **~12 modified** |

---

## Orphan check

### Gates без finding
Нет — все 12 новых gates привязаны к конкретным requirements.

### Findings без gates
- **FINDING-D (P2):** Math.random/Date.now — NOT addressed in this roadmap. Tracked в MONITOR.
  Рекомендация: Sprint 4 candidate.

### Requirements без gates
Нет — все 19 requirements имеют хотя бы один gate или test plan verification.

---

## Инвариант-покрытие

| Инвариант | Sprint | Covered by Gate |
|---|---|---|
| INV-S0-1: sweep imports runEdgeLabPipeline | S0 | regression_court_wiring01 |
| INV-S0-2: sweep uses pipeline for candidates | S0 | regression_court_wiring01 |
| INV-S0-3: guard rejects empty verdicts | S0 | regression_court_wiring02 |
| INV-S0-4: verify:fast x2 PASS | S0 | verify:fast (x2 in audit) |
| INV-S0-5: e108 x2 PASS | S0 | e108 (x2 in audit) |
| INV-S1-1: no inline Sharpe in overfit_court | S1 | regression_sharpe_ssot01 + regression_metric_parity01 |
| INV-S1-2: no drawdown_proxy in canary | S1 | regression_metric_parity02 |
| INV-S1-3: correct penalized metrics call | S1 | verify:fast (sim chain) |
| INV-S1-4: metric_contract exports required keys | S1 | regression_metric_parity03 |
| INV-S1-5: verify:fast x2 PASS | S1 | verify:fast |
| INV-S2-1: deadlock detection works | S2 | regression_fsm_deadlock01 |
| INV-S2-2: confidence score 0-100 | S2 | regression_doctor_score01 |
| INV-S2-3: dynamic next_action | S2 | regression_cockpit_dynamic_next01 |
| INV-S2-4: doctor history JSONL | S2 | existence check |
| INV-S2-5: verify:fast x2 PASS | S2 | verify:fast |
| INV-S3-1: kill switch matrix 3+ conditions | S3 | regression_kill_switch01 |
| INV-S3-2: kill switch evaluator fires | S3 | regression_kill_switch01 |
| INV-S3-3: reconciliation detects drift | S3 | regression_reconcile01 |
| INV-S3-4: flatten closes positions | S3 | regression_flatten01 |
| INV-S3-5: position sizer enforces tiers | S3 | regression_kill_switch01 (inline) |
| INV-S3-6: verify:fast x2 PASS | S3 | verify:fast |
