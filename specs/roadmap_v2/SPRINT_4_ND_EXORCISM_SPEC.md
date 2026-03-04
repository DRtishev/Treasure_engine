# SPRINT 4: ND-EXORCISM

> Устранить все P0 источники недетерминизма в core/.
> Нормализовать performance law. Исправить spec drift.

**Предыдущий спринт:** Sprint 3 (Profit Lane) — 50 gates, PASS
**Ожидаемый gate count:** 50 → 58 (+8 гейтов)
**Длительность:** 2–3 дня
**Write-scope:** `core/**`, `scripts/verify/**`, `specs/roadmap_v1/SPRINT_0_*.md`, `specs/roadmap_v2/**`

---

## 1. SCOPE

### 1.1 P0 Fixes (ND — Non-Determinism)

| ID | Файл | Проблема | Fix |
|----|------|---------|-----|
| ND-01 | `core/persist/repo_state.mjs:256` | `Math.random()` в `_generateRunId()` | Заменить на `crypto.randomBytes(4).toString('hex')` |
| ND-02 | `core/court/court_v2.mjs:36,52` | `Date.now()` в court reports | Принимать `ctx.clock`, использовать `ctx.clock.now()` |
| ND-03 | `core/court/court_v2.mjs:248` | `new Date().toISOString()` | Использовать `ctx.clock.toISOString()` |
| ND-04 | `core/execution/e122_execution_adapter_v3.mjs:34,37,41,44,47,50` | `Date.now()` + `new Date()` | Инжектировать clock через options |
| ND-05 | `core/sim/engine_paper.mjs:376` | `new Date().toISOString()` | Инжектировать clock через ctx |
| NET-01 | `core/data/provider_*_live.mjs` (4 файла) | `fetch()` без NET guard | Добавить `enforceNetGuard()` перед каждым fetch |

### 1.2 Spec Drift Fix

| ID | Документ | Действие |
|----|----------|----------|
| DRIFT-01 | `specs/roadmap_v1/SPRINT_0_COURT_WIRING_SPEC.md` | Заменить 12 упоминаний `runCandidatePipeline` на `runEdgeLabPipeline` (строки 31, 44, 45, 155, 156, 195, 247, 248, 272, 284) |

### 1.3 Performance Law

| ID | Действие |
|----|----------|
| PERF-01 | Добавить `regression_perf_budget01_ms_per_gate` в verify:fast |
| PERF-02 | Обновить `00_MASTER_ROADMAP_SPEC.md:40` — новое правило ms-per-gate |

---

## 2. FILE PLAN

| Файл | Действие | Что меняется |
|------|---------|-------------|
| `core/persist/repo_state.mjs` | MODIFY | `_generateRunId()` → crypto.randomBytes |
| `core/court/court_v2.mjs` | MODIFY | Принять ctx.clock, убрать Date.now/new Date |
| `core/execution/e122_execution_adapter_v3.mjs` | MODIFY | Принять clock через options, убрать Date.now/new Date |
| `core/sim/engine_paper.mjs` | MODIFY | Принять clock через ctx, убрать new Date |
| `core/data/provider_bybit_public.mjs` | MODIFY | Добавить `enforceNetGuard()` |
| `core/data/provider_binance_live.mjs` | MODIFY | Добавить `enforceNetGuard()` |
| `core/data/provider_kraken_live.mjs` | MODIFY | Добавить `enforceNetGuard()` |
| `core/data/provider_coingecko_live.mjs` | MODIFY | Добавить `enforceNetGuard()` |
| `scripts/verify/regression_nd_*.mjs` | CREATE | 6 новых regression gate scripts |
| `scripts/verify/regression_net_guard01.mjs` | CREATE | NET guard enforcement gate |
| `scripts/verify/regression_perf_budget01.mjs` | CREATE | Performance ms-per-gate gate |
| `specs/roadmap_v1/SPRINT_0_COURT_WIRING_SPEC.md` | MODIFY | Исправить runCandidatePipeline → runEdgeLabPipeline |

---

## 3. ИНВАРИАНТЫ

| ID | Инвариант | Как проверить |
|----|-----------|--------------|
| INV-S4-1 | Нет `Math.random()` в core/**/*.mjs кроме `sys/rng.mjs` | `grep -rn "Math.random" core/ \| grep -v sys/rng.mjs \| wc -l` = 0 |
| INV-S4-2 | Нет bare `Date.now()` в core/**/*.mjs кроме `sys/clock.mjs` | `grep -rn "Date.now()" core/ \| grep -v sys/clock.mjs \| wc -l` = 0 |
| INV-S4-3 | Нет bare `new Date()` в core/**/*.mjs кроме `sys/clock.mjs` | `grep -rn "new Date()" core/ \| grep -v sys/clock.mjs \| wc -l` = 0 |
| INV-S4-4 | Все fetch() в core/data/ за enforceNetGuard() | Каждый provider файл содержит `enforceNetGuard` |
| INV-S4-5 | Sprint 0 spec не содержит runCandidatePipeline (кроме Variant B описания) | grep count в spec <= 2 (описание вариантов) |
| INV-S4-6 | ms_per_gate <= 80ms | regression_perf_budget01 PASS |
| INV-S4-7 | verify:fast x2 PASS | Стандартная проверка |
| INV-S4-8 | e108 x2 PASS | Стандартная проверка |

---

## 4. REGRESSION GATES (8 новых)

| # | Gate ID | Скрипт | Что проверяет | Evidence |
|---|---------|--------|--------------|---------|
| 1 | `regression_nd_runid01_no_bare_random` | `regression_nd_runid01.mjs` | Нет Math.random в repo_state.mjs | `gates/manual/regression_nd_runid01.json` |
| 2 | `regression_nd_court01_no_bare_datenow` | `regression_nd_court01.mjs` | Нет Date.now/new Date в court_v2.mjs | `gates/manual/regression_nd_court01.json` |
| 3 | `regression_nd_exec01_no_bare_clock` | `regression_nd_exec01.mjs` | Нет Date.now/new Date в e122_*.mjs | `gates/manual/regression_nd_exec01.json` |
| 4 | `regression_nd_paper01_no_bare_clock` | `regression_nd_paper01.mjs` | Нет new Date в engine_paper.mjs | `gates/manual/regression_nd_paper01.json` |
| 5 | `regression_net_guard01_all_fetchers_gated` | `regression_net_guard01.mjs` | Все provider fetch за NET guard | `gates/manual/regression_net_guard01.json` |
| 6 | `regression_perf_budget01_ms_per_gate` | `regression_perf_budget01.mjs` | ms/gate <= 80ms | `gates/manual/regression_perf_budget01.json` |
| 7 | `regression_nd_san_extended01` | расширить `regression_san01` | Глобальный ND scan для core/ | Обновить существующий |
| 8 | `regression_spec_drift01_sprint0_fixed` | `regression_spec_drift01.mjs` | Sprint 0 spec не содержит runCandidatePipeline в инвариантах | `gates/manual/regression_spec_drift01.json` |

---

## 5. RISKS

| Риск | Вероятность | Импакт | Митигация |
|------|-----------|--------|-----------|
| ctx.clock не передаётся в court_v2 callsites | Высокая | P0 — court рушится | Сделать clock параметром с fallback на SystemClock + warning |
| enforceNetGuard import loop | Низкая | build fail | Проверить import chain |
| Perf budget gate добавляет время к verify:fast | Средняя | Цикличность | Gate должен быть < 50ms (просто time + math) |
| regression_san01 ломается от расширения | Средняя | CI break | Расширять через отдельный файл, не ломать существующий |

---

## 6. DoD (Definition of Done)

- [ ] Все 6 P0 ND-багов исправлены (ND-01..ND-05, NET-01)
- [ ] Sprint 0 spec drift исправлен (12 мест)
- [ ] Performance Law V2 задокументирован и regression gate добавлен
- [ ] 8 новых regression gates PASS
- [ ] Все 50 pre-existing gates PASS
- [ ] verify:fast x2 PASS (0 расхождений)
- [ ] e108 x2 PASS (0 расхождений)
- [ ] Total gates: 58 PASS
- [ ] Performance: ms_per_gate <= 80ms
- [ ] ops:doctor — liveness score улучшен (>= 50/100 total)

---

## 7. EXECUTION ORDER

```
Step 1: Исправить core/persist/repo_state.mjs (ND-01)
Step 2: Исправить core/court/court_v2.mjs (ND-02, ND-03)
Step 3: Исправить core/execution/e122_execution_adapter_v3.mjs (ND-04)
Step 4: Исправить core/sim/engine_paper.mjs (ND-05)
Step 5: Исправить core/data/provider_*_live.mjs (NET-01) — 4 файла
Step 6: Исправить specs/roadmap_v1/SPRINT_0_COURT_WIRING_SPEC.md (DRIFT-01)
Step 7: Создать 8 regression gate scripts
Step 8: Подключить гейты к verify:fast
Step 9: npm run -s verify:fast x2
Step 10: node scripts/verify/e108_backtest_determinism_x2_contract.mjs x2
Step 11: Аудит (AUDIT_AFTER_SPRINT_4.md)
```

---

## 8. ROLLBACK

Если гейты ломаются:
1. `git stash` изменений core/
2. Восстановить из git: `git checkout HEAD -- core/`
3. Убрать новые гейты из verify:fast chain
4. Подтвердить: `npm run -s verify:fast` = 50/50 PASS
