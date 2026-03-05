# RESEARCH: Promotion Ladder (Sprint 8)

## Дата: 2026-03-05
## Контекст: CERT mode, offline

---

## Текущее состояние (Gap Summary)

### Что есть:
- **mode_fsm.mjs**: 5 режимов (OFF/PAPER/LIVE_SMALL/LIVE/DIAGNOSTIC)
- **rules_engine.mjs**: 3 governance mode (DRY_RUN/LIVE_TESTNET/LIVE_PRODUCTION)
- **kill_switch.mjs**: 4 условия (drawdown/reality_gap/exchange_errors/consecutive_losses)
- **safety_loop.mjs**: real-time evaluation + onFlatten/onPause/onReduce
- **position_sizer.mjs**: 3 тира (micro/small/normal)
- **canary_runner.mjs**: 5 сценариев fitness
- **truth_engine.mjs**: ALLOW/DEGRADED/HALT вердикты
- **DEPLOYMENT_GUIDE.md**: 5-этапный ladder документирован

### Что отсутствует:
1. Формализованные критерии промоушена (min trades, stability, Sharpe)
2. Автоматические canary limits (max exposure, max orders/min, max daily loss)
3. Escalation/rollback/flatten правила в promotion контексте
4. Fail-closed live policy (uncertainty -> PAUSE)
5. Promotion receipts (evidence)

---

## Option 1: MINIMAL

### Mechanism
- Статические критерии допуска для каждого перехода:
  - paper -> micro-live: min_trades >= 100, max_dd <= 5%, sharpe >= 0.5
  - micro-live -> small-live: min_trades >= 200, stability_days >= 7, sharpe >= 0.8
- Canary limits: max_exposure_usd, max_orders_per_min, max_daily_loss_pct
- Ручной промоушен через approval_workflow
- Kill switch = единственный rollback

### Assumptions
- [ASSUMPTION] Статические пороги достаточны для первой итерации
- [ASSUMPTION] Ручной промоушен приемлем

### Failure modes
- Нет автоматизации -> промоушен может быть пропущен или сделан преждевременно
- Статические пороги не учитывают рыночный режим

### Offline proof strategy
- Contract check: criteria schema valid
- Unit test: criteria met -> PROMOTE_ELIGIBLE, not met -> BLOCKED

### Impact/Cost/Risk
- Impact: 5/10
- Cost: 3/10
- Risk: 2/10

---

## Option 2: BALANCED (TARGET)

### Mechanism

#### Promotion Contract
- Формализованные критерии для каждого перехода:
  ```
  paper -> micro-live:
    min_trades: 100
    stability_window_days: 14
    max_drawdown: 0.05
    sharpe: 0.5
    win_rate: 0.45

  micro-live -> small-live:
    min_trades: 200
    stability_window_days: 7
    max_drawdown: 0.03
    sharpe: 0.8
    deflated_sharpe: 0.3
    robustness_score: 0.6
  ```
- Оценка через "суд" (court_v2 pattern): metrics -> criteria -> verdict

#### Canary Policy
- Max exposure: per-stage caps (micro: $100, small: $1000)
- Max orders/min: 10 (hard limit)
- Max daily loss: per-stage (micro: $10, small: $100)
- Pause-on-uncertainty: if any metric missing -> PAUSE
- Kill switch integration: existing matrix + canary-specific triggers

#### Escalation Policy
- REDUCE: drawdown > stage_dd_limit * 0.7 -> downgrade tier
- PAUSE: drawdown > stage_dd_limit * 0.9 OR uncertainty -> stop new orders
- FLATTEN: drawdown > stage_dd_limit OR kill switch trigger -> close all
- Rollback: FLATTEN in micro-live -> return to paper + 24h cooldown
- Evidence: ROLLBACK_RECEIPT.md с reason_code

#### Promotion Receipts
- PROMOTION_DECISION.md: criteria evaluated, verdict, evidence
- CANARY_STATE.md: current limits, violations, state
- ROLLBACK_RECEIPT.md: when/why/what

### Assumptions
- [ASSUMPTION] Deflated Sharpe из unified_sharpe.mjs адекватен
- [ASSUMPTION] Robustness score = multi-seed consistency (уже есть e2e_multi_seed)

### Failure modes
- Deflated Sharpe может быть слишком строгим для micro-live
- Robustness score требует данных из walk-forward

### Offline proof strategy
- Contract check: PromotionContract schema valid
- E2E: scenario meets criteria -> verdict = PROMOTE_ELIGIBLE
- E2E: scenario fails criteria -> verdict = BLOCKED
- E2E: canary violation -> PAUSE triggered
- E2E: daily loss exceeded -> REDUCE/FLATTEN

### Impact/Cost/Risk
- Impact: 8/10
- Cost: 5/10
- Risk: 3/10

---

## Option 3: RADICAL

### Mechanism
- Multi-objective promotion: Pareto frontier across Sharpe/DD/robustness
- Stress scenarios: replay historical crashes as promotion gate
- Portfolio-level promotion (не per-strategy, а portfolio robustness)
- Automated promotion scheduler с time-based gates

### Assumptions
- [ASSUMPTION] Historical crash data доступна (CERT: нет)
- [ASSUMPTION] Portfolio-level logic реализована

### Failure modes
- Data dependency: CERT mode -> нет crash data
- Over-engineering: portfolio logic не нужна для single-strategy
- Complexity: Pareto frontier требует solver

### Impact/Cost/Risk
- Impact: 9/10
- Cost: 9/10
- Risk: 7/10

---

## Сравнительная таблица

| Критерий | MINIMAL | BALANCED | RADICAL |
|----------|---------|----------|---------|
| Impact | 5 | 8 | 9 |
| Cost | 3 | 5 | 9 |
| Risk | 2 | 3 | 7 |
| Offline feasibility | HIGH | HIGH | LOW |
| Automation | NONE | PARTIAL | FULL |
| verify:fast budget | +0 gates | +2 gates | +5 gates |
| Data dependency | NONE | NONE | HIGH |

---

## Рекомендация

**Option 2: BALANCED** -- формализованные критерии + canary policy + fail-closed.

Причины:
1. Покрывает все обязательные темы (promotion/canary/escalation/rollback)
2. Интегрируется с существующим kill_switch и safety_loop
3. Fail-closed: uncertainty -> PAUSE (safety first)
4. Promotion receipts для audit trail
5. verify:fast budget: +2 gates (в рамках лимита)
