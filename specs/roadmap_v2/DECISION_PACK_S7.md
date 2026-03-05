# DECISION PACK -- Sprint 7: Profit Realism Layer

## Дата: 2026-03-05
## Статус: APPROVED

---

## Выбранный вариант: Option 2 -- BALANCED

### Обоснование
1. Покрывает все 4 компонента затрат (fees/slippage/funding/partial fills)
2. Полностью детерминистично, без стохастики
3. Offline-compatible (CERT mode)
4. PARITY LAW enforced через единый SSOT cost_model
5. verify:fast бюджет: +2 gates (в рамках лимита)
6. Conservative defaults при отсутствии данных

### Отвергнутые варианты
- **MINIMAL**: недостаточно -- нет partial fills, нет funding, нет формулы слипажа
- **RADICAL**: data dependency (LOB/tick data), нарушает CERT offline constraint, перерасход verify:fast бюджета

---

## NON-GOALS
1. Tier-aware fee schedule (отложено до наличия tier данных)
2. Multi-venue routing
3. Стохастическая модель слипажа (Monte Carlo)
4. LOB reconstruction
5. Replay funding из исторических данных (нет data fixtures)

---

## verify:fast Gate Budget

Текущий бюджет: 51 gate
Добавляем: +2 gates
Итого: 53 gates

| Новый гейт | Тип | Описание |
|------------|-----|----------|
| RG_REALISM01_COST_CONTRACT | grep/AST | cost_model exports required interface |
| RG_REALISM02_NO_PROXY_METRICS | grep | нет inline PnL/cost в обход cost_model |

---

## verify:deep E2E тесты

| Новый тест | Описание |
|-----------|----------|
| RG_REALISM03_PARITY_E2E | один сценарий → backtest/paper/live → identical cost fields |
| RG_REALISM04_PARTIAL_FILL_E2E | order > depth → fill_ratio < 1.0 |
| RG_REALISM05_FUNDING_BOUNDS | holding > 1 period → funding_cost > 0 |

---

## Новые контракты/инварианты

### COST_MODEL_CONTRACT
```
computeTotalCost({ price, qty, side, mode, market_context? }) →
{
  fee_bps: number,        // maker or taker
  fee_usd: number,
  slippage_bps: number,   // deterministic formula
  slippage_usd: number,
  funding_bps: number,    // per period
  funding_usd: number,
  funding_status: 'KNOWN' | 'BOUNDS_ESTIMATE' | 'INSUFFICIENT_EVIDENCE',
  fill_ratio: number,     // 0..1
  filled_qty: number,
  total_cost_bps: number,
  total_cost_usd: number,
  exec_price: number      // price adjusted for slippage
}
```

### PARITY_LAW_INVARIANT
- Для идентичного input → backtest/paper/live вызывают один и тот же `computeTotalCost()`
- Output fields идентичны (diff = 0 для cost полей)
- Единственное различие: market_context source (fixture vs live feed)

---

## Риски и гейты-ловушки

| Риск | Ловушка (гейт) |
|------|----------------|
| Inline PnL обходит cost_model | RG_REALISM02 grep scan |
| Backtest не использует cost_model | RG_REALISM03 parity E2E |
| fill_ratio=1.0 hardcoded | RG_REALISM04 partial fill E2E |
| Funding=0 всегда | RG_REALISM05 funding bounds E2E |
| Регрессии в существующих тестах | Все 51 baseline гейтов сохранены |

---

## Ожидаемые evidence артефакты

| Артефакт | Путь |
|----------|------|
| Cost Model Contract | `artifacts/contracts/COST_MODEL_CONTRACT_v2.json` |
| Research | `artifacts/research/EPOCH-S7/RESEARCH_PROFIT_REALISM.md` |
| Spec | `specs/roadmap_v2/SPRINT_7_PROFIT_REALISM_SPEC.md` |
| Audit | `reports/evidence/EPOCH-V2-S7-AUDIT/AUDIT_AFTER_SPRINT_7.md` |
| Baseline | `reports/evidence/EPOCH-V2-S7-BASELINE/` |
