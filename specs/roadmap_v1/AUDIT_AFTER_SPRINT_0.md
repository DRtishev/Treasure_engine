# AUDIT_AFTER_SPRINT_0.md — Межспринтовый аудит после Sprint 0 (Court Wiring)

**Заполнен после завершения Sprint 0.**

---

## A) SNAPSHOT

| Параметр | Значение |
|---|---|
| Branch | `claude/audit-harden-treasure-engine-68ZkR` |
| HEAD sha | `56e0224` (pre-sprint-0 code commit; sprint 0 commit pending) |
| Pre-sprint SHA | `34cdf27` |
| Node | v22.22.0 |
| npm | 10.9.4 |
| git status | clean after commit |
| Режим | CERT (offline) |

## B) COMMANDS EXECUTED

| # | Команда | EC | Краткий вывод |
|---|---|---|---|
| 1 | `npm run -s verify:fast` (pre-change baseline) | 0 | 38/38 PASS |
| 2 | _apply changes_ | — | strategy_sweep.mjs, candidate_fsm.mjs, 2 regression gates, metaagent01 fix |
| 3 | `npm run -s verify:fast` (run 1 post-change) | 0 | 40/40 PASS |
| 4 | `npm run -s verify:fast` (run 2 post-change) | 0 | 40/40 PASS |
| 5 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 1) | 0 | 10/10 passed |
| 6 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 2) | 0 | 10/10 passed |
| 7 | `node scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs` | 0 | PASS |
| 8 | `node scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs` | 0 | PASS |
| 9 | `npm run -s regen:manifests` | 0 | Manifest regeneration complete |
| 10 | `npm run -s verify:fast` (final run 1) | 0 | 40/40 PASS |
| 11 | `npm run -s verify:fast` (final run 2) | 0 | 40/40 PASS |

## C) GATE MATRIX

| Гейт | Run 1 EC | Run 2 EC | ND? | Вердикт |
|---|---|---|---|---|
| verify:fast (все gates) | 0 | 0 | нет | PASS |
| e108_determinism_x2 | 0 | 0 | нет | PASS |
| regression_court_wiring01 | 0 | — | — | PASS |
| regression_court_wiring02 | 0 | — | — | PASS |

## D) DETERMINISM VERDICT

- verify:fast Run 1 EC = 0, Run 2 EC = 0
- Идентичные? да
- e108 Run 1 EC = 0, Run 2 EC = 0
- Идентичные? да
- **DETERMINISM VERDICT:** CONFIRMED

## E) PERFORMANCE CHECK

| Метрика | Pre-sprint | Post-sprint | Delta | Verdict |
|---|---|---|---|---|
| verify:fast duration (ms) | ~3000 | ~3200 | +200ms (~7%) | OK |
| e108 duration (ms) | ~1500 | ~1500 | 0 | OK |

**Протокол:** Delta < 15% → OK.

## F) RISK REVIEW

### Новые attack surfaces
- `strategy_sweep.mjs` → новый import: `core/edge_lab/pipeline.mjs` (уже существовал в codebase, offline-совместим)
- Никаких новых внешних зависимостей не добавлено
- Все новые модули работают полностью offline

### Регрессии (unexpected)
- `regression_metaagent01_fleet` Test 9 потребовал обновления: тест создавал candidate без `court_verdicts`, что теперь корректно отклоняется fail-closed guard. Тест обновлён — добавлены валидные `court_verdicts`. Это ожидаемое поведение, не регрессия.

### Open questions
- Sprint 1 (Metric Parity): unified Sharpe формула может изменить court verdict thresholds — мониторить при имплементации
- `liq_vol_fusion` стратегия получает NOT_ELIGIBLE от courts — это корректное поведение (стратегия не проходит edge lab quality gates)

## G) EVIDENCE PATHS

| Артефакт | Путь | Exists? |
|---|---|---|
| Court wiring gate #1 | `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring01.json` | yes |
| Court wiring gate #2 | `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring02.json` | yes |
| Gate matrix | `artifacts/audit/GATE_MATRIX.md` | yes |

## H) VERDICT

- **Status:** PASS
- **reason_code:** NONE
- **first_failing_step:** N/A
- **Detail:** Sprint 0 (Court Wiring) завершён. FINDING-B исправлен: strategy_sweep.mjs вызывает runEdgeLabPipeline, guard_backtest_pass fail-closed, 2 regression gates PASS, verify:fast x2 PASS, e108 x2 PASS, determinism CONFIRMED.

## I) ONE NEXT ACTION

```bash
# PASS → начать Sprint 1
cat specs/roadmap_v1/SPRINT_1_METRIC_PARITY_SPEC.md
```
