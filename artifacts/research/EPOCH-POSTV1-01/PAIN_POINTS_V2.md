# PAIN POINTS V2 — EPOCH-POSTV1-01

## Методология

Источники: автоматический анализ кода, proof runs x2, spec drift analysis.
Severity: P0=блокер, P1=серьёзный, P2=умеренный, P3=низкий.

---

## P0 — БЛОКЕРЫ (требуют исправления до production)

| ID | Symptom | Root Cause | Evidence | Fix | Regression Gate |
|----|---------|-----------|----------|-----|-----------------|
| ND-01 | Run ID недетерминистичен | `Math.random()` в `core/persist/repo_state.mjs:256` | grep "Math.random" repo_state.mjs | Заменить на `crypto.randomBytes()` или `DeterministicRNG` + seed | `regression_nd_runid01_no_bare_random` |
| ND-02 | Court reports нерепродуцируемы | `Date.now()` в `core/court/court_v2.mjs:36,52` | grep "Date.now" court_v2.mjs | Использовать `ctx.clock.now()` | `regression_nd_court01_no_bare_datenow` |
| ND-03 | Court output нерепродуцируем | `new Date().toISOString()` в `core/court/court_v2.mjs:248` | grep "new Date" court_v2.mjs | Использовать `ctx.clock.toISOString()` | То же что ND-02 |
| ND-04 | Execution timestamps нерепродуцируемы | `Date.now()` + `new Date()` в `core/execution/e122_execution_adapter_v3.mjs:34,37,41,44,47,50` | grep "Date.now\|new Date" e122_*.mjs | Инжектировать clock через ctx | `regression_nd_exec01_no_bare_clock` |
| ND-05 | Paper trading output нерепродуцируем | `new Date().toISOString()` в `core/sim/engine_paper.mjs:376` | grep "new Date" engine_paper.mjs | Инжектировать clock через ctx | `regression_nd_paper01_no_bare_clock` |
| NET-01 | Fetch без гейта в data providers | 4 провайдера (`provider_bybit_public.mjs:5`, `provider_binance_live.mjs:7`, `provider_kraken_live.mjs:7`, `provider_coingecko_live.mjs:7`) не проверяют `ENABLE_NET` | grep "fetch(" provider_*.mjs | Добавить `if (!process.env.ENABLE_NET) throw Error('NET_FORBIDDEN')` | `regression_net_guard01_all_fetchers_gated` |

## P1 — СЕРЬЁЗНЫЕ (необходимо до live trading)

| ID | Symptom | Root Cause | Evidence | Fix | Regression Gate |
|----|---------|-----------|----------|-----|-----------------|
| ND-06 | Mock data недетерминистичен | `Math.random()` в `core/data/websocket_feed.mjs:281,288` | grep "Math.random" websocket_feed.mjs | Использовать `SeededRNG` | `regression_nd_mock01_seeded_rng` |
| ND-07 | Live adapter mock PnL random | `Math.random()` в `core/exec/adapters/live_adapter.mjs:324` | grep "Math.random" live_adapter.mjs | Использовать `SeededRNG` или убрать mock | `regression_nd_adapter01_no_random_pnl` |
| ND-08 | Perf engine ID random | `Math.random()` в `core/performance/perf_engine.mjs:67` | grep "Math.random" perf_engine.mjs | Использовать `crypto.randomUUID()` или sequential | `regression_nd_perf01_stable_id` |
| ND-09 | Circuit breaker timing | `Date.now()` в `core/resilience/self_healing.mjs:37,72,91` | grep "Date.now" self_healing.mjs | Инжектировать clock | `regression_nd_resilience01_clock_injectable` |
| ND-10 | Fixture load order | `readdirSync()` без `.sort()` в `core/exec/adapters/live_adapter_dryrun.mjs:64` | grep "readdirSync" live_adapter_dryrun.mjs | Добавить `.sort()` | `regression_nd_readdir01_sorted` |
| PROFIT-01 | Kill switch не подключён к live loop | Инфраструктура построена, но evaluator не вызывается из live runner | Архитектурный анализ Sprint 3 | Wiring Sprint 5 | `regression_profit_ks_wired01` |
| PROFIT-02 | Position sizer не подключён к orders | Tier enforcement работает изолированно | Архитектурный анализ Sprint 3 | Wiring Sprint 5 | `regression_profit_sizer_wired01` |
| PROFIT-03 | Reconcile только mock | Drift detection работает, но нет real exchange adapter | Архитектурный анализ Sprint 3 | Wiring Sprint 5 | `regression_profit_recon_live01` |
| SPEC-01 | Sprint 0 spec drift: 12 мест говорят runCandidatePipeline | Вариант A выбран (runEdgeLabPipeline), спека не обновлена | SPEC_DRIFT_REPORT.md DRIFT-01 | Обновить спеку | Ручная верификация |
| PERF-01 | Performance budget 15% нарушен кумулятивно | Правило не масштабируется с ростом гейтов | SPEC_DRIFT_REPORT.md DRIFT-02 | Новый Performance Law (ms-per-gate) | `regression_perf_budget01_ms_per_gate` |

## P2 — УМЕРЕННЫЕ

| ID | Symptom | Root Cause | Evidence | Fix | Regression Gate |
|----|---------|-----------|----------|-----|-----------------|
| ND-11 | Object.keys не отсортированы | `core/edge/monte_carlo.mjs:208-214`, `overfit_court.mjs:153`, `anomaly_detector.mjs:112` | grep "Object.keys" без .sort() | Добавить `.sort()` | `regression_nd_objkeys01_sorted` |
| ND-12 | EventLog fallback на Date.now() | `core/obs/event_log.mjs:103,116,129`, `event_log_v2.mjs:145,260,275,290` | grep "Date.now" event_log*.mjs | Сделать ts_ms обязательным (not optional) | `regression_nd_eventlog01_ts_required` |
| NET-02 | Cost calibration fetch без guard | `core/execution/e112_cost_calibration.mjs:19` | grep "fetch" e112_*.mjs | Добавить NET guard | Включить в regression_net_guard01 |
| SUPPLY-01 | 1 moderate npm vulnerability | npm audit (отложен — нет сети) | Нужна сеть для проверки | `npm audit` при ALLOW_NETWORK | Мониторинг |

## P3 — НИЗКИЕ

| ID | Symptom | Root Cause | Evidence | Fix | Regression Gate |
|----|---------|-----------|----------|-----|-----------------|
| ND-13 | MockExchange random failure | `Math.random()` в `mock_exchange.mjs:45` | grep | Приемлемо для тестовой дисперсии | Не нужен |
| ND-14 | Temp file naming с Date.now() | `scripts/verify/e135_lib.mjs:27` | grep | Приемлемо (temp files) | Не нужен |
| ENV-01 | Env drift если переменные не установлены | Все gates бросают ошибки | Код fail-safe | Документировать .env.example | Мониторинг |

---

## Статистика

| Severity | Количество | Блокирует production? |
|----------|-----------|----------------------|
| P0 | 6 | ДА — Sprint 4 обязателен |
| P1 | 11 | ДА для live trading — Sprint 4+5 |
| P2 | 4 | НЕТ — мониторинг / Sprint 6 |
| P3 | 3 | НЕТ — приемлемо |
| **ИТОГО** | **24** | |
