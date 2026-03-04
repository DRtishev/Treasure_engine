# AUDIT_AFTER_SPRINT_1.md — Межспринтовый аудит после Sprint 1 (Metric Parity)

**Заполнен после завершения Sprint 1.**

---

## A) SNAPSHOT

| Параметр | Значение |
|---|---|
| Branch | `claude/audit-harden-treasure-engine-68ZkR` |
| HEAD sha | `3df290a` (post-Sprint-0; Sprint 1 commit pending) |
| Pre-sprint SHA | `3df290a` |
| Node | v22.22.0 |
| npm | 10.9.4 |
| git status | clean after commit |
| Режим | CERT (offline) |

## B) COMMANDS EXECUTED

| # | Команда | EC | Краткий вывод |
|---|---|---|---|
| 1 | `npm run -s verify:fast` (pre-change baseline) | 0 | 40/40 PASS |
| 2 | _apply changes_ | — | metric_contract.mjs, overfit_court.mjs, fitness_suite.mjs, engine_paper.mjs, contracts.mjs, 4 regression gates |
| 3 | `node scripts/verify/regression_sharpe_ssot01_no_inline.mjs` | 0 | PASS |
| 4 | `node scripts/verify/regression_metric_parity01_overfit_uses_unified.mjs` | 0 | PASS |
| 5 | `node scripts/verify/regression_metric_parity02_canary_real_dd.mjs` | 0 | PASS |
| 6 | `node scripts/verify/regression_metric_parity03_required_keys.mjs` | 0 | PASS |
| 7 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 1) | 0 | 10/10 passed |
| 8 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 2) | 0 | 10/10 passed |
| 9 | `npm run -s edge:strategy-sweep` | 0 | 2/3 BACKTESTED, courts OK |
| 10 | `npm run -s regen:manifests` | 0 | Manifest regeneration complete |
| 11 | `npm run -s verify:fast` (final run 1) | 0 | 44/44 PASS |
| 12 | `npm run -s verify:fast` (final run 2) | 0 | 44/44 PASS |

## C) GATE MATRIX

| Гейт | Run 1 EC | Run 2 EC | ND? | Вердикт |
|---|---|---|---|---|
| verify:fast (44 gates) | 0 | 0 | нет | PASS |
| e108_determinism_x2 | 0 | 0 | нет | PASS |
| regression_sharpe_ssot01 | 0 | — | — | PASS |
| regression_metric_parity01 | 0 | — | — | PASS |
| regression_metric_parity02 | 0 | — | — | PASS |
| regression_metric_parity03 | 0 | — | — | PASS |
| regression_court_wiring01 (Sprint 0) | 0 | — | — | PASS |
| regression_court_wiring02 (Sprint 0) | 0 | — | — | PASS |

**Sprint 0 gates remain PASS.**

## D) DETERMINISM VERDICT

- verify:fast Run 1 EC = 0, Run 2 EC = 0. Идентичные? да
- e108 Run 1 EC = 0, Run 2 EC = 0. Идентичные? да
- **Ожидаемые изменения:** Sharpe values в overfit_court изменились (unified deflatedSharpeRatio
  возвращает вероятность [0,1] вместо penalty-adjusted Sharpe). NEEDS_DATA verdict для
  стратегий с < 30 trades — ожидаемо. e108 determinism PASS (backtest engine не менялся).
- **DETERMINISM VERDICT:** CONFIRMED

## E) PERFORMANCE CHECK

| Метрика | Pre-sprint | Post-sprint | Delta | Verdict |
|---|---|---|---|---|
| verify:fast duration (ms) | ~3200 | ~3400 | +200ms (~6%) | OK |
| e108 duration (ms) | ~1500 | ~1500 | 0 | OK |

**Протокол:** Delta < 15% → OK.

## F) RISK REVIEW

### Ожидаемые breaking changes
- overfit_court: `deflatedSharpeRatio` теперь возвращает вероятность [0,1] вместо `sharpe - penalty`.
  Threshold `min_deflated_sharpe: 0.3` интерпретируется как "30% confidence SR > expected max by chance".
- canary fitness: `drawdown_proxy` заменён на `max_drawdown` (HWM-based). Формула `max(0, -pnl/10)` устранена.
- engine_paper.mjs: `computePenalizedMetrics(allMetrics, ssot)` → `computePenalizedMetrics({...})`.
  Раньше передавался array как первый аргумент, теперь правильный single object.

### Проверки
- [x] overfit_court PASS с unified Sharpe формулой
- [x] canary fitness thresholds реалистичны (computeMaxDrawdown HWM-based)
- [x] sim pipeline fix (engine_paper calling convention)
- [x] Sprint 0 gates still PASS
- [x] contracts.mjs SimReport output_metrics has required fields

### Регрессии (unexpected)
- Нет unexpected регрессий. Все 44 gates PASS с первой попытки.
- Overfit court sharpe values changed as expected (unified formula).

## G) EVIDENCE PATHS

| Артефакт | Путь | Exists? |
|---|---|---|
| metric_contract module | `core/metrics/metric_contract.mjs` | yes |
| sharpe_ssot01 gate | `reports/evidence/EXECUTOR/gates/manual/regression_sharpe_ssot01.json` | yes |
| metric_parity01 gate | `reports/evidence/EXECUTOR/gates/manual/regression_metric_parity01.json` | yes |
| metric_parity02 gate | `reports/evidence/EXECUTOR/gates/manual/regression_metric_parity02.json` | yes |
| metric_parity03 gate | `reports/evidence/EXECUTOR/gates/manual/regression_metric_parity03.json` | yes |

## H) VERDICT

- **Status:** PASS
- **reason_code:** NONE
- **first_failing_step:** N/A
- **Detail:** Sprint 1 (Metric Parity) завершён. FINDING-C частично исправлен: overfit_court использует unified_sharpe.mjs, canary drawdown реальный HWM, FINDING-E исправлен (engine_paper calling convention). metric_contract.mjs создан с 4 required keys. 4 regression gates PASS, verify:fast x2 PASS (44/44), e108 x2 PASS, determinism CONFIRMED.

## I) ONE NEXT ACTION

```bash
# PASS → начать Sprint 2
cat specs/roadmap_v1/SPRINT_2_FSM_HEALING_SPEC.md
```
