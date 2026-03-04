# AUDIT_AFTER_SPRINT_0.md — Межспринтовый аудит после Sprint 0 (Court Wiring)

**Шаблон для заполнения после завершения Sprint 0.**
**НЕ ЗАПОЛНЯТЬ ДО ЗАВЕРШЕНИЯ СПРИНТА.**

---

## A) SNAPSHOT

| Параметр | Значение |
|---|---|
| Branch | `claude/audit-harden-treasure-engine-68ZkR` |
| HEAD sha | _заполнить_ |
| Pre-sprint SHA | `34cdf27` |
| Node | v22.22.0 |
| npm | 10.9.4 |
| git status | _должен быть clean_ |
| Режим | CERT (offline) |

## B) COMMANDS EXECUTED

| # | Команда | EC | Краткий вывод |
|---|---|---|---|
| 1 | `npm run -s verify:fast` (pre-change baseline) | _EC_ | _output_ |
| 2 | _apply changes_ | — | — |
| 3 | `npm run -s verify:fast` (run 1 post-change) | _EC_ | _output_ |
| 4 | `npm run -s verify:fast` (run 2 post-change) | _EC_ | _output_ |
| 5 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 1) | _EC_ | _output_ |
| 6 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 2) | _EC_ | _output_ |
| 7 | `node scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs` | _EC_ | _output_ |
| 8 | `node scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs` | _EC_ | _output_ |
| 9 | `npm run -s regen:manifests` | _EC_ | _output_ |
| 10 | `npm run -s verify:fast` (final run 1) | _EC_ | _output_ |
| 11 | `npm run -s verify:fast` (final run 2) | _EC_ | _output_ |

## C) GATE MATRIX

| Гейт | Run 1 EC | Run 2 EC | ND? | Вердикт |
|---|---|---|---|---|
| verify:fast (все gates) | _EC_ | _EC_ | _да/нет_ | _PASS/FAIL_ |
| e108_determinism_x2 | _EC_ | _EC_ | _да/нет_ | _PASS/FAIL_ |
| regression_court_wiring01 | _EC_ | — | — | _PASS/FAIL_ |
| regression_court_wiring02 | _EC_ | — | — | _PASS/FAIL_ |

## D) DETERMINISM VERDICT

- verify:fast Run 1 EC = ___, Run 2 EC = ___
- Идентичные? _да/нет_
- e108 Run 1 EC = ___, Run 2 EC = ___
- Идентичные? _да/нет_
- **DETERMINISM VERDICT:** _CONFIRMED / ND_DETECTED_

## E) PERFORMANCE CHECK

| Метрика | Pre-sprint | Post-sprint | Delta | Verdict |
|---|---|---|---|---|
| verify:fast duration (ms) | _baseline_ | _new_ | _delta_ | _OK / DEGRADED (>15%)_ |
| e108 duration (ms) | _baseline_ | _new_ | _delta_ | _OK / DEGRADED (>15%)_ |

**Протокол:** Если delta > 15% → BLOCKED. Идентифицировать причину.

## F) RISK REVIEW

### Новые attack surfaces
- _перечислить все новые imports/modules_
- _оценить offline-совместимость всех новых зависимостей_

### Регрессии (unexpected)
- _перечислить любые gates которые стали fail/flaky_

### Open questions
- _вопросы требующие внимания перед Sprint 1_

## G) EVIDENCE PATHS

| Артефакт | Путь | Exists? |
|---|---|---|
| Court wiring gate #1 | `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring01.json` | _yes/no_ |
| Court wiring gate #2 | `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring02.json` | _yes/no_ |
| Gate matrix | `artifacts/audit/GATE_MATRIX.md` | _yes/no_ |

## H) VERDICT

- **Status:** _PASS / BLOCKED / FAIL_
- **reason_code:** _NONE / {code}_
- **first_failing_step:** _N/A or step #_
- **Detail:** _описание_

## I) ONE NEXT ACTION

```bash
# Если PASS → начать Sprint 1
cat specs/roadmap_v1/SPRINT_1_METRIC_PARITY_SPEC.md
# Если BLOCKED → _команда для разблокировки_
```
