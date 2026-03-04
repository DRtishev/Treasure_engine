# PAIN_POINTS_AND_FIX_PLANS.md — Слабости и планы исправлений

## FINDING-A (P0): e108 determinism_x2 + ajv dependency

**Статус: НЕ ПОДТВЕРЖДЕНО (ОПРОВЕРГНУТО)**

### Контр-доказательство
- `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` → EC=0, 10/10 passed (x2)
- `npm run -s verify:fast` → EC=0, все 38 gates PASS (x2)
- ajv установлен в node_modules (часть dependency tree через deps)
- Import chain contracts.mjs → ajv работает корректно

### Вывод
На текущей ветке (HEAD bdbf61f4) проблема НЕ воспроизводится. ajv resolves корректно. ASSUMPTION: проблема была на другой ветке или до npm install.

---

## FINDING-B (P1): Courts не wired в sweep/backtest pipeline

**Статус: ПОДТВЕРЖДЕНО (КРИТИЧЕСКОЕ)**

### Доказательства
1. `scripts/edge/strategy_sweep.mjs:50-130` — runBacktest x2 → CT01 → BACKTESTED, **без вызова Edge Lab courts**
2. `scripts/ops/candidate_fsm.mjs:37-60` — guard_backtest_pass проверяет court_verdicts **только если присутствуют** (defaults to [])
3. `scripts/ops/candidate_registry.mjs:205-215` — promoteCandidates() **без court gate**
4. `core/edge/candidate_pipeline.mjs:41` — runCandidatePipeline() существует и wires courts, но **ZERO callers** в operational code
5. `artifacts/BACKTEST_ORGAN_DEEP_AUDIT_v3.0.md:24-37` — внутренний аудит подтверждает: "Edge Lab Pipeline → orphaned"

### Импакт
Кандидат проходит DRAFT → BACKTESTED → PAPER_PROVEN → CANARY_DEPLOYED → GRADUATED без единой court validation через Edge Lab. Система claims "fail-closed" но operates "permit-by-default".

### Patch Plan

**Minimal fix:**
- В `scripts/edge/strategy_sweep.mjs` заменить прямой вызов runBacktest + CT01 на вызов `runCandidatePipeline()` из `core/edge/candidate_pipeline.mjs`
- В `scripts/ops/candidate_fsm.mjs:guard_backtest_pass` сделать court_verdicts **REQUIRED** (не optional), вернуть `{pass: false}` если verdicts пустые

**Radical upgrade:**
- Единый Pipeline Orchestrator, который enforce court → FSM → promotion как atomic unit
- Добавить regression gate `regression_court_wiring01` который проверяет что strategy_sweep.mjs imports runCandidatePipeline

### Regression gate
```
regression_court_wiring01: assert strategy_sweep.mjs calls runCandidatePipeline
regression_court_wiring02: assert guard_backtest_pass rejects empty court_verdicts
```

---

## FINDING-C (P1): Metrics bifurcation (backtest vs sim vs paper vs canary)

**Статус: ПОДТВЕРЖДЕНО (КРИТИЧЕСКОЕ)**

### Доказательства

#### Sharpe Ratio — 5+ различных формул:
| Контекст | Ключ | Формула | Файл:строка |
|---|---|---|---|
| backtest/engine.mjs | `backtest_sharpe` | `(mean/popStd)*sqrt(N)`, truncated 6dp | core/backtest/engine.mjs:92-95 |
| overfit_court.mjs | `raw_sharpe`, `deflated_sharpe` | `mean/sampleStd` (no annualization) | core/edge_lab/courts/overfit_court.mjs:28-47 |
| edge_magic_v1.mjs | `sharpe_like` | `mean/sqrt(variance)` | core/edge/alpha/edge_magic_v1.mjs:81 |
| edge_magic_stress | `sharpe_simple` | `mean/sqrt(variance)`, rounded 8dp | core/edge/alpha/edge_magic_stress_suite_v1.mjs:131 |
| sim/metrics.mjs | *(отсутствует)* | не вычисляется | core/sim/metrics.mjs |
| paper/canary | *(отсутствует)* | не вычисляется | core/paper/, core/canary/ |

#### Drawdown — 5 различных реализаций:
| Контекст | Ключ | Источник | Метод |
|---|---|---|---|
| backtest | `max_drawdown` (fraction) | bar-by-bar equity | HWM per bar |
| sim | `max_drawdown_pct` (fraction, capped 1.0) | trade PnL list | multiplicative equity |
| ledger | `max_drawdown` (fraction) | per fill, exec_price | HWM per fill |
| paper | *(отсутствует)* | — | — |
| canary | `drawdown_proxy` | `-paper_pnl / 10` | core/canary/fitness_suite.mjs:21 |

#### PnL — несовместимые единицы:
| Контекст | Единица | Ключ |
|---|---|---|
| backtest | USD absolute | `total_pnl`, `realized_pnl` |
| sim | return fraction | `expectancy_per_trade` |
| paper | USD absolute | `net_pnl` |
| canary | USD | `paper_pnl` |

#### Отсутствие cross-stage parity contract:
- `core/edge/contracts.mjs:100-113` — SimReport.output_metrics: `additionalProperties: {type: 'number'}`, NO required fields
- Нет единого контракта метрик для всех стадий pipeline

### Patch Plan

**Minimal fix:**
1. Создать `core/metrics/metric_contract.mjs` — единый schema с required fields для всех стадий
2. overfit_court.mjs: import sharpeFromTrades из unified_sharpe.mjs вместо inline
3. canary fitness_suite.mjs: заменить drawdown_proxy на реальный drawdown calculation
4. contracts.mjs: добавить required metric fields в SimReport schema

**Radical upgrade:**
1. `MetricParity` контракт: единый adapter, который нормализует метрики из любой стадии к canonical schema
2. Cross-stage validation gate: при переходе backtest → paper проверять metric key parity
3. Unified dashboarding: все стадии пишут в единый metric format

### Regression gate
```
regression_metric_parity01: overfit_court imports from unified_sharpe.mjs
regression_metric_parity02: canary fitness_suite computes real drawdown (not proxy)
regression_metric_parity03: all pipeline stages export required metric keys
```

---

## FINDING-D (P2): Non-determinism surface в core modules

**Статус: ВЫЯВЛЕНО В ХОДЕ АУДИТА**

### Доказательства
- `core/data/websocket_feed.mjs:281,288` — Math.random() в simulated price/volume
- `core/exec/adapters/live_adapter.mjs:324` — Math.random() для placeholder PnL (СЕРЬЁЗНО: в live adapter)
- `core/performance/perf_engine.mjs:67` — Math.random() для ID generation
- `core/persist/repo_state.mjs:256` — Math.random() для random suffix
- 40+ мест с Date.now() без ctx.clock injection

### Patch Plan
**Minimal:** Заменить Math.random() на ctx.rng в core modules. Date.now() → ctx.clock.now() в критических путях.
**Regression:** regression_san01 уже сканирует forbidden APIs; расширить whitelist/blacklist.

---

## FINDING-E (P2): Calling convention mismatch (engine_paper → computePenalizedMetrics)

**Статус: ВЫЯВЛЕНО В ХОДЕ АУДИТА**

### Доказательство
- `core/sim/engine_paper.mjs:351` — вызывает `computePenalizedMetrics(allMetrics, ssot)` передавая **array**
- `core/sim/penalized.mjs:37` — ожидает **single object** `{expectancy_per_trade, hostile_exec, hostile_maxdd, reality_gap, ssot}`

### Patch Plan
**Minimal:** Исправить вызов в engine_paper.mjs для корректной передачи объекта.
**Regression:** Unit test на вызов computePenalizedMetrics с правильной сигнатурой.

---

## Сводная таблица

| ID | Severity | Status | Описание | Fix Effort |
|---|---|---|---|---|
| FINDING-A | P0 | ОПРОВЕРГНУТО | ajv/e108 determinism | — |
| FINDING-B | P1 | ПОДТВЕРЖДЕНО | Courts не wired в sweep | 3/10 (minimal), 6/10 (radical) |
| FINDING-C | P1 | ПОДТВЕРЖДЕНО | Metrics bifurcation 5+ формул | 5/10 (minimal), 8/10 (radical) |
| FINDING-D | P2 | ВЫЯВЛЕНО | Math.random/Date.now в core | 4/10 |
| FINDING-E | P2 | ВЫЯВЛЕНО | engine_paper calling convention | 2/10 |
