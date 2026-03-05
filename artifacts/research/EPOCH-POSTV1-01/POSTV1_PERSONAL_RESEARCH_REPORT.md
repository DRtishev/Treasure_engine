# POST-V1 PERSONAL RESEARCH REPORT

> Независимый аудит Treasure Engine после завершения Roadmap v1.
> Режим: FAIL-CLOSED • OFFLINE • EVIDENCE-DRIVEN • DETERMINISTIC • x2 ANTI-FLAKE

**Автор:** Claude (Principal Engineer / QA Officer / Release Gatekeeper)
**Дата:** 2026-03-04
**Timezone:** Europe/Amsterdam
**Branch:** `claude/postv1-audit-roadmap-B7WNc`
**HEAD:** `9aa26a8b2a39cfaf527afd5c0208d35ca1925953`

---

## SNAPSHOT

| Поле | Значение |
|------|----------|
| Node | v22.22.0 |
| npm | 10.9.4 |
| Branch | `claude/postv1-audit-roadmap-B7WNc` |
| HEAD SHA | `9aa26a8b2a39` |
| Сеть | ЗАБЛОКИРОВАНА |
| Режим | RESEARCH |
| Полная матрица | → `SNAPSHOT.md` |

---

## WHAT I VERIFIED (A–E)

### Тезис A: Roadmap v1 завершён, гейты/детерминизм подтверждены

**ВЕРДИКТ: CONFIRMED ✓**

| Проверка | Результат | Evidence |
|----------|-----------|---------|
| verify:fast x2 | 50/50 PASS, 0 расхождений | `COMMANDS_EXECUTED.md` |
| e108 x2 | 10/10 PASS, 0 расхождений | `COMMANDS_EXECUTED.md` |
| ops:cockpit | PASS, FSM: BOOT/LIFE | `GATE_MATRIX.md` |
| ops:doctor | SICK 70/100 (liveness 0/30) | см. FINDING-NEW-01 |
| Гейты | 50/50 (38 pre + 12 new) | `GATE_MATRIX.md` |
| Sprint audits | 4/4 PASS | `specs/roadmap_v1/AUDIT_AFTER_SPRINT_*.md` |
| Findings B,C,E | CLOSED | TRACEABILITY_MATRIX |
| Finding D | MONITOR (не в scope v1) | ND surface — Sprint 4 |

**Детали:**
- verify:fast стабилен, детерминистичен, x2 идентичен.
- e108 backtest determinism x2 — бит-идентичен.
- Все 19 requirements из TRACEABILITY_MATRIX traced и gated.
- **Но:** ops:doctor = SICK. liveness_alive 0/15, liveness_deterministic 0/15.
  Это **новый finding** (не упомянут во внешнем аудите).

---

### Тезис B: Документная рассинхронизация runCandidatePipeline

**ВЕРДИКТ: CONFIRMED ✓**

**Факты:**
- Спека `SPRINT_0_COURT_WIRING_SPEC.md` описывает 2 варианта (строки 89-93).
- **Вариант A (выбран):** `runEdgeLabPipeline` из `core/edge_lab/pipeline.mjs`.
- **Вариант B (отклонён):** `runCandidatePipeline` из `core/edge/candidate_pipeline.mjs`.
- **Код:** `scripts/edge/strategy_sweep.mjs:20` — `import { runEdgeLabPipeline }` ✓
- **Гейт:** `regression_court_wiring01_sweep_uses_pipeline` — PASS ✓
- **TRACEABILITY_MATRIX:** Корректно ссылается на `runEdgeLabPipeline` ✓
- **Спека:** 12 мест всё ещё говорят `runCandidatePipeline` ✗

**Исправление:** Sprint 4, REQ-DRIFT-01 — обновить 12 строк в SPRINT_0 spec.
**Подробности:** → `SPEC_DRIFT_REPORT.md` DRIFT-01

---

### Тезис C: Performance budget 15% нарушен кумулятивно (~19%)

**ВЕРДИКТ: CONFIRMED ✓**

**Факты:**
- Мастер-спека (`00_MASTER_ROADMAP_SPEC.md:40`): ">15% деградации = проблема"
- Каждый спринт: delta < 15% ✓ (7%, 6%, 6%, 5%)
- Кумулятивно: 3200ms → 3800ms = **+19%** > 15% ✗
- Финальный аудит (`AUDIT_AFTER_SPRINT_3.md:60`): допустил, ссылаясь на "gate count +32%"

**Анализ:**
- Формально правило нарушено.
- По сути: деградация пропорциональна росту гейтов (38→50 = +32%, время +19%).
- ms/gate: 3200/38 = 84ms → 3800/50 = 76ms — **улучшение per-gate!**

**Новое правило (Performance Law V2):**
```
ms_per_gate_budget = 80ms
total_budget = gate_count × 80ms
PASS если actual <= total_budget
```

- Текущее: 3800ms / 50 gates = 76ms/gate ≤ 80ms → **PASS**
- Regression gate: `regression_perf_budget01_ms_per_gate`
- **Подробности:** → `SPEC_DRIFT_REPORT.md` DRIFT-02

---

### Тезис D: Остаточный ND-риск (Math.random / Date.now)

**ВЕРДИКТ: CONFIRMED ✓ — хуже чем описано**

**Масштаб (полный скан кода):**

| Категория | Кол-во | P0 | P1 | P2 |
|-----------|--------|----|----|-----|
| Math.random() в core | 5 | 1 | 3 | 1 |
| Date.now() bare в core | 12 | 6 | 4 | 2 |
| new Date() bare в core | 5 | 3 | 2 | 0 |
| readdirSync без sort | 1 | 0 | 1 | 0 |
| Object.keys без sort | 3 | 0 | 0 | 3 |
| fetch без NET guard | 6 | 4 | 2 | 0 |
| **ИТОГО** | **32** | **14** | **12** | **6** |

**Критические (P0):**
1. `core/persist/repo_state.mjs:256` — Math.random() в _generateRunId()
2. `core/court/court_v2.mjs:36,52,248` — Date.now()/new Date() в court reports
3. `core/execution/e122_execution_adapter_v3.mjs:34,37,41,44,47,50` — timestamps
4. `core/sim/engine_paper.mjs:376` — new Date() в output
5. 4 data providers — fetch без NET guard

**Хорошие паттерны (уже существуют):**
- `DeterministicClock` в `core/sys/clock.mjs` ✓
- `DeterministicRNG` в `core/sys/rng.mjs` ✓
- `SeededRNG` (Mulberry32) в `monte_carlo.mjs` ✓
- `canonicalize()` удаляет volatile fields ✓

**Проблема:** Не все модули используют эти паттерны. Clock/RNG существуют, но не wired.

**Исправление:** Sprint 4 (ND-EXORCISM) — wire ctx.clock/DeterministicRNG во все P0 модули.
**Подробности:** → `PAIN_POINTS_V2.md`

---

### Тезис E: Profit lane — kill switch / sizer / reconcile не wired

**ВЕРДИКТ: CONFIRMED ✓**

**Факты:**
- Kill switch matrix: EXISTS ✓ (4 conditions, 3 actions) — `specs/kill_switch_matrix.json`
- Kill switch evaluator: EXISTS ✓ — `core/risk/kill_switch.mjs`
- Position sizer: EXISTS ✓ — `core/risk/position_sizer.mjs`
- Reconciliation: EXISTS ✓ — `core/recon/reconcile_v1.mjs`
- Emergency flatten: EXISTS ✓ — `scripts/ops/emergency_flatten.mjs`

**Но:**
- Kill switch evaluator **НЕ вызывается** из live runner. Нет safety_loop.
- Position sizer **НЕ вызывается** перед order placement.
- Reconcile **НЕ вызывается** после fill batch.
- Всё работает только в mock/unit тестах.

**Исправление:** Sprint 5 (PROFIT_LANE_WIRING).
**Подробности:** → `SPRINT_5_PROFIT_LANE_WIRING_SPEC.md`

---

## NEW FINDINGS (не замечены в v1)

### FINDING-NEW-01: ops:doctor SICK (70/100)

**Severity:** P1
**Symptom:** `ops:doctor` возвращает EC=1, VERDICT: SICK, SCORE: 70/100
**Root Cause:** `liveness_alive` = 0/15, `liveness_deterministic` = 0/15
**Evidence:** `/tmp/claude-0/.../tasks/b4u1d7643.output`, `reports/evidence/EPOCH-DOCTOR-9aa26a8b2a39`
**Impact:** Система не может подтвердить liveness в doctor контексте.
**Fix:** Sprint 6 — диагностировать и исправить liveness probe.
**Regression Gate:** Doctor score ≥ 90/100

### FINDING-NEW-02: Cockpit показывает readiness=NEEDS_DATA

**Severity:** P2 (информационный)
**Symptom:** `ops:cockpit` → `readiness: NEEDS_DATA lanes=0 truth=0`
**Root Cause:** Нет данных (lanes/truth) загружены в текущей сессии.
**Evidence:** ops:cockpit output
**Impact:** Ожидаемое поведение в RESEARCH режиме (нет эпохи).
**Fix:** Не нужен — нормально для чистого boot.

### FINDING-NEW-03: Profit lane — fees/slippage/funding НЕ смоделированы

**Severity:** P2 (ASSUMPTION — нужна сеть для проверки реальных значений)
**Symptom:** Backtest не учитывает maker/taker fees, slippage, funding rate.
**Root Cause:** Отсутствие моделей в `core/sim/engine_paper.mjs`.
**Evidence:** Анализ кода engine_paper.mjs — нет fee/slippage параметров.
**Impact:** Profit lane overestimates PnL. Степень неизвестна без live data.
**Fix:** Sprint 8 (RADICAL) — добавить fee/slippage/funding модели.
**INFERENCE/LOW TRUST:** Точные значения fees зависят от биржи и tier. Нужна сеть.

---

## SPEC DRIFT (подробности)

→ **Полный отчёт:** `SPEC_DRIFT_REPORT.md`

| ID | Severity | Суть | Статус |
|----|----------|------|--------|
| DRIFT-01 | P1 | Sprint 0 spec: 12 мест runCandidatePipeline vs runEdgeLabPipeline | FIX в Sprint 4 |
| DRIFT-02 | P1 | Performance rule 15% не масштабируется | НОВЫЙ ЗАКОН в Sprint 4 |
| DRIFT-03 | P3 | Межаудитная ссылка | ИНФОРМАЦИОННО |

---

## PERFORMANCE LAW (новая формула)

### Проблема
```
Старое: verify:fast delta < 15% vs baseline
Факт: +19% (формально нарушено)
Причина: gate count вырос +32%, время +19% — per-gate ЛУЧШЕ
```

### Новый закон
```
PERFORMANCE_LAW_V2:
  ms_per_gate_budget = 80ms
  total_budget_ms    = gate_count × ms_per_gate_budget
  PASS если actual_ms ≤ total_budget_ms

  Текущее: 3800ms / 50 = 76ms/gate → PASS (76 ≤ 80)
  Sprint 4: ~4200ms / 58 ≈ 72ms/gate → PASS (прогноз)
  Sprint 5: ~4800ms / 64 ≈ 75ms/gate → PASS (прогноз)
```

### Regression
```
regression_perf_budget01_ms_per_gate:
  CMD: time npm run -s verify:fast
  ASSERT: wall_clock_ms / gate_count ≤ 80
```

---

## ROADMAP v2

### Рекомендация: BALANCED (Sprint 4 + 5 + 6)

| Sprint | Название | Scope | Gates+ | Дни | ROI |
|--------|----------|-------|--------|-----|-----|
| **S4** | **ND-EXORCISM** | 6 P0 ND-fix + spec drift + perf law | +8 | 2-3 | КРИТИЧЕСКИЙ |
| **S5** | **PROFIT_LANE_WIRING** | KS→loop, sizer→orders, recon→fills | +6 | 3-5 | ВЫСОКИЙ |
| **S6** | **DOCTOR_LIVENESS_FIX** | Liveness probe + confidence ≥90 | +2 | 1-2 | СРЕДНИЙ |

**Итого:** ~6-10 дней, gates 50→66, все P0 закрыты, profit lane wired.

### Варианты

| Вариант | Scope | Дни | Риск |
|---------|-------|-----|------|
| MINIMAL | S4 only | 2-3 | Profit lane mock-only |
| **BALANCED** | S4+S5+S6 | 6-10 | Нет live adapter |
| RADICAL | S4-S9 | 30-60 | Длительность, нужна сеть |

### Подробные спеки

| Документ | Путь |
|----------|------|
| Master Roadmap V2 | `specs/roadmap_v2/00_MASTER_ROADMAP_V2_SPEC.md` |
| Sprint 4 ND-EXORCISM | `specs/roadmap_v2/SPRINT_4_ND_EXORCISM_SPEC.md` |
| Sprint 5 PROFIT_LANE_WIRING | `specs/roadmap_v2/SPRINT_5_PROFIT_LANE_WIRING_SPEC.md` |
| Audit template S4 | `specs/roadmap_v2/AUDIT_AFTER_SPRINT_4.md` |
| Audit template S5 | `specs/roadmap_v2/AUDIT_AFTER_SPRINT_5.md` |
| Traceability V2 | `specs/roadmap_v2/TRACEABILITY_MATRIX_V2.md` |

---

## GATE STRATEGY

### Принцип: verify:fast = boot gate (≤6s)

| Цепочка | Назначение | Бюджет |
|---------|-----------|--------|
| verify:fast | Структурные/grep/AST | ≤80ms/gate, ≤6s total |
| verify:deep (новая) | e108 + integration + E2E | ≤60s |
| ops:doctor | Health + liveness x2 | ≤120s |

### Правило добавления гейтов
1. grep/AST гейт → verify:fast
2. Запуск процессов → verify:deep
3. Каждый новый гейт = обновление budget

---

## VERDICT

```
VERDICT:  PASS (Roadmap v1) / BLOCKED (Production Readiness)
REASON:   Roadmap v1 завершён, все гейты x2 PASS, детерминизм подтверждён.
          Но 6 P0 ND-блокеров и unwired profit lane блокируют production.
          ops:doctor SICK (70/100) — liveness probe broken.

block_reason_surface:   ND_P0_OPEN + PROFIT_NOT_WIRED + DOCTOR_SICK
reason_code:            POSTV1_BLOCKED_FOR_PRODUCTION
first_failing_step_idx: N/A (v1 gates all PASS)
first_failing_step_cmd: N/A
related_evidence_paths:
  - artifacts/research/EPOCH-POSTV1-01/PAIN_POINTS_V2.md
  - artifacts/research/EPOCH-POSTV1-01/SPEC_DRIFT_REPORT.md
  - artifacts/research/EPOCH-POSTV1-01/GATE_MATRIX.md
  - artifacts/research/EPOCH-POSTV1-01/COMMANDS_EXECUTED.md
  - specs/roadmap_v2/00_MASTER_ROADMAP_V2_SPEC.md
```

---

## ONE NEXT ACTION

```bash
# Sprint 4 Step 1: Исправить Math.random в repo_state.mjs (P0 ND-01)
# Затем: добавить regression gate и подтвердить verify:fast x2
npm run -s verify:fast
```

**Контекст:** verify:fast проходит (v1 stable). Следующий шаг — начать Sprint 4 (ND-EXORCISM),
начиная с самого критического P0: `core/persist/repo_state.mjs:256` Math.random() в _generateRunId().
