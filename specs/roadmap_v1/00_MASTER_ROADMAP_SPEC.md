# 00_MASTER_ROADMAP_SPEC.md — Мастер-спецификация роадмэпа Treasure Engine

**Версия:** 1.0
**Дата:** 2026-03-04
**Источник:** artifacts/audit/TREASURE_TOTAL_AUDIT_REPORT.md, artifacts/audit/ROADMAP.md

---

## 1. КОНТЕКСТ

Аудит Treasure Engine выявил 2 подтверждённых критических проблемы (FINDING-B, FINDING-C)
и 2 дополнительных (FINDING-D, FINDING-E). Инфраструктура здорова (verify:fast x2 PASS,
e108 x2 PASS), но операционный pipeline содержит фундаментальные gap-ы.

## 2. СПРИНТЫ

| Sprint | Код | Focus | Входы | Блокирует | Duration |
|---|---|---|---|---|---|
| 0 | COURT_WIRING | Courts wiring в sweep | FINDING-B | Sprint 1 | 1-2 дня |
| 1 | METRIC_PARITY | Metrics unification | FINDING-C, FINDING-E | Sprint 3 | 3-5 дней |
| 2 | FSM_HEALING | FSM goal-seeker + healing | — | — | 3-5 дней |
| 3 | PROFIT_LANE | Paper→micro-live + kill switch | Sprint 0, Sprint 1 | — | 5-7 дней |

## 3. ЗАВИСИМОСТИ

```
Sprint 0 ──┐
            ├──→ Sprint 3
Sprint 1 ──┘
Sprint 2 (независимый, параллелен с Sprint 1)
```

## 4. ИНВАРИАНТЫ ДЛЯ ВСЕХ СПРИНТОВ

Каждый спринт обязан:
1. verify:fast x2 PASS (идентичные EC, без ND)
2. e108_backtest_determinism_x2 PASS
3. Все новые regression gates в verify:fast chain
4. Все evidence-артефакты в reports/evidence/EXECUTOR/
5. Время verify:fast не деградировало > 15% vs baseline
6. git status clean после коммита

## 5. МЕЖСПРИНТОВЫЙ АУДИТ

После каждого спринта — обязательный AUDIT_AFTER_SPRINT_X.md:
- SNAPSHOT (sha, branch, node, status)
- verify:fast x2 + GATE_MATRIX
- Performance check (время verify:fast vs baseline)
- Risk review
- VERDICT (PASS → следующий спринт / BLOCKED → fix first)

## 6. NAMING CONVENTIONS

| Тип | Паттерн | Пример |
|---|---|---|
| Regression gate | `regression_{domain}{NN}_{description}.mjs` | `regression_court_wiring01_sweep_uses_pipeline.mjs` |
| Evidence (JSON) | `reports/evidence/EXECUTOR/gates/manual/{gate_id}.json` | `regression_court_wiring01.json` |
| Evidence (MD) | `reports/evidence/EXECUTOR/{GATE_ID}.md` | `REGRESSION_COURT_WIRING01.md` |
| npm script | `verify:regression:{gate-name}` | `verify:regression:court-wiring01-sweep-uses-pipeline` |

## 7. GATE REGISTRATION PROTOCOL

Для добавления нового gate в verify:fast:
1. Создать `scripts/verify/regression_{name}.mjs` (exit 0 = PASS, exit 1 = FAIL)
2. Добавить npm script в package.json: `"verify:regression:{name}": "node scripts/verify/regression_{name}.mjs"`
3. Добавить вызов в `scripts/verify/verify_fast.mjs` (в секцию regression gates)
4. Убедиться: EC=0 standalone + EC=0 в verify:fast chain
5. Прогнать verify:fast x2 для подтверждения стабильности

## 8. ROLLBACK PROTOCOL

Для любого спринта:
1. `git stash` текущих изменений
2. `git checkout {pre-sprint-sha}`
3. `npm run -s verify:fast` — подтвердить что baseline восстановлен
4. Если stash нужен: `git stash pop` + selective apply

## 9. ФАЙЛЫ СПЕЦИФИКАЦИЙ

| Файл | Описание |
|---|---|
| `SPRINT_0_COURT_WIRING_SPEC.md` | Court wiring: strategy_sweep + guard_backtest_pass |
| `SPRINT_1_METRIC_PARITY_SPEC.md` | Metric contract + unified Sharpe + real drawdown |
| `SPRINT_2_FSM_HEALING_SPEC.md` | FSM planner + healing loop + doctor score |
| `SPRINT_3_PROFIT_LANE_SPEC.md` | Kill switch + reconciliation + flatten |
| `AUDIT_AFTER_SPRINT_0.md` | Межспринтовый аудит после Sprint 0 |
| `AUDIT_AFTER_SPRINT_1.md` | Межспринтовый аудит после Sprint 1 |
| `AUDIT_AFTER_SPRINT_2.md` | Межспринтовый аудит после Sprint 2 |
| `AUDIT_AFTER_SPRINT_3.md` | Межспринтовый аудит после Sprint 3 |
| `TRACEABILITY_MATRIX.md` | Finding → Requirement → Gate → Evidence |

## 10. ONE NEXT ACTION

```bash
# Начать Sprint 0: прочитать SPRINT_0_COURT_WIRING_SPEC.md и выполнить шаг 1
cat specs/roadmap_v1/SPRINT_0_COURT_WIRING_SPEC.md
```
