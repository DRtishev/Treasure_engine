# ND INVENTORY — EPOCH-V2-START (ДО ПРАВОК)

> Полный скан `core/` на sources of nondeterminism.
> Дата: 2026-03-04. Метод: grep + ручная классификация.

---

## Статистика

| Категория | Кол-во точек | P0 | P1 | P2 | Excluded |
|-----------|-------------|----|----|-----|----------|
| Math.random() | 14 | 1 | 2 | 2 | 9 (sys/rng.mjs + mock) |
| Date.now() | 95+ | 4 | 12 | 40+ | 30+ (net/live/test) |
| new Date() | 14 | 3 | 2 | 2 | 7 (parsing/display) |
| readdirSync без .sort() | 1 | 0 | 1 | 0 | 0 |
| **ИТОГО P0** | — | **8** | — | — | — |

---

## P0 — БЛОКЕРЫ (Sprint 4 scope)

### ND-P0-01: Math.random() в repo_state._generateRunId
- **Файл:** `core/persist/repo_state.mjs:256`
- **Код:** `Math.random().toString(36).substring(2, 8)`
- **Импакт:** Run ID недетерминистичен → невозможно воспроизвести сессию
- **Закон:** HYBRID — в CERT/CI: RUN_ID_REQUIRED, в dev: crypto.randomUUID()

### ND-P0-02: Date.now() в court_v2 defaults
- **Файл:** `core/court/court_v2.mjs:36,52,177,232`
- **Код:** `last_data_timestamp: Date.now()`, `evaluation_timestamp: Date.now()`
- **Импакт:** Court reports нерепродуцируемы

### ND-P0-03: new Date() в court_v2 output
- **Файл:** `core/court/court_v2.mjs:248`
- **Код:** `generated_at: new Date().toISOString()`
- **Импакт:** Court report timestamp различается при каждом запуске

### ND-P0-04: Date.now() + new Date() в e122 adapter
- **Файл:** `core/execution/e122_execution_adapter_v3.mjs:34,37,41,44,47,50`
- **Код:** `Date.now()` в orderRef fallback, `new Date().toISOString()` в transitions
- **Импакт:** Execution traces нерепродуцируемы

### ND-P0-05: new Date() в engine_paper output
- **Файл:** `core/sim/engine_paper.mjs:376`
- **Код:** `timestamp: new Date().toISOString()`
- **Импакт:** Paper trade output нерепродуцируем

### ND-P0-06: Date.now() в engine_paper runId
- **Файл:** `core/sim/engine_paper.mjs:301`
- **Код:** `runId = \`paper_${Date.now()}_${crypto.randomBytes(4).toString('hex')}\``
- **Импакт:** Paper run ID нерепродуцируем

---

## P1 — СЕРЬЁЗНЫЕ (Sprint 4 stretch / Sprint 5)

### ND-P1-01: Math.random() в perf_engine
- **Файл:** `core/performance/perf_engine.mjs:67`
- **Код:** `id: Math.random().toString(36).slice(2)`

### ND-P1-02: Math.random() в websocket_feed mock
- **Файл:** `core/data/websocket_feed.mjs:281,288`
- **Код:** `Math.random()` для mock price/volume

### ND-P1-03: Math.random() в live_adapter mock PnL
- **Файл:** `core/exec/adapters/live_adapter.mjs:324`
- **Код:** `Math.random() * 10 - 5`

### ND-P1-04: readdirSync без .sort()
- **Файл:** `core/exec/adapters/live_adapter_dryrun.mjs:64`
- **Код:** `readdirSync(this.options.fixtures_dir)` без .sort()

### ND-P1-05..12: Date.now() fallback в master_executor, event_log_v2, reconcile, safety_monitor и др.
- **Файлы:** master_executor.mjs (10+ мест), event_log_v2.mjs (6), reconcile_v1.mjs (2), safety_monitor.mjs (3)
- **Паттерн:** `ctx?.clock?.now() || Date.now()` — хороший паттерн (fallback), но в CERT режиме fallback не должен срабатывать

---

## P2 — УМЕРЕННЫЕ (Sprint 6+)

- Object.keys без .sort() в monte_carlo, overfit_court, anomaly_detector
- Date.now() в governance/mode_fsm, multi_strategy, risk_governor (с injectable nowProvider)
- Date.now() в testing/chaos_engineer, adversarial_tester (тестовый контекст)

---

## EXCLUDED (не являются ND-проблемой)

| Файл | Причина исключения |
|------|--------------------|
| `core/sys/rng.mjs` | SSOT для рандома, Math.random() в fallback = by design |
| `core/sys/clock.mjs` | SSOT для времени, Date.now() в fallback = by design |
| `core/exec/adapters/mock_exchange.mjs:45` | Mock failure rate = by design |
| `core/net/transport.mjs` | Network timing = by design |
| `core/net/e129_transport_dialer.mjs` | Network timing = by design |
| `core/live/exchanges/bybit_rest_testnet.mjs` | Live exchange = by design (real time required) |
| `core/exec/adapters/binance_client.mjs` | Live exchange = by design |
| `core/backtest/engine.mjs:61` | `new Date(bar.ts_open)` = parsing, not generation |
| `core/edge/fill_record_contract.mjs:20` | `new Date(ts)` = parsing, not generation |

---

## ВЫВОД

**Sprint 4 scope (P0):** 6 точек в 4 файлах + 1 SAN gate на новые introductions.
**Sprint 4 stretch (P1):** 4 точки (perf_engine, websocket, live_adapter, dryrun readdir).
**Общая поверхность:** Огромная (~95+ Date.now), но большинство — в live/net/test контексте с injectable providers.
**Стратегия:** Fix P0 (determinism-critical path) + SAN gate для предотвращения новых P0.
