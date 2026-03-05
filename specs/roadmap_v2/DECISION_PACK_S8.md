# DECISION PACK -- Sprint 8: Promotion Ladder

## Дата: 2026-03-05
## Статус: APPROVED

---

## Выбранный вариант: Option 2 -- BALANCED

### Обоснование
1. Формализованные критерии промоушена с court-style evaluation
2. Canary policy интегрируется с существующим kill_switch/safety_loop
3. Fail-closed: uncertainty -> PAUSE
4. Promotion receipts для audit trail
5. verify:fast budget: +2 gates

### Отвергнутые варианты
- **MINIMAL**: недостаточно -- нет автоматизации, нет canary limits
- **RADICAL**: data dependency (crash data), over-engineering для single-strategy

---

## NON-GOALS
1. Multi-objective Pareto promotion
2. Portfolio-level promotion (single strategy scope)
3. Stress scenario replay (нет fixture data)
4. Automated promotion scheduler (ручной trigger)
5. Multi-level approval routing

---

## verify:fast Gate Budget

Текущий бюджет: 53 gates (after S7)
Добавляем: +2 gates
Итого: 55 gates

| Новый гейт | Тип | Описание |
|------------|-----|----------|
| RG_PROMO01_CONTRACT_VALID | import/schema | promotion_ladder exports evaluatePromotion; schema valid |
| RG_CANARY01_POLICY_CONTRACT | import/schema | canary_policy exports evaluateCanary; limits schema valid |

---

## verify:deep E2E тесты

| Новый тест | Описание |
|-----------|----------|
| RG_PROMO_E2E01_PAPER_TO_MICROLIVE | meets criteria -> PROMOTE_ELIGIBLE |
| RG_PROMO_E2E02_FAILCLOSED_UNCERTAINTY | uncertainty -> PAUSE |
| RG_CANARY_E2E01_DAILY_LOSS_TRIGGER | daily loss exceeded -> REDUCE/FLATTEN |
| RG_CANARY_E2E02_ORDER_RATE_LIMIT | orders/min exceeded -> PAUSE |

---

## Новые контракты/инварианты

### PROMOTION_CONTRACT
```
evaluatePromotion({ current_stage, metrics, config }) =>
{
  eligible: boolean,
  verdict: 'PROMOTE_ELIGIBLE' | 'BLOCKED' | 'INSUFFICIENT_DATA',
  target_stage: string,
  criteria_results: [{ criterion, required, actual, pass }],
  reason_code: string,
  evidence_summary: string
}
```

### CANARY_POLICY_CONTRACT
```
evaluateCanary({ metrics, limits, state }) =>
{
  action: 'CONTINUE' | 'REDUCE' | 'PAUSE' | 'FLATTEN',
  violations: [{ limit_name, limit_value, actual_value, severity }],
  reason_code: string,
  new_state: { ordersPaused, currentTier }
}
```

---

## Риски и гейты-ловушки

| Риск | Ловушка (гейт) |
|------|----------------|
| Промоушен без criteria check | RG_PROMO01 contract |
| Canary limits не enforced | RG_CANARY01 contract |
| Paper -> micro-live без evidence | RG_PROMO_E2E01 |
| Uncertainty не вызывает PAUSE | RG_PROMO_E2E02 |
| Daily loss не триггерит rollback | RG_CANARY_E2E01 |
| Order rate не лимитирован | RG_CANARY_E2E02 |

---

## Ожидаемые evidence артефакты

| Артефакт | Путь |
|----------|------|
| Research | `artifacts/research/EPOCH-S8/RESEARCH_PROMOTION_LADDER.md` |
| Spec | `specs/roadmap_v2/SPRINT_8_PROMOTION_LADDER_SPEC.md` |
| Audit | `reports/evidence/EPOCH-V2-S8-AUDIT/AUDIT_AFTER_SPRINT_8.md` |
| Promotion Contract | `artifacts/contracts/PROMOTION_CONTRACT_v1.json` |
| Canary Contract | `artifacts/contracts/CANARY_POLICY_CONTRACT_v1.json` |
