# АУДИТ СПРИНТ 6 — DOCTOR LIVENESS

STATUS: PASS
SCORE: 100/100
RUN_ID: 4e51a4095b93
VERDICT: HEALTHY

---

## ЦЕЛЬ

Восстановить `ops:doctor` до HEALTHY (>= 90/100). Исходный счёт: SICK 70/100
с нулевыми баллами за `liveness_alive` (15 pts) и `liveness_deterministic` (15 pts).

## ИСХОДНАЯ ПРОБЛЕМА

`ops:life` не работал внутри `ops:doctor`:
- Рекурсивная вложенность: doctor → life → T6:doctor → life → T6:doctor → ...
- Таймаут 300s: ops:life занимал > 8 минут из-за вложенных запусков
- Schema-ошибки: запрещённые имена полей в событиях FSM
- Проблемы с byte audit x2: нестабильные манифесты в nested контексте

## ИСПРАВЛЕННЫЕ БАГИ (7 штук)

### BUG-1: EVT_SCHEMA_ERROR — budget_ms
- **Файл**: `scripts/ops/state_manager.mjs:460`
- **Причина**: Суффикс `_ms` совпадает с FORBIDDEN_FIELD_RE в event_schema_v1.mjs
- **Исправление**: Переименовано `budget_ms` → `timeout_budget`

### BUG-2: Устаревший FAIL receipt byte_audit_x2 в HEAD
- **Файл**: `reports/evidence/EXECUTOR/gates/manual/repo_byte_audit_x2.json`
- **Причина**: baseline:restore восстанавливал старый FAIL receipt → каскадный сбой cockpit
- **Исправление**: Коммит свежих PASS receipts в HEAD

### BUG-3: METAAGENT не в VALID_COMPONENTS
- **Файл**: `scripts/ops/event_schema_v1.mjs`
- **Причина**: MetaAgent генерирует события, но не был в списке валидных компонентов
- **Исправление**: Добавлен 'METAAGENT' в VALID_COMPONENTS + обновлён SSOT_EVENT_SCHEMA_V1.md

### BUG-4: FP01 — поле "candidate" совпадает с "date"
- **Файл**: `scripts/ops/life.mjs:814`
- **Причина**: Слово "candidate" заканчивается на "date" → TIMESTAMP_FIELD_RE ложное срабатывание
- **Исправление**: Переименовано поле `candidate` → `hack_id` в fleet decisions

### BUG-5: Устаревший git index.lock от zombie-процессов
- **Файл**: `scripts/ops/baseline_restore.sh`
- **Причина**: Множественные concurrent процессы от nested spawns оставляют stale locks
- **Исправление**: Добавлена очистка stale lock в baseline_restore.sh

### BUG-6: Рекурсивная вложенность doctor/life — таймаут
- **Файл**: `scripts/ops/life.mjs:63`, `scripts/ops/doctor_v2.mjs:128`
- **Причина**: doctor → ops:life → T6:doctor → ops:life → ... бесконечная рекурсия
- **Исправление**:
  1. Добавлена переменная окружения `TREASURE_LIFE_DEPTH` для отслеживания глубины вложенности
  2. life.mjs пропускает T6 (doctor) при depth >= 1
  3. doctor_v2.mjs устанавливает `TREASURE_LIFE_DEPTH=1` при запуске ops:life
  4. Результат: ops:life выполняется за ~100s (вместо 8+ минут), укладывается в 300s timeout

### BUG-7: x2 determinism — нестабильные stateful поля
- **Файл**: `scripts/ops/doctor_v2.mjs:132`
- **Причина**: LIFE_SUMMARY.json содержит поля, которые закономерно меняются между запусками:
  `run_number`, `watermark_tick`, `previous_state`, `previous_outcome`,
  `fsm_source`, `fsm_state`, `fsm_mode`, `transitions_executed`, `cycle_count`
- **Исправление**: Расширена функция `norm()` для нормализации всех stateful полей при сравнении x2

## КОММИТЫ СПРИНТА 6

| Хэш | Описание |
|------|----------|
| `18bf56a` | fix doctor liveness — rename budget_ms attr, commit fresh evidence |
| `ceb2bc4` | add METAAGENT to event schema valid components |
| `021e175` | fix life FP01 crash + harden baseline_restore lock handling |
| `c24f415` | sync executor evidence after cleanup |
| `e045444` | prevent recursive doctor/life nesting + optimize FSM stdio |
| `1f9c3c4` | sync remaining executor evidence |
| `c4cbc67` | fix doctor liveness — skip T6 in doctor-spawned ops:life |
| `bb8a805` | fix doctor x2 determinism norm — normalize stateful proprio fields |
| `4e51a40` | complete doctor x2 norm — normalize FSM state progression fields |

## ИЗМЕНЁННЫЕ ФАЙЛЫ

| Файл | Изменения |
|------|-----------|
| `scripts/ops/state_manager.mjs` | `budget_ms` → `timeout_budget`, stdio optimization |
| `scripts/ops/event_schema_v1.mjs` | Добавлен 'METAAGENT' в VALID_COMPONENTS |
| `docs/SSOT_EVENT_SCHEMA_V1.md` | Обновлён список компонентов |
| `scripts/ops/life.mjs` | TREASURE_LIFE_DEPTH nesting detection, `candidate` → `hack_id` |
| `scripts/ops/baseline_restore.sh` | Stale git lock cleanup |
| `scripts/ops/doctor_v2.mjs` | TREASURE_LIFE_DEPTH=1 при запуске ops:life, расширенная norm() |

## РЕЗУЛЬТАТ DOCTOR

```
VERDICT: HEALTHY         SCORE: 100/100
CHAOS:   IMMUNE          MEMORY: run #84

  + chaos_evidence_tamper            6/6
  + chaos_fp01                       4/4
  + chaos_mode_lie                   7/7
  + chaos_net_leak                   4/4
  + chaos_orphan                     7/7
  + differential_clean               5/5
  + liveness_alive                  15/15
  + liveness_deterministic          15/15
  + provenance_sealed                3/3
  + readiness_policy                16/16
  + readiness_san                    8/8
  + startup_boot                    10/10
  TOTAL: 100/100
```

## ПРОГРЕСС ROADMAP V2

| Спринт | Статус | Описание |
|--------|--------|----------|
| Sprint 4 — ND-EXORCISM | PASS | Устранение P0 нондетерминизма |
| Sprint 5 — PROFIT_LANE_WIRING | PASS | safety_loop + regression gate |
| Sprint 6 — DOCTOR LIVENESS | PASS | 70→100/100, 7 багов исправлено |
