# AUDIT_AFTER_SPRINT_2.md — Межспринтовый аудит после Sprint 2 (FSM Healing)

**Шаблон для заполнения после завершения Sprint 2.**

---

## A) SNAPSHOT

| Параметр | Значение |
|---|---|
| Branch | _заполнить_ |
| HEAD sha | _заполнить_ |
| Pre-sprint SHA | _заполнить_ |
| Node | v22.22.0 |
| npm | 10.9.4 |
| git status | _должен быть clean_ |

## B) COMMANDS EXECUTED

| # | Команда | EC | Вывод |
|---|---|---|---|
| 1 | `npm run -s verify:fast` (baseline) | _EC_ | _output_ |
| 2 | _apply changes_ | — | — |
| 3 | `npm run -s verify:fast` (run 1) | _EC_ | _output_ |
| 4 | `npm run -s verify:fast` (run 2) | _EC_ | _output_ |
| 5 | `e108_backtest_determinism_x2` (run 1) | _EC_ | _output_ |
| 6 | `e108_backtest_determinism_x2` (run 2) | _EC_ | _output_ |
| 7 | `regression_fsm_deadlock01` | _EC_ | _output_ |
| 8 | `regression_doctor_score01` | _EC_ | _output_ |
| 9 | `regression_cockpit_dynamic_next01` | _EC_ | _output_ |
| 10 | `npm run -s ops:doctor` | _EC_ | _confidence_score=?_ |
| 11 | `npm run -s ops:cockpit` | _EC_ | _ONE_NEXT_ACTION=?_ |
| 12 | `npm run -s regen:manifests` | _EC_ | _output_ |
| 13 | `npm run -s verify:fast` (final run 1) | _EC_ | _output_ |
| 14 | `npm run -s verify:fast` (final run 2) | _EC_ | _output_ |

## C) GATE MATRIX

| Гейт | Run 1 EC | Run 2 EC | ND? | Вердикт |
|---|---|---|---|---|
| verify:fast | _EC_ | _EC_ | _да/нет_ | _PASS/FAIL_ |
| e108_determinism_x2 | _EC_ | _EC_ | _да/нет_ | _PASS/FAIL_ |
| regression_fsm_deadlock01 | _EC_ | — | — | _PASS/FAIL_ |
| regression_doctor_score01 | _EC_ | — | — | _PASS/FAIL_ |
| regression_cockpit_dynamic_next01 | _EC_ | — | — | _PASS/FAIL_ |
| Sprint 0 gates (wiring01, wiring02) | _EC_ | — | — | _PASS/FAIL_ |
| Sprint 1 gates (ssot01, parity01-03) | _EC_ | — | — | _PASS/FAIL_ |

## D) DETERMINISM VERDICT

- verify:fast x2: ___. **DETERMINISM:** ___
- e108 x2: ___. **DETERMINISM:** ___

## E) PERFORMANCE CHECK

| Метрика | Pre-sprint | Post-sprint | Delta | Verdict |
|---|---|---|---|---|
| verify:fast (ms) | _baseline_ | _new_ | _delta_ | _OK / DEGRADED_ |
| ops:doctor (ms) | _baseline_ | _new_ | _delta_ | _OK / DEGRADED_ |
| ops:cockpit (ms) | _baseline_ | _new_ | _delta_ | _OK / DEGRADED_ |

## F) RISK REVIEW

### Специфичные для Sprint 2
- [ ] Deadlock detection не вызывает false positives при нормальных transitions
- [ ] Doctor confidence score детерминистичен (x2 same value)
- [ ] Cockpit next_action корректен для каждого FSM state
- [ ] Doctor history JSONL не растёт бесконтрольно
- [ ] Все предыдущие Sprint gates still PASS

## G) EVIDENCE PATHS

| Артефакт | Путь | Exists? |
|---|---|---|
| 3 regression gates | `reports/evidence/EXECUTOR/gates/manual/regression_*.json` | _yes/no_ |
| Doctor history | `reports/evidence/EXECUTOR/DOCTOR_HISTORY.jsonl` | _yes/no_ |

## H) VERDICT

- **Status:** _PASS / BLOCKED / FAIL_
- **reason_code:** ___

## I) ONE NEXT ACTION

```bash
# Если PASS → Sprint 3
cat specs/roadmap_v1/SPRINT_3_PROFIT_LANE_SPEC.md
```
