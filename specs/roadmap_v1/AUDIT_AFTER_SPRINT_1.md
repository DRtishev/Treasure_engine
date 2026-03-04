# AUDIT_AFTER_SPRINT_1.md — Межспринтовый аудит после Sprint 1 (Metric Parity)

**Шаблон для заполнения после завершения Sprint 1.**
**НЕ ЗАПОЛНЯТЬ ДО ЗАВЕРШЕНИЯ СПРИНТА.**

---

## A) SNAPSHOT

| Параметр | Значение |
|---|---|
| Branch | `claude/audit-harden-treasure-engine-68ZkR` |
| HEAD sha | _заполнить_ |
| Pre-sprint SHA | _заполнить (post-Sprint-0 SHA)_ |
| Node | v22.22.0 |
| npm | 10.9.4 |
| git status | _должен быть clean_ |

## B) COMMANDS EXECUTED

| # | Команда | EC | Краткий вывод |
|---|---|---|---|
| 1 | `npm run -s verify:fast` (pre-change baseline) | _EC_ | _output_ |
| 2 | _apply changes_ | — | — |
| 3 | `npm run -s verify:fast` (run 1) | _EC_ | _output_ |
| 4 | `npm run -s verify:fast` (run 2) | _EC_ | _output_ |
| 5 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 1) | _EC_ | _output_ |
| 6 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 2) | _EC_ | _output_ |
| 7 | `node scripts/verify/regression_sharpe_ssot01_no_inline.mjs` | _EC_ | _output_ |
| 8 | `node scripts/verify/regression_metric_parity01_overfit_uses_unified.mjs` | _EC_ | _output_ |
| 9 | `node scripts/verify/regression_metric_parity02_canary_real_dd.mjs` | _EC_ | _output_ |
| 10 | `node scripts/verify/regression_metric_parity03_required_keys.mjs` | _EC_ | _output_ |
| 11 | `npm run -s regen:manifests` | _EC_ | _output_ |
| 12 | `npm run -s verify:fast` (final run 1) | _EC_ | _output_ |
| 13 | `npm run -s verify:fast` (final run 2) | _EC_ | _output_ |

## C) GATE MATRIX

| Гейт | Run 1 EC | Run 2 EC | ND? | Вердикт |
|---|---|---|---|---|
| verify:fast | _EC_ | _EC_ | _да/нет_ | _PASS/FAIL_ |
| e108_determinism_x2 | _EC_ | _EC_ | _да/нет_ | _PASS/FAIL_ |
| regression_sharpe_ssot01 | _EC_ | — | — | _PASS/FAIL_ |
| regression_metric_parity01 | _EC_ | — | — | _PASS/FAIL_ |
| regression_metric_parity02 | _EC_ | — | — | _PASS/FAIL_ |
| regression_metric_parity03 | _EC_ | — | — | _PASS/FAIL_ |
| regression_court_wiring01 (Sprint 0) | _EC_ | — | — | _PASS/FAIL_ |
| regression_court_wiring02 (Sprint 0) | _EC_ | — | — | _PASS/FAIL_ |

**ВАЖНО:** Sprint 0 gates MUST remain PASS.

## D) DETERMINISM VERDICT

- verify:fast Run 1 = ___, Run 2 = ___. Идентичные? ___
- e108 Run 1 = ___, Run 2 = ___. Идентичные? ___
- **Ожидаемые изменения:** Sharpe values в overfit_court могут измениться (unified формула).
  Это ожидаемо. e108 determinism должен оставаться PASS (backtest engine не менялся).
- **DETERMINISM VERDICT:** ___

## E) PERFORMANCE CHECK

| Метрика | Pre-sprint | Post-sprint | Delta | Verdict |
|---|---|---|---|---|
| verify:fast duration (ms) | _baseline_ | _new_ | _delta_ | _OK / DEGRADED_ |
| e108 duration (ms) | _baseline_ | _new_ | _delta_ | _OK / DEGRADED_ |

## F) RISK REVIEW

### Ожидаемые breaking changes
- overfit_court Sharpe values WILL change (разная формула)
- canary fitness thresholds MAY need adjustment for real drawdown

### Проверки
- [ ] overfit_court PASS с unified Sharpe формулой
- [ ] canary fitness thresholds реалистичны
- [ ] sim pipeline не сломан (engine_paper fix)
- [ ] Sprint 0 gates still PASS

## G) EVIDENCE PATHS

| Артефакт | Путь | Exists? |
|---|---|---|
| metric_contract module | `core/metrics/metric_contract.mjs` | _yes/no_ |
| 4 regression gates | `reports/evidence/EXECUTOR/gates/manual/regression_*.json` | _yes/no_ |

## H) VERDICT

- **Status:** _PASS / BLOCKED / FAIL_
- **reason_code:** _NONE / {code}_
- **first_failing_step:** _N/A or step #_

## I) ONE NEXT ACTION

```bash
# Если PASS → Sprint 2 + Sprint 3 можно начинать параллельно
cat specs/roadmap_v1/SPRINT_2_FSM_HEALING_SPEC.md
```
