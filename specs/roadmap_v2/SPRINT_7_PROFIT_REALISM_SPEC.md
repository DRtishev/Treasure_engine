# SPRINT 7: PROFIT REALISM LAYER -- SPEC

## Дата: 2026-03-05
## Статус: APPROVED
## Decision Pack: `specs/roadmap_v2/DECISION_PACK_S7.md`

---

## 1. ЦЕЛЬ

Единый COST MODEL + PARITY LAW для backtest/paper/micro-live.
Прибыльность считается одним языком, без самообмана.

---

## 2. COST_MODEL_CONTRACT

### 2.1 Interface

```javascript
// core/cost/cost_model.mjs -- SSOT
export function computeTotalCost({
  price,           // number, execution price before costs
  qty,             // number, order quantity
  side,            // 'BUY' | 'SELL'
  order_type,      // 'MAKER' | 'TAKER'
  mode,            // 'backtest' | 'paper' | 'live'
  market_context   // optional: { spread_bps, depth_usd, atr_pct, funding_rate_bps, holding_periods }
}) => CostResult
```

### 2.2 CostResult Schema

```javascript
{
  fee_bps: number,           // applied fee rate
  fee_usd: number,           // fee in USD
  slippage_bps: number,      // deterministic slippage
  slippage_usd: number,      // slippage in USD
  funding_bps: number,       // funding per period
  funding_usd: number,       // total funding cost
  funding_status: string,    // 'KNOWN' | 'BOUNDS_ESTIMATE' | 'INSUFFICIENT_EVIDENCE'
  fill_ratio: number,        // 0..1
  filled_qty: number,        // qty * fill_ratio
  total_cost_bps: number,    // fee + slippage + funding
  total_cost_usd: number,    // total in USD
  exec_price: number         // price adjusted for slippage
}
```

### 2.3 Required Fields
Все поля обязательны. Отсутствие любого = contract violation.

### 2.4 Units
- `*_bps`: basis points (1 bps = 0.01%)
- `*_usd`: USD
- `fill_ratio`: 0..1 inclusive
- `exec_price`: same currency as input `price`

### 2.5 Rounding
- USD: 2 decimal places (Math.round * 100 / 100)
- BPS: 4 decimal places
- fill_ratio: 4 decimal places
- exec_price: 8 decimal places (crypto precision)

---

## 3. FEE MODEL

### 3.1 core/cost/fees_model.mjs

```javascript
export function computeFee({ price, qty, order_type, config }) => { fee_bps, fee_usd }
```

### 3.2 Defaults
| Parameter | Value |
|-----------|-------|
| fee_maker_bps | 2 |
| fee_taker_bps | 4 |

### 3.3 Tier-aware
Отложено (NON-GOAL Sprint 7). Placeholder `tier: 'DEFAULT'` в config.

---

## 4. SLIPPAGE MODEL

### 4.1 core/cost/slippage_model.mjs

```javascript
export function computeSlippage({ price, qty, side, market_context, config }) =>
  { slippage_bps, slippage_usd, exec_price }
```

### 4.2 Deterministic Formula

```
slippage_bps = spread_component + depth_component + volatility_component

spread_component = spread_bps / 2
  - spread_bps: market_context.spread_bps || config.spread_default_bps (1.5)

depth_component = participation_ratio * config.depth_coeff (0.5)
  - participation_ratio = min(1.0, order_usd / depth_usd)
  - depth_usd: market_context.depth_usd || config.depth_default_usd (1_000_000)

volatility_component = atr_pct * config.vol_coeff (0.1) * 100
  - atr_pct: market_context.atr_pct || 0 (no vol penalty if unknown)
```

### 4.3 exec_price
```
BUY:  exec_price = price * (1 + slippage_bps / 10000)
SELL: exec_price = price * (1 - slippage_bps / 10000)
```

---

## 5. FUNDING MODEL

### 5.1 core/cost/funding_model.mjs

```javascript
export function computeFunding({ position_usd, holding_periods, market_context, config }) =>
  { funding_bps, funding_usd, funding_status }
```

### 5.2 Bounds Model

```
funding_rate = market_context.funding_rate_bps
  || config.funding_default_bps (5)

funding_bps = funding_rate * holding_periods
funding_usd = position_usd * funding_bps / 10000
```

### 5.3 Status Logic
| Condition | Status |
|-----------|--------|
| market_context.funding_rate_bps provided | KNOWN |
| Using config default | BOUNDS_ESTIMATE |
| holding_periods = 0 | KNOWN (funding = 0) |
| funding_rate outside [-5, 15] bounds | INSUFFICIENT_EVIDENCE |

### 5.4 Fail-closed
Если `funding_status = 'INSUFFICIENT_EVIDENCE'`:
- funding_bps = верхняя граница bounds (15 bps) * holding_periods
- Это conservative estimate (worst case)

---

## 6. PARTIAL FILLS MODEL

### 6.1 Интегрировано в cost_model.mjs

```javascript
fill_ratio = min(1.0, available_liquidity / order_size_usd)
available_liquidity = depth_usd * config.liquidity_fraction (0.1)
```

### 6.2 Defaults
| Parameter | Value |
|-----------|-------|
| depth_default_usd | 1_000_000 |
| liquidity_fraction | 0.1 |
| fill_ratio when no depth data | 0.95 |

### 6.3 Unfilled qty
- Отменяется (не переносится на следующий бар/тик)
- filled_qty = qty * fill_ratio

---

## 7. PARITY LAW

### 7.1 Принцип
Один и тот же `computeTotalCost()` вызывается из:
- `core/backtest/engine.mjs`
- `core/paper/` (paper trading adapter)
- `core/live/` (micro-live adapter)
- `core/exec/master_executor.mjs`

### 7.2 Единственное различие
- `market_context` source:
  - backtest: из fixture/historical data
  - paper: из fixture или live feed snapshot
  - live: из live feed

### 7.3 Invariant
```
For identical input:
  backtest.computeTotalCost(input) === paper.computeTotalCost(input) === live.computeTotalCost(input)
```

---

## 8. FROZEN PARAMETERS

```json
{
  "version": "2.0.0",
  "fee_maker_bps": 2,
  "fee_taker_bps": 4,
  "spread_default_bps": 1.5,
  "depth_default_usd": 1000000,
  "depth_coeff": 0.5,
  "vol_coeff": 0.1,
  "liquidity_fraction": 0.1,
  "default_fill_ratio": 0.95,
  "funding_default_bps": 5,
  "funding_bounds_min_bps": -5,
  "funding_bounds_max_bps": 15,
  "funding_period_hours": 8
}
```

Frozen в `artifacts/contracts/COST_MODEL_CONTRACT_v2.json` с SHA256.

---

## 9. GATES

### 9.1 FAST (+2 gates, итого 53)

| ID | Тип | Описание |
|----|-----|----------|
| RG_REALISM01_COST_CONTRACT | grep/import | `core/cost/cost_model.mjs` exports `computeTotalCost`; required fields present |
| RG_REALISM02_NO_PROXY_METRICS | grep | нет inline fee/slip/PnL calculation в backtest/paper/live обходящего cost_model |

### 9.2 DEEP (+3 E2E)

| ID | Описание |
|----|----------|
| RG_REALISM03_PARITY_E2E | один сценарий → backtest/paper → identical cost fields |
| RG_REALISM04_PARTIAL_FILL_E2E | order > depth → fill_ratio < 1.0 |
| RG_REALISM05_FUNDING_BOUNDS | holding > 1 period → funding_cost > 0, status = BOUNDS_ESTIMATE |

---

## 10. DoD (Definition of Done)

| # | Критерий | Проверка |
|---|---------|----------|
| S7-DoD-1 | `core/cost/cost_model.mjs` существует и exports `computeTotalCost` | RG_REALISM01 |
| S7-DoD-2 | `core/cost/fees_model.mjs` существует | RG_REALISM01 |
| S7-DoD-3 | `core/cost/slippage_model.mjs` существует | RG_REALISM01 |
| S7-DoD-4 | `core/cost/funding_model.mjs` существует | RG_REALISM01 |
| S7-DoD-5 | CostResult содержит все required fields | RG_REALISM01 |
| S7-DoD-6 | Нет inline cost calculation в обход cost_model | RG_REALISM02 |
| S7-DoD-7 | Parity: backtest/paper → identical costs | RG_REALISM03 |
| S7-DoD-8 | Partial fills: fill_ratio < 1.0 при large order | RG_REALISM04 |
| S7-DoD-9 | Funding bounds: cost > 0 при holding | RG_REALISM05 |
| S7-DoD-10 | Все 51 baseline gates PASS (regression) | verify:fast |
| S7-DoD-11 | verify:fast x2 PASS (anti-flake) | standard |
| S7-DoD-12 | e108 x2 PASS (determinism) | standard |
| S7-DoD-13 | verify:deep PASS | standard |
| S7-DoD-14 | Frozen params contract hash | artifacts/contracts/ |
