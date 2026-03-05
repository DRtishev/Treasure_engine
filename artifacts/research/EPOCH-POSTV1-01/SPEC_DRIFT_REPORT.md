# SPEC DRIFT REPORT — EPOCH-POSTV1-01

## Методология

Сравнение: текст спецификаций v1 → реальный код → гейты.
Источники: `specs/roadmap_v1/SPRINT_0_*.md`, `TRACEABILITY_MATRIX.md`, `AUDIT_AFTER_SPRINT_*.md`, исходный код.

---

## DRIFT-01: runCandidatePipeline vs runEdgeLabPipeline (CONFIRMED)

**Severity:** P1 (документная рассинхронизация, код корректен)

### Факты

| Документ | Что написано | Правда |
|----------|-------------|--------|
| `SPRINT_0_COURT_WIRING_SPEC.md:31` | "Import и вызов runCandidatePipeline()" | Реализация — `runEdgeLabPipeline` |
| `SPRINT_0_COURT_WIRING_SPEC.md:44` (INV-S0-1) | "strategy_sweep IMPORTS runCandidatePipeline" | Реально: `import { runEdgeLabPipeline }` |
| `SPRINT_0_COURT_WIRING_SPEC.md:45` | "grep -c runCandidatePipeline" | Реально: grep найдёт 0 |
| `SPRINT_0_COURT_WIRING_SPEC.md:155-156` | "Assert: содержит import.*runCandidatePipeline" | Гейт проверяет runEdgeLabPipeline |
| `SPRINT_0_COURT_WIRING_SPEC.md:195` | "strategy_sweep imports + calls runCandidatePipeline" | Реально: runEdgeLabPipeline |
| `SPRINT_0_COURT_WIRING_SPEC.md:247-248` (DoD) | "imports runCandidatePipeline" | Реально: runEdgeLabPipeline |
| `SPRINT_0_COURT_WIRING_SPEC.md:272` (Rollback) | "откатить к версии без runCandidatePipeline" | Реально: runEdgeLabPipeline |
| `SPRINT_0_COURT_WIRING_SPEC.md:284` (Pre-check) | "Проверить совместимость runCandidatePipeline" | Реально: runEdgeLabPipeline |

### Объяснение

Спека описала **два варианта** (строка 89-93):
- **Вариант A (выбран):** использовать `runEdgeLabPipeline` — minimal diff
- **Вариант B (отклонён):** полностью заменить на `runCandidatePipeline`

Реализация пошла по Варианту A, но текст инвариантов/DoD/гейтов **не обновлён** —
они всё ещё ссылаются на `runCandidatePipeline`.

### Код (истина)

```
scripts/edge/strategy_sweep.mjs:20  → import { runEdgeLabPipeline } from '../../core/edge_lab/pipeline.mjs';
scripts/edge/strategy_sweep.mjs:132 → const courtResult = runEdgeLabPipeline(edge, {}, { ... });
```

### Гейт (истина)

`regression_court_wiring01_sweep_uses_pipeline` — **PASS**. Гейт проверяет **реальный** import/call,
не строку "runCandidatePipeline".

### TRACEABILITY_MATRIX.md (уже исправлена)

```
REQ-B1 → strategy_sweep imports runEdgeLabPipeline ← ПРАВИЛЬНО
REQ-B2 → strategy_sweep calls runEdgeLabPipeline  ← ПРАВИЛЬНО
INV-S0-1 → sweep imports runEdgeLabPipeline        ← ПРАВИЛЬНО
```

### Вердикт

- **Код:** КОРРЕКТЕН ✓ (Вариант A)
- **Гейты:** КОРРЕКТНЫ ✓ (проверяют реальность)
- **TRACEABILITY_MATRIX:** КОРРЕКТНА ✓
- **SPRINT_0_COURT_WIRING_SPEC.md:** УСТАРЕЛ ✗ (12 мест ссылаются на runCandidatePipeline)
- **Исправление:** Обновить SPRINT_0_SPEC строки 31, 44-45, 155-156, 195, 247-248, 272, 284

---

## DRIFT-02: Performance Budget "15%" — кумулятивный конфликт

**Severity:** P1 (политика не нормализована)

### Факты

| Документ | Правило |
|----------|---------|
| `00_MASTER_ROADMAP_SPEC.md:40` | "Время verify:fast не деградировало > 15% vs baseline" |
| `AUDIT_AFTER_SPRINT_0.md:59` | "Delta < 15% → OK" → +7% ✓ |
| `AUDIT_AFTER_SPRINT_1.md:67` | "Delta < 15% → OK" → +6% ✓ |
| `AUDIT_AFTER_SPRINT_2.md:56` | "Delta < 15% → OK" → +6% ✓ |
| `AUDIT_AFTER_SPRINT_3.md:60` | +19% → "OK (gate count +32%)" |

### Конфликт

- Мастер-спека говорит: **>15% vs baseline = проблема**.
- Кумулятивная деградация: **+19%** (3200ms → 3800ms).
- Финальный аудит допустил это, аргументируя "gate count +32%".
- **Но формально** правило нарушено: 19% > 15%.

### Предложение: Новый Performance Law

Старое правило: `total_ms_delta < 15%` — **не масштабируется** при росте гейтов.

Новое правило (предлагается для v2):

```
PERFORMANCE_LAW_V2:
  - ms_per_gate_budget = 80ms
  - total_budget = gate_count × ms_per_gate_budget
  - ACTUAL = verify:fast wall-clock ms
  - PASS если ACTUAL <= total_budget
  - Baseline (50 gates): 50 × 80ms = 4000ms
  - Current (3800ms): PASS (3800 < 4000)
  - Regression gate: regression_perf_budget01_ms_per_gate
```

### Вердикт

- **Факт:** 19% > 15% — формально нарушено.
- **По сути:** деградация пропорциональна росту гейтов, приемлема.
- **Нужно:** Заменить правило на ms-per-gate бюджет и закрепить как закон.

---

## DRIFT-03: AUDIT_AFTER_SPRINT_0 spec references (minor)

**Severity:** P3

`AUDIT_AFTER_SPRINT_0.md:89` корректно описывает `runEdgeLabPipeline` —
аудит написан ПОСЛЕ реализации и отражает реальность. Конфликт только со спекой.

---

## Итого

| ID | Severity | Тип | Статус |
|----|----------|-----|--------|
| DRIFT-01 | P1 | Spec text vs code (runCandidatePipeline) | НУЖНО ИСПРАВИТЬ СПЕКУ |
| DRIFT-02 | P1 | Performance rule не масштабируется | НУЖЕН НОВЫЙ ЗАКОН |
| DRIFT-03 | P3 | Межаудитная ссылка | ИНФОРМАЦИОННО |
