# ROADMAP.md — План внедрения по спринтам

---

## Sprint 0: P0/P1 блокеры (1-2 дня)

### Цели
1. Wire courts в strategy_sweep.mjs (FINDING-B fix)
2. Сделать court_verdicts обязательными в guard_backtest_pass
3. Добавить regression gates для court wiring

### Задачи
- [ ] `scripts/edge/strategy_sweep.mjs`: заменить raw backtest+CT01 на runCandidatePipeline()
- [ ] `scripts/ops/candidate_fsm.mjs:guard_backtest_pass`: court_verdicts REQUIRED, не optional
- [ ] Создать `scripts/verify/regression_court_wiring01.mjs`: assert sweep imports runCandidatePipeline
- [ ] Создать `scripts/verify/regression_court_wiring02.mjs`: assert guard rejects empty verdicts
- [ ] Добавить regression gates в verify:fast chain

### DoD (Definition of Done)
- [ ] strategy_sweep.mjs вызывает runCandidatePipeline (не raw backtest)
- [ ] guard_backtest_pass возвращает `{pass: false}` при пустых court_verdicts
- [ ] regression_court_wiring01 PASS
- [ ] regression_court_wiring02 PASS
- [ ] verify:fast x2 PASS (no regression)
- [ ] e108 determinism x2 PASS

### Гейты
- verify:fast x2 (PASS/PASS, no ND)
- regression_court_wiring01 PASS
- regression_court_wiring02 PASS

### Риски
- Existing candidates без court verdicts потребуют re-evaluation
- runCandidatePipeline может иметь зависимости не установленные в CERT mode

### ONE_NEXT_ACTION
```bash
# В strategy_sweep.mjs заменить runBacktest+CT01 на runCandidatePipeline
```

---

## Sprint 1: Metrics Unification + Sharpe SSOT (3-5 дней)

### Цели
1. Единый metric contract для всех стадий pipeline
2. Все Sharpe calculations через unified_sharpe.mjs
3. Canary real drawdown (не proxy)
4. Cross-stage validation gate

### Задачи
- [ ] Создать `core/metrics/metric_contract.mjs`: schema с required keys (sharpe, max_drawdown, pnl_usd, trade_count)
- [ ] `core/edge_lab/courts/overfit_court.mjs`: import sharpeFromTrades из unified_sharpe.mjs
- [ ] `core/edge/alpha/edge_magic_*.mjs`: import из unified_sharpe.mjs
- [ ] `core/canary/fitness_suite.mjs`: реальный drawdown вместо `-pnl/10`
- [ ] `core/sim/engine_paper.mjs:351`: fix calling convention (array → object)
- [ ] Создать regression gates: metric_parity01, metric_parity02, metric_parity03
- [ ] Создать `scripts/verify/regression_sharpe_ssot01.mjs`

### DoD
- [ ] Все Sharpe вычисления через unified_sharpe.mjs (grep: 0 inline Sharpe в core/)
- [ ] Canary drawdown = real HWM drawdown (не proxy)
- [ ] computePenalizedMetrics called с правильной сигнатурой
- [ ] metric_contract.mjs validates output of each pipeline stage
- [ ] verify:fast x2 PASS, e108 x2 PASS

### Гейты
- regression_sharpe_ssot01 PASS
- regression_metric_parity01 PASS
- regression_metric_parity02 PASS
- verify:fast x2 PASS

### Риски
- Изменение Sharpe формулы может изменить backtest результаты (expected)
- Paper/canary stages need metric adapter layer
- Некоторые alpha suites могут not use standard Sharpe format intentionally

### ONE_NEXT_ACTION
```bash
# Создать core/metrics/metric_contract.mjs с unified schema
```

---

## Sprint 2: FSM Goal-Seeker + Healing Loop + Operator Calm (3-5 дней)

### Цели
1. FSM knows target state and plans path
2. Healing loop: DEGRADED → automatic recovery
3. Doctor confidence score
4. Cockpit ONE_NEXT_ACTION prominence

### Задачи
- [ ] `scripts/ops/state_manager.mjs`: planPath(current, target) function
- [ ] `scripts/ops/heal_runner.mjs`: auto-execute healing recipes
- [ ] `scripts/ops/doctor.mjs`: confidence score (0-100)
- [ ] `scripts/ops/cockpit.mjs`: ONE_NEXT_ACTION as first line
- [ ] FSM deadlock detection (N ticks without transition)
- [ ] Doctor history ledger (JSONL append)
- [ ] FSM replay regression gate in verify:fast
- [ ] Proprioception → cockpit integration

### DoD
- [ ] ops:fsm:plan --target CERTIFIED выдаёт path
- [ ] DEGRADED state auto-triggers healing within N ticks
- [ ] Doctor outputs confidence score
- [ ] Cockpit HUD starts with ONE_NEXT_ACTION
- [ ] verify:fast x2 PASS

### Гейты
- regression_fsm_path01 PASS
- regression_heal01_auto PASS
- regression_doctor_score01 PASS
- verify:fast x2 PASS

### Риски
- Auto-healing может зациклиться (need max retries)
- Path planning complexity grows with FSM states
- Confidence score calibration needs historical data

### ONE_NEXT_ACTION
```bash
# Implement planPath() in state_manager.mjs
```

---

## Sprint 3: Profit Lane (Paper→Micro-Live) + Kill Switch (5-7 дней)

### Цели
1. Paper→micro-live promotion с полным evidence chain
2. Kill switch matrix: condition → action → escalation
3. Live fill reconciliation
4. Emergency flatten protocol

### Задачи
- [ ] Kill switch matrix в specs/kill_switch_matrix.json
- [ ] `core/risk/kill_switch.mjs`: implement matrix conditions
- [ ] Live fill reconciliation в core/recon/reconcile_v1.mjs
- [ ] `ops:emergency:flatten` script
- [ ] Position size scaling protocol (micro→small→normal)
- [ ] Reality gap monitor wiring в live feed loop
- [ ] Profit ledger cross-validation
- [ ] Regression gates: kill_switch01, reconcile01, flatten01

### DoD
- [ ] Kill switch triggers on: drawdown > X, reality_gap > Y, exchange error rate > Z
- [ ] ops:emergency:flatten closes all positions in <5s
- [ ] Fill reconciliation runs after every live fill
- [ ] Position scaling tiers enforced by risk governor
- [ ] verify:fast x2 PASS

### Гейты
- regression_kill_switch01 PASS
- regression_reconcile01 PASS
- regression_flatten01 PASS
- verify:fast x2 PASS

### Риски
- Exchange API latency may exceed flatten time budget
- Kill switch false positives → unnecessary stops
- Reconciliation drift from exchange API changes

### ONE_NEXT_ACTION
```bash
# Create specs/kill_switch_matrix.json with condition→action mappings
```

---

## Приоритизация

| Sprint | Приоритет | Блокирует | Effort | Impact |
|---|---|---|---|---|
| Sprint 0 | P0-P1 | Sprint 1 | 1-2 дня | КРИТИЧЕСКИЙ |
| Sprint 1 | P1 | Sprint 3 | 3-5 дней | ВЫСОКИЙ |
| Sprint 2 | P2 | — | 3-5 дней | СРЕДНИЙ |
| Sprint 3 | P1 | — | 5-7 дней | ВЫСОКИЙ |

## Глобальный ONE_NEXT_ACTION

```bash
# Sprint 0, Task 1: Wire courts в strategy_sweep.mjs
vim scripts/edge/strategy_sweep.mjs  # import runCandidatePipeline, replace raw backtest
```
