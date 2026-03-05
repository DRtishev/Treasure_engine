# RESEARCH: Profit Realism Layer (Sprint 7)

## Дата: 2026-03-05
## Контекст: CERT mode, offline, без сети

---

## Текущее состояние (Gap Summary)

1. **Fees**: захардкожены 4 bps в backtest; execution_policy адаптивный tip, но не унифицирован
2. **Slippage**: backtest = slip_bps=2 (константа); sim = нормальное распределение (3 профиля); нет SSOT
3. **Funding**: отсутствует полностью
4. **Partial fills**: execution_realism имеет liquidity buckets, но backtest/paper их не используют
5. **PARITY LAW**: нет. Каждый режим считает PnL своим путём

---

## Option 1: MINIMAL

### Mechanism
- Единый `cost_model.mjs` агрегатор с интерфейсом `computeCosts({ price, qty, side, mode })`
- **Fees**: maker/taker разделение (maker=2bps, taker=4bps); tier-aware = отложено
- **Slippage**: константа `slip_bps` из конфига (default=2 для backtest, 3 для paper/live)
- **Funding**: INSUFFICIENT_EVIDENCE -- возвращает `{ funding: 0, funding_status: 'INSUFFICIENT_EVIDENCE' }`
- **Partial fills**: не моделируются (fill_ratio=1.0)
- Backtest/paper/live используют один `cost_model.mjs`

### Assumptions
- [ASSUMPTION] Maker/taker различие достаточно для первой итерации
- [ASSUMPTION] Константный слипаж адекватен для backtest

### Failure modes
- Слишком оптимистичный backtest (нет partial fills → завышенная прибыль)
- Нет funding → perp-стратегии завышены

### Offline proof strategy
- grep: все PnL расчёты проходят через cost_model
- contract: required fields в output
- parity: один сценарий → три режима → идентичные cost fields

### Impact/Cost/Risk
- Impact: 5/10 (минимальное улучшение)
- Cost: 3/10 (быстро)
- Risk: 2/10 (мало ломает)

### Freeze strategy
- `artifacts/contracts/COST_MODEL_CONTRACT_v1.json` с хешом
- Параметры: `{ fee_maker_bps: 2, fee_taker_bps: 4, slip_bps: 2 }`

---

## Option 2: BALANCED (TARGET)

### Mechanism
- Единый `cost_model.mjs` SSOT-агрегатор
- **Fees**: maker/taker (2/4 bps default); конфигурируемые; tier placeholder
- **Slippage**: детерминистическая модель:
  ```
  slippage_bps = spread_bps/2 + depth_proxy_bps * participation_ratio + volatility_bps * vol_multiplier
  ```
  - `spread_bps`: из конфига или калибровки (default=1.5)
  - `depth_proxy_bps`: `order_usd / reference_depth_usd * depth_coeff` (default depth_coeff=0.5)
  - `volatility_bps`: `atr_pct * vol_coeff` (default vol_coeff=0.1)
  - Все коэффициенты -- frozen constants
- **Funding**: bounds model:
  ```
  funding_cost = position_usd * funding_rate_bps * holding_periods
  ```
  - `funding_rate_bps`: bounds [min=-5, max=15] bps per 8h
  - Если нет данных: `funding_status = 'BOUNDS_ESTIMATE'`
  - Fail-closed: если bounds нереалистичны → `funding_status = 'INSUFFICIENT_EVIDENCE'`
- **Partial fills**: упрощённая модель:
  ```
  fill_ratio = min(1.0, available_liquidity / order_size)
  available_liquidity = reference_depth_usd * liquidity_fraction
  ```
  - Если нет данных о ликвидности: `fill_ratio = 0.95` (conservative default)
  - Unfilled остаток: отменяется (не переносится)
- **PARITY LAW**: один вызов `cost_model.computeTotalCost()` для backtest/paper/live
  - Output: `{ fee, slippage, funding, partial_fill_ratio, total_cost, cost_status }`
  - Все три режима используют идентичный путь вычисления

### Assumptions
- [ASSUMPTION] Детерминистическая формула слипажа адекватна (без стохастики)
- [ASSUMPTION] Funding bounds [min=-5, max=15] bps/8h покрывают нормальный рынок
- [ASSUMPTION] Conservative fill_ratio=0.95 лучше чем 1.0

### Failure modes
- Формула слипажа может не соответствовать реальной микроструктуре
- Funding bounds могут быть слишком широкими для конкретных инструментов
- Partial fill default 0.95 может быть слишком оптимистичным для illiquid пар

### Offline proof strategy
- **Contract check**: `cost_model.computeTotalCost()` возвращает все required fields
- **Parity E2E**: один сценарий (10 trades) → backtest/paper/live → diff cost fields = 0
- **Partial fill E2E**: order > depth → fill_ratio < 1.0
- **Funding bounds E2E**: holding > 1 period → funding_cost > 0

### Impact/Cost/Risk
- Impact: 8/10 (значительное улучшение реалистичности)
- Cost: 6/10 (средняя сложность)
- Risk: 4/10 (больше движущихся частей, но детерминистично)

### Freeze strategy
- `artifacts/contracts/COST_MODEL_CONTRACT_v2.json`:
  ```json
  {
    "version": "2.0.0",
    "fee_maker_bps": 2,
    "fee_taker_bps": 4,
    "spread_default_bps": 1.5,
    "depth_coeff": 0.5,
    "vol_coeff": 0.1,
    "funding_bounds_min_bps": -5,
    "funding_bounds_max_bps": 15,
    "funding_period_hours": 8,
    "default_fill_ratio": 0.95,
    "hash": "<sha256 при freeze>"
  }
  ```

---

## Option 3: RADICAL

### Mechanism
- Полный replay funding из исторических данных
- Микроструктурная аппроксимация слипажа:
  - LOB (limit order book) reconstruction из tick data
  - Impact model: `impact_bps = alpha * (volume / ADV)^beta`
  - Temporary vs permanent impact decomposition
- Scenario simulation: Monte Carlo для stress testing costs
- Multi-venue routing: split orders across exchanges

### Assumptions
- [ASSUMPTION] Исторические funding данные доступны и надёжны
- [ASSUMPTION] LOB данные/tick data есть для reconstruction
- [ASSUMPTION] Monte Carlo с фиксированным seed = детерминизм

### Failure modes
- Data dependency: CERT mode запрещает сеть → данных может не быть
- Overfitting: слишком точная модель прошлого не предсказывает будущее
- Complexity: больше точек отказа
- Performance: Monte Carlo → медленный verify:fast

### Offline proof strategy
- Требует data fixtures (LOB snapshots, funding history)
- Если fixture нет → INSUFFICIENT_EVIDENCE для большинства компонентов

### Impact/Cost/Risk
- Impact: 9/10 (максимально реалистично)
- Cost: 9/10 (очень дорого)
- Risk: 7/10 (data dependency, complexity, performance)

### Freeze strategy
- Требует freeze всех fixture данных + модельных параметров
- Не feasible без сетевого доступа к историческим данным

---

## Сравнительная таблица

| Критерий | MINIMAL | BALANCED | RADICAL |
|----------|---------|----------|---------|
| Impact | 5 | 8 | 9 |
| Cost | 3 | 6 | 9 |
| Risk | 2 | 4 | 7 |
| Offline feasibility | HIGH | HIGH | LOW |
| Parity enforcement | YES | YES | PARTIAL |
| verify:fast budget | +0 gates | +2 gates | +5 gates |
| Data dependency | NONE | NONE | HIGH |
| Determinism | YES | YES | SEED-DEPENDENT |

---

## Рекомендация

**Option 2: BALANCED** -- оптимальный баланс реалистичности и feasibility.

Причины:
1. Покрывает все 4 компонента затрат (fees/slippage/funding/partial fills)
2. Полностью детерминистично, без стохастики
3. Не требует внешних данных (offline-compatible)
4. PARITY LAW enforced через единый SSOT
5. verify:fast budget: +2 gates (в рамках бюджета)
6. Partial fills и funding -- conservative defaults при отсутствии данных
