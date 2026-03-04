# SPRINT 5: PROFIT LANE WIRING

> Подключить kill switch, position sizer, reconciliation к live trading loop.
> Сделать safety infrastructure "живой", а не mock-only.

**Предыдущий спринт:** Sprint 4 (ND-EXORCISM) — 58 gates
**Ожидаемый gate count:** 58 → 64 (+6 гейтов)
**Длительность:** 3–5 дней
**Write-scope:** `core/**`, `scripts/**`, `specs/roadmap_v2/**`
**Prerequisite:** Sprint 4 COMPLETE, все P0 закрыты

---

## 1. КОНТЕКСТ

Sprint 3 (v1) создал инфраструктуру profit lane:
- Kill switch matrix (4 conditions, 3 actions) ✓
- Kill switch evaluator ✓
- Fill reconciliation engine ✓
- Position sizer (tier enforcement) ✓
- Emergency flatten ✓

**Проблема:** Всё работает изолированно. Ничего не подключено к live loop.
Оператор не может полагаться на автоматическую защиту.

---

## 2. SCOPE

### 2.1 Kill Switch → Live Loop Wiring

| ID | Задача | Файлы |
|----|--------|-------|
| WIRE-KS-01 | Создать `core/live/safety_loop.mjs` — вызывает kill switch evaluator каждые N секунд | CREATE |
| WIRE-KS-02 | Интегрировать safety_loop в main runner | MODIFY runner |
| WIRE-KS-03 | При trigger FLATTEN → вызвать emergency_flatten | WIRE |
| WIRE-KS-04 | При trigger PAUSE → остановить order placement, продолжить мониторинг | WIRE |

### 2.2 Position Sizer → Order Placement

| ID | Задача | Файлы |
|----|--------|-------|
| WIRE-PS-01 | Интегрировать position_sizer.enforceTier() перед каждым order в adapters | MODIFY adapters |
| WIRE-PS-02 | Rejected orders (tier violation) → log + EventLog entry | MODIFY |
| WIRE-PS-03 | Position sizer получает реальный equity (не hardcoded) | MODIFY |

### 2.3 Reconciliation → Exchange Adapter

| ID | Задача | Файлы |
|----|--------|-------|
| WIRE-RC-01 | Reconcile вызывается после каждого fill batch | WIRE |
| WIRE-RC-02 | При drift > threshold → EventLog WARNING | WIRE |
| WIRE-RC-03 | При missing fills → EventLog ALERT + kill switch input | WIRE |

### 2.4 E2E Regression

| ID | Задача |
|----|--------|
| E2E-01 | E2E тест: mock trade → kill switch trigger → flatten → verify positions=0 |
| E2E-02 | E2E тест: order → sizer reject (tier violation) → order не размещён |
| E2E-03 | E2E тест: fill → reconcile → drift detected → warning logged |

---

## 3. ИНВАРИАНТЫ

| ID | Инвариант | Как проверить |
|----|-----------|--------------|
| INV-S5-1 | Kill switch evaluator вызывается из safety_loop | grep/AST: safety_loop imports + calls evaluateKillSwitch |
| INV-S5-2 | FLATTEN trigger → emergency_flatten вызван | E2E тест |
| INV-S5-3 | Position sizer вызывается перед КАЖДЫМ order placement | grep/AST: adapter imports + calls enforceTier |
| INV-S5-4 | Tier violation → order NOT placed + log entry | E2E тест |
| INV-S5-5 | Reconcile вызывается после fill batch | grep/AST: fill handler calls reconcile |
| INV-S5-6 | verify:fast x2 PASS | Стандартная |
| INV-S5-7 | e108 x2 PASS | Стандартная |

---

## 4. REGRESSION GATES (6 новых)

| # | Gate ID | Что проверяет | Тип |
|---|---------|--------------|-----|
| 1 | `regression_profit_ks_wired01` | safety_loop imports + calls evaluateKillSwitch | AST/grep (verify:fast) |
| 2 | `regression_profit_ks_flatten01` | FLATTEN trigger → emergency_flatten call chain | AST/grep (verify:fast) |
| 3 | `regression_profit_sizer_wired01` | adapter calls enforceTier before placeOrder | AST/grep (verify:fast) |
| 4 | `regression_profit_recon_wired01` | fill handler calls reconcile | AST/grep (verify:fast) |
| 5 | `regression_profit_e2e_ks01` | E2E: trigger → flatten → positions=0 | verify:deep |
| 6 | `regression_profit_e2e_sizer01` | E2E: tier violation → order rejected | verify:deep |

**Примечание:** Gates 5-6 идут в verify:deep (тяжёлые), не в verify:fast.

---

## 5. PROFIT REALISM GAPS (ASSUMPTION)

> Следующие аспекты НЕ в scope Sprint 5, но документируются как risk:

| Gap | Описание | Sprint |
|-----|---------|--------|
| Fees | Backtest не учитывает maker/taker fees | S8 (RADICAL) |
| Slippage | Backtest не моделирует проскальзывание | S8 |
| Funding | Нет funding rate в PnL | S8 |
| Latency | Order-to-fill latency не учитывается | S8 |

**INFERENCE/LOW TRUST:** Без real exchange data (нужна сеть) нельзя точно
оценить реалистичность profit lane. Это отложено до S7 (LIVE_ADAPTER_V2).

---

## 6. RISKS

| Риск | Вероятность | Импакт | Митигация |
|------|-----------|--------|-----------|
| safety_loop блокирует event loop | Средняя | Зависание | Использовать setInterval, не while(true) |
| Position sizer reject корректных orders | Средняя | Упущенная прибыль | Тщательная калибровка тиров + override механизм |
| Reconcile false positive | Средняя | Ложные alerts | Threshold calibration + debounce |
| E2E тесты flaky | Высокая | CI нестабильность | Deterministic mock adapter + seeded RNG (Sprint 4 fix) |

---

## 7. DoD

- [ ] Kill switch evaluator вызывается из safety_loop (wired)
- [ ] FLATTEN trigger → emergency_flatten → positions=0
- [ ] Position sizer enforceTier перед каждым order
- [ ] Tier violation → order rejected + EventLog entry
- [ ] Reconcile после каждого fill batch
- [ ] Drift detection → warning logged
- [ ] 6 новых regression gates PASS
- [ ] Все pre-existing gates PASS (58+)
- [ ] verify:fast x2 PASS
- [ ] e108 x2 PASS
- [ ] Total gates: 64 PASS
- [ ] Performance: ms_per_gate <= 80ms

---

## 8. EXECUTION ORDER

```
Step 1: Создать core/live/safety_loop.mjs (WIRE-KS-01)
Step 2: Интегрировать safety_loop в runner (WIRE-KS-02, KS-03, KS-04)
Step 3: Интегрировать position sizer в adapter (WIRE-PS-01..03)
Step 4: Интегрировать reconcile в fill handler (WIRE-RC-01..03)
Step 5: Создать E2E тесты (E2E-01..03)
Step 6: Создать 6 regression gate scripts
Step 7: Подключить гейты к verify:fast + verify:deep
Step 8: npm run -s verify:fast x2
Step 9: node scripts/verify/e108_backtest_determinism_x2_contract.mjs x2
Step 10: Аудит (AUDIT_AFTER_SPRINT_5.md)
```

---

## 9. ROLLBACK

```
git checkout HEAD -- core/live/safety_loop.mjs  # удалить
git stash  # сохранить wiring changes
git checkout HEAD -- core/  # откатить
npm run -s verify:fast  # подтвердить 58/58
```
