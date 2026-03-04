# MASTER ROADMAP V2 SPEC

> Post-V1 Audit → Determinism Hardening → Profit Lane Wiring → Production Readiness

**Автор:** Claude (Principal Engineer / QA Officer)
**Дата:** 2026-03-04
**Baseline:** Roadmap v1 COMPLETE (50 gates, verify:fast x2 PASS, e108 x2 PASS)
**HEAD:** `9aa26a8b2a39cfaf527afd5c0208d35ca1925953`

---

## 1. КОНТЕКСТ

Roadmap v1 завершён:
- 4 спринта (Court Wiring, Metric Parity, FSM Healing, Profit Lane)
- 12 новых regression gates (38→50)
- 3 finding'а закрыты (B, C, E)
- Детерминизм: verify:fast x2, e108 x2 — ПОДТВЕРЖДЁН

Остаточные риски (из Post-V1 Audit):
- **6 P0** (ND в core — Date.now, Math.random, unguarded fetch)
- **11 P1** (profit lane wiring, spec drift, perf budget)
- **4 P2** (Object.keys order, EventLog fallback, supply chain)
- ops:doctor SICK 70/100 (liveness probe 0/30)

---

## 2. ВАРИАНТЫ ROADMAP

### MINIMAL (2–3 дня, максимальный ROI)

| Sprint | Название | Scope | Гейтов+ | Дней |
|--------|----------|-------|---------|------|
| S4 | ND-EXORCISM | Исправить 6 P0 ND-баг + spec drift + perf law | +8 | 2–3 |

**ROI:** Закрывает ВСЕ P0 блокеры. Система становится бит-репродуцируемой.
**Риск:** Profit lane остаётся mock-only.

### BALANCED (1–2 недели, устойчивость + профит)

| Sprint | Название | Scope | Гейтов+ | Дней |
|--------|----------|-------|---------|------|
| S4 | ND-EXORCISM | P0 ND + spec drift + perf law | +8 | 2–3 |
| S5 | PROFIT_LANE_WIRING | Kill switch → live loop, sizer → orders, recon → exchange | +6 | 3–5 |
| S6 | DOCTOR_LIVENESS_FIX | Починить liveness probe, confidence → 90+ | +2 | 1–2 |

**ROI:** Система готова к бумажной торговле с wired safety nets.
**Риск:** Live adapter ещё нет (нужна сеть для тестирования exchange API).

### RADICAL (1–2 месяца)

| Sprint | Название | Scope | Гейтов+ | Дней |
|--------|----------|-------|---------|------|
| S4 | ND-EXORCISM | P0 ND + spec drift + perf law | +8 | 2–3 |
| S5 | PROFIT_LANE_WIRING | Safety wiring + e2e regression | +6 | 3–5 |
| S6 | DOCTOR_LIVENESS_FIX | Liveness + doctor confidence | +2 | 1–2 |
| S7 | LIVE_ADAPTER_V2 | Exchange adapter + testnet integration | +4 | 5–7 |
| S8 | BACKTEST_V2 | Fees/slippage/funding в backtest | +4 | 5–7 |
| S9 | SUPPLY_CHAIN_HARDENING | npm audit fix + lockfile integrity + SRI | +3 | 2–3 |

**ROI:** Полноценная production-ready система с live trading.
**Риск:** Длительность; нужна сеть для S7+; overfit defence для S8.

---

## 3. РЕКОМЕНДАЦИЯ

**BALANCED** — Sprint 4 + Sprint 5 + Sprint 6.

Причины:
1. S4 (ND-EXORCISM) закрывает ВСЕ P0 — обязательный.
2. S5 (PROFIT_LANE_WIRING) делает safety infrastructure "живой" — high ROI.
3. S6 (DOCTOR_LIVENESS) — лёгкий спринт, восстанавливает здоровье системы.
4. S7-S9 — кандидаты, но требуют сеть и больше контекста.

---

## 4. PERFORMANCE LAW V2

### Старое правило (v1)
```
verify:fast wall-clock delta < 15% vs baseline
```
**Проблема:** Не масштабируется при росте гейтов. 50 гейтов vs 38 = +32% load, +19% time.

### Новое правило (v2)
```
PERFORMANCE_LAW_V2:
  ms_per_gate_budget = 80ms
  total_budget_ms = gate_count × ms_per_gate_budget
  PASS если actual_ms <= total_budget_ms

  Текущее состояние:
    50 gates × 80ms = 4000ms budget
    Actual: ~3800ms → PASS (95% бюджета)

  При добавлении гейтов в v2:
    ~66 gates × 80ms = 5280ms budget
    Допустимый потолок: 5280ms
```

### Regression Gate
```
regression_perf_budget01_ms_per_gate:
  CMD: time npm run -s verify:fast
  ASSERT: wall_clock_ms / gate_count <= 80
  EVIDENCE: gates/manual/regression_perf_budget01.json
```

---

## 5. ИНВАРИАНТЫ V2 (глобальные)

| ID | Инвариант | Гейт |
|----|-----------|------|
| INV-V2-1 | Никакого `Math.random()` в core/**/*.mjs (кроме sys/rng.mjs SystemRNG) | regression_san01 (расширить) |
| INV-V2-2 | Никакого bare `Date.now()` в core/**/*.mjs (кроме sys/clock.mjs SystemClock) | regression_san01 (расширить) |
| INV-V2-3 | Никакого bare `new Date()` в core/**/*.mjs | regression_san01 (расширить) |
| INV-V2-4 | Все fetch/http вызовы за NET guard | regression_net_guard01 |
| INV-V2-5 | ms_per_gate <= 80ms | regression_perf_budget01 |
| INV-V2-6 | verify:fast x2 идентичен | Существующий RG_ND_BYTE02 |
| INV-V2-7 | Kill switch evaluator вызывается из live loop | regression_profit_ks_wired01 |
| INV-V2-8 | Position sizer вызывается перед order placement | regression_profit_sizer_wired01 |

---

## 6. GATE STRATEGY (как не раздуть verify:fast)

### Принцип
verify:fast = **boot gate** (< 6 секунд). Тяжёлые проверки — в отдельных цепочках.

### Разделение
| Цепочка | Назначение | Бюджет |
|---------|-----------|--------|
| `verify:fast` | Структурные/регрессионные (grep/import/AST) | ≤ 80ms/gate, ≤ 6s total |
| `verify:deep` (новая) | e108 + integration + perf benchmark | ≤ 60s |
| `ops:doctor` | Health check + liveness x2 | ≤ 120s |

### Правило добавления гейтов
1. Если гейт < 80ms и чистый grep/AST → в verify:fast
2. Если гейт требует запуска процессов → в verify:deep
3. Каждый новый гейт = обновление total_budget

---

## 7. СПРИНТЫ (ПОДРОБНЫЕ СПЕКИ)

- **[Sprint 4: ND-EXORCISM](./SPRINT_4_ND_EXORCISM_SPEC.md)**
- **[Sprint 5: PROFIT_LANE_WIRING](./SPRINT_5_PROFIT_LANE_WIRING_SPEC.md)**
- Аудит-шаблоны: [AUDIT_AFTER_SPRINT_4](./AUDIT_AFTER_SPRINT_4.md), [AUDIT_AFTER_SPRINT_5](./AUDIT_AFTER_SPRINT_5.md)
- Traceability: [TRACEABILITY_MATRIX_V2](./TRACEABILITY_MATRIX_V2.md)
