# SPRINT_1_METRIC_PARITY_SPEC.md — Унификация метрик pipeline

**Finding:** FINDING-C (P1), FINDING-E (P2)
**WOW Ref:** W8.1, W10.1, W10.5
**Prerequisite:** Sprint 0 (court wiring)

---

## 1. GOAL

Устранить bifurcation метрик между стадиями pipeline (backtest → sim → paper → canary → live).
Единый Sharpe SSOT (`unified_sharpe.mjs`), реальный drawdown вместо proxy, cross-stage parity contract.

**Цена бездействия:** Кандидат может получить Sharpe=2.0 в backtest, Sharpe=0.3 в overfit_court
(разные формулы), пройти court (нет порога), и обнаружить Sharpe=-0.5 в live (другая формула).
Разрушение доверия к pipeline.

## 2. NON-GOALS

- НЕ меняем backtest engine (`core/backtest/engine.mjs`) — он уже использует unified_sharpe
- НЕ добавляем новые courts
- НЕ меняем FSM transitions
- НЕ трогаем network policy или SAN scanners

## 3. SCOPE

| Файл | Действие | Описание |
|---|---|---|
| `core/metrics/metric_contract.mjs` | CREATE | Единый schema required metric keys |
| `core/edge_lab/courts/overfit_court.mjs:18-48` | MODIFY | Заменить inline sharpe/deflated на imports из unified_sharpe.mjs |
| `core/canary/fitness_suite.mjs:21` | MODIFY | Заменить drawdown_proxy на реальный HWM drawdown |
| `core/sim/engine_paper.mjs:351` | MODIFY | Fix calling convention (FINDING-E) |
| `core/edge/contracts.mjs:100-113` | MODIFY | Добавить required metric fields в SimReport |
| `scripts/verify/regression_sharpe_ssot01_no_inline.mjs` | CREATE | Gate: no inline Sharpe в core/ |
| `scripts/verify/regression_metric_parity01_overfit_uses_unified.mjs` | CREATE | Gate: overfit_court imports unified |
| `scripts/verify/regression_metric_parity02_canary_real_dd.mjs` | CREATE | Gate: canary real drawdown |
| `scripts/verify/regression_metric_parity03_required_keys.mjs` | CREATE | Gate: all stages export required keys |

## 4. INVARIANTS

**INV-S1-1:** `overfit_court.mjs` НЕ содержит локальных функций `mean()`, `std()`, `sharpeRatio()`, `deflatedSharpe()`.
Все imports из `unified_sharpe.mjs`.
- Проверка: `grep -c "function sharpeRatio\|function mean\|function std\|function deflatedSharpe" core/edge_lab/courts/overfit_court.mjs` === 0

**INV-S1-2:** `canary/fitness_suite.mjs` НЕ содержит `drawdown_proxy` с формулой `-pnl/10`.
- Проверка: `grep -c "drawdown_proxy.*pnl.*10" core/canary/fitness_suite.mjs` === 0

**INV-S1-3:** `engine_paper.mjs:351` вызывает `computePenalizedMetrics()` с single object (не array).
- Проверка: regression gate с unit test

**INV-S1-4:** `core/metrics/metric_contract.mjs` exports `REQUIRED_METRIC_KEYS` с минимум 4 keys.

**INV-S1-5:** verify:fast x2 PASS, e108 x2 PASS.

## 5. FAILURE MODES

| Failure | Как обнаружим | Митигация |
|---|---|---|
| Unified Sharpe даёт другие значения чем inline overfit | e108 determinism diff (expected) | Backtest golden vectors — document expected change |
| Canary real drawdown breaks fitness threshold | Canary test FAIL | Adjust thresholds to match new formula |
| computePenalizedMetrics fix breaks sim pipeline | sim:all FAIL | Test sim:all перед коммитом |
| metric_contract слишком strict для alpha suites | edge_magic FAIL | alpha suites в SCOPE exception list |

## 6. IMPLEMENTATION PLAN

### Шаг 1: Создать core/metrics/metric_contract.mjs

```javascript
/**
 * metric_contract.mjs — Canonical metric schema for ALL pipeline stages
 *
 * Every stage (backtest, sim, paper, canary, live) MUST output these keys.
 * Additional keys are allowed. Missing required keys = FAIL.
 */

export const REQUIRED_METRIC_KEYS = [
  'sharpe',           // number — annualized Sharpe ratio via unified_sharpe
  'max_drawdown',     // number — fraction (0..1), HWM-based
  'total_pnl',        // number — USD absolute
  'trade_count',      // integer — number of completed trades
];

export const OPTIONAL_METRIC_KEYS = [
  'sortino', 'calmar', 'win_rate', 'profit_factor',
  'avg_trade_pnl', 'max_consecutive_loss', 'recovery_factor',
];

export function validateMetrics(metrics, stageLabel) {
  const missing = REQUIRED_METRIC_KEYS.filter(k => !(k in metrics));
  if (missing.length > 0) {
    return { valid: false, missing, detail: `${stageLabel}: missing ${missing.join(', ')}` };
  }
  return { valid: true, missing: [], detail: `${stageLabel}: all required keys present` };
}
```

### Шаг 2: Рефакторинг overfit_court.mjs

**Файл:** `core/edge_lab/courts/overfit_court.mjs`

**Удалить** (строки 18-48): Локальные `mean()`, `std()`, `sharpeRatio()`, `deflatedSharpe()`.

**Добавить import** (вверху файла):
```javascript
import {
  sharpeFromTrades,
  deflatedSharpeRatio,
  mean as uMean,
  skewness,
  kurtosisExcess,
} from '../../edge/unified_sharpe.mjs';
```

**Заменить использование** (строки 138-141):
```javascript
// BEFORE (inline):
// const rawSharpe = sharpeRatio(returns);
// const dSharpe = deflatedSharpe(rawSharpe, trades.length, N);

// AFTER (unified):
const rawSharpe = sharpeFromTrades(returns, 4);  // 4dp for court precision
const skew = skewness(returns);
const kurt = kurtosisExcess(returns);
const dSharpe = deflatedSharpeRatio(rawSharpe, returns.length, skew, kurt, N);
```

**ВАЖНО:** Unified `deflatedSharpeRatio` использует Bailey & Lopez de Prado (2014) формулу,
а inline использовал упрощённую `sharpe - sqrt(log(N)/(T-1))`. Значения БУДУТ отличаться.
Это ожидаемо и правильно — unified формула точнее.

### Шаг 3: Fix canary drawdown

**Файл:** `core/canary/fitness_suite.mjs:21`

**BEFORE:**
```javascript
drawdown_proxy: Number((Math.max(0, -paper.report.metrics.paper_pnl) / 10).toFixed(6)),
```

**AFTER:**
```javascript
max_drawdown: computeMaxDrawdown(paper.report.metrics.equity_curve ?? paper.report.metrics.fills ?? []),
```

Добавить вспомогательную функцию (или import из unified):
```javascript
function computeMaxDrawdown(equityOrFills) {
  if (!equityOrFills || equityOrFills.length === 0) return 0;
  let hwm = 0;
  let maxDD = 0;
  let equity = 0;
  for (const item of equityOrFills) {
    equity = typeof item === 'number' ? item : (equity + (item.realized_pnl ?? 0));
    if (equity > hwm) hwm = equity;
    if (hwm > 0) {
      const dd = (hwm - equity) / hwm;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return Number(maxDD.toFixed(6));
}
```

### Шаг 4: Fix engine_paper.mjs calling convention (FINDING-E)

**Файл:** `core/sim/engine_paper.mjs:351`

Проверить: если `allMetrics` — массив, а `computePenalizedMetrics` ожидает объект,
нужно передать `allMetrics[0]` или адаптировать.

**Действие:** Прочитать `core/sim/penalized.mjs:37` и убедиться в сигнатуре.
Если penalized ожидает объект → передать объект. Если allMetrics — массив → агрегировать.

### Шаг 5: Обновить contracts.mjs

**Файл:** `core/edge/contracts.mjs:100-113`

В SimReport.output_metrics добавить:
```javascript
required: ['sharpe', 'max_drawdown', 'total_pnl', 'trade_count'],
```

### Шаг 6: Создать 4 regression gates

Каждый gate:
1. Проверяет инвариант
2. Пишет JSON evidence в `reports/evidence/EXECUTOR/gates/manual/`
3. EC=0 PASS, EC=1 FAIL

## 7. GATES & REGRESSIONS

| Gate ID | Что проверяет | Evidence |
|---|---|---|
| `regression_sharpe_ssot01_no_inline` | Нет inline Sharpe/mean/std в core/edge_lab/courts/ | `regression_sharpe_ssot01.json` |
| `regression_metric_parity01_overfit_uses_unified` | overfit_court imports from unified_sharpe | `regression_metric_parity01.json` |
| `regression_metric_parity02_canary_real_dd` | canary fitness НЕ содержит drawdown_proxy | `regression_metric_parity02.json` |
| `regression_metric_parity03_required_keys` | metric_contract.mjs exports REQUIRED_METRIC_KEYS | `regression_metric_parity03.json` |

## 8. EVIDENCE ARTIFACTS

| Артефакт | Путь |
|---|---|
| 4 regression gate results | `reports/evidence/EXECUTOR/gates/manual/regression_{name}.json` |
| 4 regression gate MDs | `reports/evidence/EXECUTOR/REGRESSION_{NAME}.md` |
| Metric contract module | `core/metrics/metric_contract.mjs` |

## 9. TEST PLAN

```bash
# 1. Pre-change baseline
npm run -s verify:fast
node scripts/verify/e108_backtest_determinism_x2_contract.mjs

# 2. Apply changes (steps 1-6)

# 3. Unit tests for changed modules
node -e "import('./core/metrics/metric_contract.mjs').then(m => console.log(m.validateMetrics({sharpe:1,max_drawdown:0.1,total_pnl:100,trade_count:50},'test')))"
node -e "import('./core/edge_lab/courts/overfit_court.mjs').then(m => console.log('overfit: OK'))"

# 4. Post-change verification (x2)
npm run -s verify:fast  # Run 1
npm run -s verify:fast  # Run 2
node scripts/verify/e108_backtest_determinism_x2_contract.mjs  # Run 1
node scripts/verify/e108_backtest_determinism_x2_contract.mjs  # Run 2

# 5. Regen manifests
npm run -s regen:manifests

# 6. Final x2
npm run -s verify:fast
npm run -s verify:fast
```

## 10. DEFINITION OF DONE

- [ ] `core/metrics/metric_contract.mjs` создан с 4 required keys
- [ ] `overfit_court.mjs` imports Sharpe из `unified_sharpe.mjs` (0 inline Sharpe функций)
- [ ] `canary/fitness_suite.mjs` вычисляет реальный HWM drawdown (не proxy)
- [ ] `engine_paper.mjs:351` вызывает `computePenalizedMetrics` с правильной сигнатурой
- [ ] `contracts.mjs` SimReport.output_metrics содержит required fields
- [ ] 4 regression gates PASS standalone
- [ ] 4 regression gates зарегистрированы в verify:fast chain
- [ ] `npm run -s verify:fast` x2 PASS (оба run EC=0)
- [ ] `e108_backtest_determinism_x2` x2 PASS
- [ ] git status clean

## 11. ROLLBACK PLAN

Откатить 4 изменённых файла к pre-sprint SHA.
Удалить 5 созданных файлов (metric_contract + 4 gates).
`npm run -s verify:fast` для подтверждения baseline.

## 12. ONE NEXT ACTION

```bash
# Создать core/metrics/metric_contract.mjs с required keys
mkdir -p core/metrics
```
