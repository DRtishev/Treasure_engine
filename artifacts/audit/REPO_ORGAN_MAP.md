# REPO_ORGAN_MAP.md — Карта органов Treasure Engine

## O1: Policy Kernel & Modes (CERT/RESEARCH/ACQUIRE)

**SSOT:** AGENTS.md (14 правил R1-R14, 5 режимов)
**Файлы:** specs/policy_kernel.json, specs/reason_code_taxonomy.json
**Режимы:** CERT (offline), CLOSE, AUDIT, RESEARCH, ACCEL
**Гейты:** verify:fast (38 regression gates), epoch:victory:seal

## O2: SAN / Zone-Aware Scanners

**SSOT:** regression_san01_global_forbidden_apis.mjs
**Файлы:** scripts/verify/regression_san01_*.mjs
**Функция:** Сканирование запрещённых API (Math.random, raw Date.now, eval, etc.)
**Риски ND:** 9 файлов с Math.random(), 40+ с Date.now() (см. детали в PAIN_POINTS)

## O3: Verify Chain / Courts

**SSOT:** verify:fast → 38 regression gates sequential chain
**Файлы:** scripts/verify/ (~340 файлов)
**Courts:** core/edge_lab/courts/ (7 типов: dataset, execution, exec_sensitivity, overfit, red_team, risk, sre)
**Pipeline:** core/edge_lab/pipeline.mjs (оркестратор 7 courts)
**ПРОБЛЕМА:** Courts не wired в sweep (см. FINDING-B)

## O4: Evidence / Canon / Fingerprints

**SSOT:** FORMAT_POLICY.md (md-only at root, JSON under gates/**)
**Файлы:** core/truth/canonicalize.mjs, core/evidence/evidence_write_mode.mjs
**Утилиты:** scripts/lib/write_json_deterministic.mjs
**Стандарты:** schema_version обязателен, sorted keys, no timestamps

## O5: Doctor OS / Health Button

**SSOT:** scripts/ops/doctor.mjs (v1), scripts/ops/doctor_v2.mjs (v2)
**Цикл:** baseline:restore → verify:fast x2 → byte-compare → scoreboard
**Рецепты:** reports/evidence/EXECUTOR/ (REPO_BYTE_AUDIT, NODE_TOOLCHAIN_ENSURE)

## O6: Cockpit / Operator HUD

**SSOT:** scripts/ops/cockpit.mjs
**Выходы:** HUD.md + HUD.json (под EPOCH-COCKPIT-*)
**Источники:** TimeMachine (EventBus), Autopilot, fast_gate status, readiness lanes
**Детерминизм:** tick-based ordering only (no wall-clock)

## O7: Nervous System / FSM Brain

**SSOT:** specs/fsm_kernel.json, specs/candidate_fsm_kernel.json
**Файлы:**
- scripts/ops/state_manager.mjs (FSM executor)
- scripts/ops/fsm_guards.mjs (guards — pure read-only)
- scripts/ops/fsm_compensations.mjs (rollback handlers)
- scripts/ops/replay_engine.mjs (FSM replay from event log)
- scripts/ops/eventbus_v1.mjs (append-only event stream)
- scripts/ops/proprioception.mjs (self-awareness scanner)
**Состояния FSM:** BOOT → LIFE → DEGRADED → HEALING → ...
**Кандидат FSM:** DRAFT → BACKTESTED → PAPER_PROVEN → CANARY_DEPLOYED → GRADUATED

## O8: Backtest Organ

**SSOT:** core/backtest/engine.mjs
**Гейты:** e108_backtest_determinism_x2_contract.mjs (10 sub-tests)
**Метрики:** backtest_sharpe, max_drawdown, equity_curve, fill count
**Sharpe:** via core/edge/unified_sharpe.mjs (sharpeFromTrades)

## O9: Edge Lab Courts

**SSOT:** core/edge_lab/pipeline.mjs
**Courts (7):**
1. DatasetCourt — quality/freshness validation
2. ExecutionCourt — fill realism
3. ExecutionSensitivityCourt — parameter sensitivity
4. OverfitCourt — deflated Sharpe, bootstrap
5. RedTeamCourt — adversarial scenarios
6. RiskCourt — drawdown/VaR limits
7. SREReliabilityCourt — system reliability
**ПРОБЛЕМА:** Pipeline orphaned, не вызывается из strategy_sweep.mjs

## O10: Profit Lane

**SSOT:** core/profit/ledger.mjs, core/edge/candidate_pipeline.mjs
**Путь:** acquire → backtest → paper → canary → micro-live → live
**Файлы:**
- core/paper/paper_trading_harness.mjs
- core/canary/canary_runner.mjs
- core/live/e112_micro_live_runner.mjs
- core/governance/mode_fsm.mjs (OFF → PAPER → LIVE_SMALL → LIVE)
**ПРОБЛЕМА:** Metrics bifurcation across stages (см. FINDING-C)

## O11: Supply Chain / Node Authority

**SSOT:** NODE_TRUTH.md (family: 22, pinned: 22.22.0)
**Гейты:** node_truth_gate.mjs, node_toolchain_ensure.mjs
**Deps:** undici ^6.23.0, ws ^8.18.0 (только 2 runtime deps)
**Lock:** package-lock.json (45 packages total)
**Vendoring:** artifacts/toolchains/node/v22.22.0/

## O12: Hygiene / PR Bloat Guard / Write-Scope Guard

**SSOT:** FORMAT_POLICY.md, BUNDLE_CONTRACT.md
**Гейты:**
- regression_pr01_evidence_bloat_guard.mjs
- regression_churn_contract01.mjs
- regression_pr05_executor_ssot_stable_set.mjs
- regression_pr07_executor_runid_immutable.mjs
**Write-scope:** CERT writes ONLY to artifacts/** and reports/evidence/EPOCH-*/**
