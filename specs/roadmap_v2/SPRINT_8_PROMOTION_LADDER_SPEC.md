# SPRINT 8: PROMOTION LADDER -- SPEC

## Дата: 2026-03-05
## Статус: APPROVED
## Decision Pack: `specs/roadmap_v2/DECISION_PACK_S8.md`

---

## 1. ЦЕЛЬ

Формализовать и внедрить лестницу допуска (paper -> micro-live -> scale).
Переходы между режимами только через суд и доказательства.

---

## 2. PROMOTION_CONTRACT

### 2.1 Interface

```javascript
// core/promotion/promotion_ladder.mjs
export function evaluatePromotion({ current_stage, metrics, config }) => PromotionResult
```

### 2.2 PromotionResult Schema

```javascript
{
  eligible: boolean,
  verdict: 'PROMOTE_ELIGIBLE' | 'BLOCKED' | 'INSUFFICIENT_DATA',
  target_stage: string,         // next stage if eligible
  criteria_results: [{
    criterion: string,          // e.g. 'min_trades'
    required: number|string,
    actual: number|string,
    pass: boolean
  }],
  reason_code: string,          // 'NONE' | 'CRITERIA_NOT_MET' | 'INSUFFICIENT_DATA'
  evidence_summary: string
}
```

### 2.3 Stages

| Stage | Description | Next |
|-------|-------------|------|
| paper | Paper trading simulation | micro_live |
| micro_live | Real trading, minimal size | small_live |
| small_live | Real trading, small size | live |
| live | Full production | N/A |

### 2.4 Promotion Criteria

#### paper -> micro_live
| Criterion | Required |
|-----------|----------|
| min_trades | >= 100 |
| stability_window_days | >= 14 |
| max_drawdown | <= 0.05 (5%) |
| sharpe | >= 0.5 |
| win_rate | >= 0.45 |

#### micro_live -> small_live
| Criterion | Required |
|-----------|----------|
| min_trades | >= 200 |
| stability_window_days | >= 7 |
| max_drawdown | <= 0.03 (3%) |
| sharpe | >= 0.8 |
| robustness_score | >= 0.6 |

#### small_live -> live
| Criterion | Required |
|-----------|----------|
| min_trades | >= 500 |
| stability_window_days | >= 30 |
| max_drawdown | <= 0.02 (2%) |
| sharpe | >= 1.0 |
| robustness_score | >= 0.7 |
| deflated_sharpe | >= 0.3 |

### 2.5 Insufficient Data Policy
Если любой required metric = undefined/null -> verdict = INSUFFICIENT_DATA (fail-closed).

---

## 3. CANARY_POLICY_CONTRACT

### 3.1 Interface

```javascript
// core/promotion/canary_policy.mjs
export function evaluateCanary({ metrics, limits, state }) => CanaryResult
```

### 3.2 CanaryResult Schema

```javascript
{
  action: 'CONTINUE' | 'REDUCE' | 'PAUSE' | 'FLATTEN',
  violations: [{
    limit_name: string,
    limit_value: number,
    actual_value: number,
    severity: 'WARNING' | 'CRITICAL'
  }],
  reason_code: string,
  new_state: {
    ordersPaused: boolean,
    currentTier: string
  }
}
```

### 3.3 Canary Limits (per stage)

| Limit | micro_live | small_live | live |
|-------|-----------|-----------|------|
| max_exposure_usd | 100 | 1000 | 10000 |
| max_orders_per_min | 5 | 10 | 20 |
| max_daily_loss_usd | 10 | 100 | 500 |
| max_daily_loss_pct | 0.02 | 0.03 | 0.05 |
| max_open_positions | 1 | 3 | 10 |

### 3.4 Action Logic

```
if any CRITICAL violation:
  if daily_loss exceeded -> FLATTEN
  else -> PAUSE

if any WARNING violation:
  -> REDUCE (downgrade tier)

if no violations:
  -> CONTINUE
```

### 3.5 Fail-closed: Uncertainty -> PAUSE
- Если metrics.daily_loss === undefined -> PAUSE (не CONTINUE)
- Если metrics.exposure === undefined -> PAUSE
- Любое отсутствие данных = PAUSE

---

## 4. ESCALATION POLICY

### 4.1 core/promotion/escalation_policy.mjs

```javascript
export function evaluateEscalation({ current_action, duration_ms, config }) =>
  { action: 'CONTINUE' | 'REDUCE' | 'PAUSE' | 'FLATTEN', escalated: boolean }
```

### 4.2 Escalation Rules
- REDUCE for > 30 min -> PAUSE
- PAUSE for > 60 min -> FLATTEN
- FLATTEN in micro_live -> rollback to paper + 24h cooldown

### 4.3 Rollback
- FLATTEN trigger -> generate ROLLBACK_RECEIPT.md
- Return to previous stage
- Cooldown: 24h before re-promotion

---

## 5. EVIDENCE RECEIPTS

### 5.1 PROMOTION_DECISION.md
Generated when evaluatePromotion is called:
```
# PROMOTION_DECISION
- timestamp: <ISO>
- from_stage: paper
- to_stage: micro_live
- verdict: PROMOTE_ELIGIBLE
- criteria: [pass/fail per criterion]
- evidence_hash: <sha256>
```

### 5.2 CANARY_STATE.md
Generated periodically:
```
# CANARY_STATE
- stage: micro_live
- limits: { ... }
- violations: [...]
- action: CONTINUE
```

### 5.3 ROLLBACK_RECEIPT.md
Generated on FLATTEN/rollback:
```
# ROLLBACK_RECEIPT
- timestamp: <ISO>
- from_stage: micro_live
- to_stage: paper
- reason_code: DAILY_LOSS_EXCEEDED
- cooldown_until: <ISO>
```

---

## 6. GATES

### 6.1 FAST (+2 gates, итого 55)

| ID | Тип | Описание |
|----|-----|----------|
| RG_PROMO01_CONTRACT_VALID | import/schema | promotion_ladder exports evaluatePromotion; criteria schema valid |
| RG_CANARY01_POLICY_CONTRACT | import/schema | canary_policy exports evaluateCanary; limits schema valid |

### 6.2 DEEP (+4 E2E)

| ID | Описание |
|----|----------|
| RG_PROMO_E2E01_PAPER_TO_MICROLIVE | meets criteria -> PROMOTE_ELIGIBLE |
| RG_PROMO_E2E02_FAILCLOSED_UNCERTAINTY | missing metrics -> PAUSE |
| RG_CANARY_E2E01_DAILY_LOSS_TRIGGER | daily loss exceeded -> FLATTEN |
| RG_CANARY_E2E02_ORDER_RATE_LIMIT | orders/min exceeded -> PAUSE |

---

## 7. DoD (Definition of Done)

| # | Критерий | Проверка |
|---|---------|----------|
| S8-DoD-1 | `core/promotion/promotion_ladder.mjs` exists + exports evaluatePromotion | RG_PROMO01 |
| S8-DoD-2 | `core/promotion/canary_policy.mjs` exists + exports evaluateCanary | RG_CANARY01 |
| S8-DoD-3 | Promotion criteria schema valid for all stages | RG_PROMO01 |
| S8-DoD-4 | Canary limits schema valid for all stages | RG_CANARY01 |
| S8-DoD-5 | Paper -> micro_live: criteria met -> PROMOTE_ELIGIBLE | RG_PROMO_E2E01 |
| S8-DoD-6 | Missing metrics -> INSUFFICIENT_DATA (fail-closed) | RG_PROMO_E2E02 |
| S8-DoD-7 | Daily loss exceeded -> FLATTEN | RG_CANARY_E2E01 |
| S8-DoD-8 | Order rate limit enforced -> PAUSE | RG_CANARY_E2E02 |
| S8-DoD-9 | All 53 baseline gates PASS (regression) | verify:fast |
| S8-DoD-10 | verify:fast x2 PASS (anti-flake) | standard |
| S8-DoD-11 | e108 x2 PASS (determinism) | standard |
| S8-DoD-12 | verify:deep PASS | standard |
