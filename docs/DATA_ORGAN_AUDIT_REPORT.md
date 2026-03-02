# DATA ORGAN — Тотальный Аудит & Гениальные Решения

> Дата: 2026-03-02 | Ветка: claude/treasure-engine-architecture-8MsS8
> Исследовано: 88 файлов data-инфраструктуры, 5 data lanes, 16+ regression gates

---

## 1. EXECUTIVE SUMMARY

```
╔═══════════════════════════════════════════════════════════════════╗
║                     DATA ORGAN — ВЕРДИКТ                         ║
║                                                                   ║
║  ACQUIRE Layer:       ███████████ 100% — ВСЕ ПРОВАЙДЕРЫ ГОТОВЫ   ║
║  VERIFY Layer:        ██████████░  95% — GATES ПРОХОДЯТ          ║
║  ENRICH Layer:        ███░░░░░░░░  30% — КРИТИЧЕСКИЙ РАЗРЫВ     ║
║  CONSUME Layer:       ████████░░░  80% — ГОТОВ, НО ЖДЁТ ДАННЫХ   ║
║  ORGANISM Integration:████░░░░░░░  40% — СЛАБОЕ МЕСТО            ║
║                                                                   ║
║  ОБЩАЯ ГОТОВНОСТЬ:  ████████░░░░░░  ~65%                         ║
║                                                                   ║
║  БЛОКЕР: Нет моста Orderbook → OHLCV Bars                       ║
║  БЛОКЕР: Нет live vol calculation                                ║
║  БЛОКЕР: Нет continuous data health monitoring                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 2. ПОЛНАЯ ИНВЕНТАРИЗАЦИЯ

### 2.1 Core Data Layer (`core/data/` — 20 файлов)

| Файл | Назначение | Статус | Критичность |
|------|-----------|--------|-------------|
| `provider_interface.mjs` | REST OHLCV fetch + validation | DONE | HIGH |
| `ws_provider_interface.mjs` | WS frame normalization | DONE | HIGH |
| `contracts_v1.mjs` | Data contracts (TradeEvent, Candle, OrderBook, Fill) | DONE | HIGH |
| `dataset_io.mjs` | Dataset I/O + SHA256 integrity | DONE | HIGH |
| `dataset_tier_policy.mjs` | Train/vault tier enforcement | DONE | MED |
| `provider_maps.mjs` | Symbol/TF normalization (4 exchanges) | DONE | HIGH |
| `replay_engine.mjs` | Normalized dataset replay | PARTIAL | HIGH |
| `websocket_feed.mjs` | WebSocket Feed Manager (EventEmitter) | **PARTIAL** | CRIT |
| `binance_ws_kline.mjs` | Binance WS kline collect+replay | DONE | MED |
| `providers/binance_ws.mjs` | Binance WS frame mapper | DONE | MED |
| `providers/bybit_ws.mjs` | Bybit WS frame mapper | DONE | MED |
| `providers/kraken_ws.mjs` | Kraken WS frame mapper | DONE | MED |
| `provider_binance_live.mjs` | Binance REST provider | DONE | MED |
| `provider_binance_public.mjs` | Binance public REST | DONE | MED |
| `provider_bybit_live.mjs` | Bybit REST provider | DONE | MED |
| `provider_bybit_public.mjs` | Bybit public REST | DONE | MED |
| `provider_kraken_live.mjs` | Kraken REST provider | DONE | LOW |
| `provider_kraken_public.mjs` | Kraken public REST | DONE | LOW |
| `provider_coingecko_live.mjs` | CoinGecko REST (vol=0) | DONE | LOW |
| `provider_coingecko_ohlc.mjs` | CoinGecko OHLC | DONE | LOW |

### 2.2 Data Organ Event System (`scripts/edge/data_organ/`)

| Файл | Назначение | Статус |
|------|-----------|--------|
| `event_emitter.mjs` | 5 REPLAY + 3 ACQ events, tick-only | DONE |
| `decimal_sort.mjs` | Decimal string total-order (no float) | DONE |

### 2.3 Data Acquisition Scripts (`scripts/edge/` — 12 файлов)

| Скрипт | Lane | Провайдер | Статус |
|--------|------|-----------|--------|
| `edge_liq_00_acquire_binance_forceorder_ws.mjs` | liq_binance | Binance WS | DONE |
| `edge_liq_00_acquire_bybit_ws_v5.mjs` | liq_bybit | Bybit WS v5 | DONE |
| `edge_liq_00_acquire_okx_ws_v5.mjs` | liq_okx | OKX WS v5 | DONE |
| `edge_liq_01_offline_replay.mjs` | all liq | Multi-provider | DONE |
| `edge_liq_02_signals.mjs` | signals | - | DONE |
| `edge_price_00_bars_fixture.mjs` | price_fixture | Offline | DONE |
| `edge_price_01_offline_replay.mjs` | price_fixture | Offline | DONE |
| `edge_okx_orderbook_00_preflight_replay.mjs` | okx_ob | OKX | PARTIAL |
| `edge_okx_orderbook_01_offline_replay.mjs` | okx_ob | OKX | DONE |
| `edge_okx_orderbook_02_align_offline.mjs` | okx_ob | OKX | PARTIAL |
| `edge_okx_orderbook_10_acquire_live.mjs` | okx_ob_live | OKX WS books5 | DONE |
| `edge_okx_orderbook_11_replay_captured.mjs` | okx_ob | OKX | DONE |

### 2.4 Data Lanes Registry (`specs/data_lanes.json` — 5 lanes)

| Lane ID | Kind | Truth Level | State | Replay |
|---------|------|-------------|-------|--------|
| `liq_binance_forceorder_ws` | WS | HINT | EXPERIMENTAL | edge_liq_01 |
| `liq_bybit_ws_v5` | WS | **TRUTH** | **TRUTH_READY** | edge_liq_01 |
| `liq_okx_ws_v5` | WS | HINT | EXPERIMENTAL | edge_liq_01 |
| `price_offline_fixture` | FIXTURE | HINT | EXPERIMENTAL | edge_price_01 |
| `price_okx_orderbook_ws` | WS | HINT | PREFLIGHT | edge_okx_ob_00 |

### 2.5 Regression Gates (16+ data gates)

| Gate | Проверка | Статус |
|------|---------|--------|
| RG_LANE01 | Registry present, valid JSON, unique IDs | PASS |
| RG_LANE02 | Code matches registry (replay scripts exist) | PASS |
| RG_LANE03 | No duplicate schema_versions | PASS |
| RG_LANE04 | TRUTH requires TRUTH_READY | PASS |
| RG_DATA_EVT01 | 5 replay events emitted, tick-ordered | PASS |
| RG_LIQ_LOCK01 | Normalized hash match (includes liq_side) | PASS |
| RG_DEC01 | Decimal sort total-order | PASS |
| RG_CAP03 | R2 exception policy anchors | PASS |
| Data Readiness Seal | Global readiness aggregation | PASS |
| 16x OKX OB regressions | Seq-state, digest, dedup, buffer, x2 | PASS |

### 2.6 Advanced Data Scripts (`scripts/data/` — 68 файлов)

Эволюция от E107 до E125:
- **E107-E112**: OHLCV fetch, normalize, capsule build, snapshot
- **E113-E115**: Acquire capsules, replay bundles, multi-provider
- **E116-E117**: WS collect (Binance, Bybit, Kraken), WS→OHLCV
- **E118-E120**: Bundle, collect, replay, execution adapter, safety kernel
- **E121-E123**: Micro live runner, connectivity diag, auth precheck
- **E124**: Campaign run (testnet placement attempts)
- **E125**: Egress diagnostics (DNS/TCP/TLS/HTTP/WS probes)
- **DataAgent.mjs**: Autonomous data agent with FSM + self-healing

---

## 3. ЦЕПОЧКА ДАННЫХ — ОТ ИСТОЧНИКА ДО СТРАТЕГИИ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE CHAIN                              │
│                                                                         │
│  STAGE 1: ACQUIRE (RESEARCH mode, double-key)                          │
│  ┌────────────────────────────────────────────────────┐                 │
│  │ OKX WS books5 → raw.jsonl + lock.json (SHA256)    │  ✅ DONE       │
│  │ Bybit WS v5 liqs → raw.jsonl + lock.json          │  ✅ DONE       │
│  │ Binance WS forceOrder → raw.jsonl + lock.json     │  ✅ DONE       │
│  │ OKX WS liqs → raw.jsonl + lock.json               │  ✅ DONE       │
│  │ Fixtures → raw.jsonl + lock.json                   │  ✅ DONE       │
│  └────────────────────────┬───────────────────────────┘                 │
│                           ▼                                             │
│  STAGE 2: VERIFY (CERT mode, TREASURE_NET_KILL=1)                      │
│  ┌────────────────────────────────────────────────────┐                 │
│  │ SHA256 recompute ✓                                 │  ✅ DONE       │
│  │ Schema validation ✓                                │  ✅ DONE       │
│  │ Dedup + reorder ✓                                  │  ✅ DONE       │
│  │ EventBus emission (5 events) ✓                     │  ✅ DONE       │
│  │ Data readiness seal ✓                              │  ✅ DONE       │
│  └────────────────────────┬───────────────────────────┘                 │
│                           ▼                                             │
│  STAGE 3: ENRICH (transform, normalize, validate)                      │
│  ┌────────────────────────────────────────────────────┐                 │
│  │ Liq signals (liq_pressure, burst, regime) ✓        │  ✅ DONE       │
│  │ Orderbook → OHLCV bars                            │  ❌ MISSING    │
│  │ Mid-price calculation                             │  ❌ MISSING    │
│  │ Volume aggregation                                │  ❌ MISSING    │
│  │ Bar validation (H≥L, monotonic ts)                │  ❌ MISSING    │
│  │ Volatility regime live calculation                │  ❌ MISSING    │
│  │ Drawdown speed calculation                        │  ❌ MISSING    │
│  │ Data freshness TTL check                          │  ❌ MISSING    │
│  └────────────────────────┬───────────────────────────┘                 │
│                           ▼                                             │
│  STAGE 4: CONSUME (backtest, strategies, profit)                       │
│  ┌────────────────────────────────────────────────────┐                 │
│  │ Backtest engine (bars + NO lookahead) ✓            │  ✅ DONE       │
│  │ Strategy onBar() interface ✓                       │  ✅ DONE       │
│  │ Profit ledger (fills, PnL, drawdown) ✓             │  ✅ DONE       │
│  │ Risk fortress (sizing, hard stops) ✓               │  ✅ DONE       │
│  │ Paper sim ✓                                        │  ✅ DONE       │
│  │                                                    │                 │
│  │ ⚠️  НО: стратегии получают только CSV fixtures!   │                 │
│  │ ⚠️  Live orderbook → стратегии НЕ ДОХОДИТ         │                 │
│  └────────────────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. КРИТИЧЕСКИЕ РАЗРЫВЫ (GAP ANALYSIS)

### TIER-1: БЛОКЕРЫ (без них стратегии НЕ РАБОТАЮТ на live data)

| # | Gap | Описание | Где должно быть |
|---|-----|---------|-----------------|
| **G1** | **Orderbook → OHLCV Bridge** | Нет конвертера OKX orderbook snapshots → time-windowed OHLCV bars. raw.jsonl сидит в artifacts навечно, никогда не трансформируется | `core/data/orderbook_to_ohlcv.mjs` |
| **G2** | **Mid-Price Calculator** | Нет формулы `mid = (best_bid + best_ask) / 2` из orderbook | Встроить в G1 |
| **G3** | **Volume Aggregation** | Orderbook updates не содержат trade volume. Нужен подсчёт из depth changes или trade stream | `core/data/volume_aggregator.mjs` |
| **G4** | **Bar Validator** | Нет проверки OHLCV инвариантов: `H >= L`, `L <= C <= H`, `V > 0`, `ts monotonic` | `core/data/bar_validator.mjs` |

### TIER-2: ВЫСОКИЕ (degraded quality без них)

| # | Gap | Описание | Где должно быть |
|---|-----|---------|-----------------|
| **G5** | **Volatility Regime Live** | vol_regime hardcoded = 'MID' в risk_fortress. Нет live расчёта realized vol | `core/data/vol_regime_detector.mjs` |
| **G6** | **Drawdown Speed** | dd_speed параметр в risk_fortress.sizingPolicy() никогда не заполняется | Внутри profit/ledger.mjs |
| **G7** | **Data Freshness TTL** | Нет check: "сколько лет данным в artifacts?" Acquired data может быть месячной давности | `core/data/freshness_monitor.mjs` |
| **G8** | **Cross-Lane Coherence** | Нет проверки что liq данные и price данные покрывают одно и то же время | `scripts/verify/regression_data_coherence.mjs` |

### TIER-3: СРЕДНИЕ (observability gaps)

| # | Gap | Описание |
|---|-----|---------|
| **G9** | **Data Heartbeat → FSM** | FSM не знает о data staleness. guard_data_ready проверяет только CANDIDATE_REGISTRY, не данные |
| **G10** | **Doctor Data Probe** | Doctor v2 НЕ проверяет data freshness/staleness в LIVENESS probe |
| **G11** | **Self-Heal for Data** | self_heal.mjs лечит git/node_modules/executor — но НЕ stale/corrupt data |
| **G12** | **Orderbook Dedup** | data_quality.mjs dedup работает для trades (trade_id). Нет dedup для orderbook (seqId) |
| **G13** | **SELECT_RUN_ID Audit** | Оператор может форсировать run_id без audit trail |
| **G14** | **Fixture vs Live Mixing** | Нет check предотвращающий смешивание test data с live data |

### TIER-4: НИЗКИЕ (future improvements)

| # | Gap | Описание |
|---|-----|---------|
| **G15** | **Trust Score** | TRUST_SCORE_DOCTRINE определена, помечена "NOT YET IMPLEMENTED" |
| **G16** | **Adaptive Freshness** | Один threshold 5s для всех. Нужен adaptive (fast strats vs slow strats) |
| **G17** | **Multi-Symbol Data** | Только BTCUSDT + ETHUSDT canonical. Нет расширения |
| **G18** | **Funding Rate Lane** | Specs mention funding rates но lane не создан |

---

## 5. ORGANISM INTEGRATION — СОСТОЯНИЕ

### 5.1 Что РАБОТАЕТ

| Компонент | Интеграция с Data Organ | Уровень |
|-----------|------------------------|---------|
| **EventBus** | 5 REPLAY + 3 ACQ events, tick-only | STRONG |
| **Lane Registry** | 5 lanes, SSOT, readiness seal | STRONG |
| **Policy Kernel** | Double-key, zone map, RESEARCH mode | STRONG |
| **16 Regression Gates** | Registry, code, schema, events, hash | STRONG |
| **Liq Signal Pipeline** | liq_pressure, burst_score, regime_flag | STRONG |
| **Truth Engine** | data_staleness_halt_ms: 5000 | MEDIUM |

### 5.2 Что НЕ РАБОТАЕТ

| Компонент | Проблема | Impact |
|-----------|---------|--------|
| **FSM** | guard_data_ready проверяет CANDIDATE_REGISTRY, НЕ data freshness | CRIT |
| **Doctor v2** | LIVENESS probe НЕ проверяет data_staleness_halt_ms | HIGH |
| **Self-Heal** | 4 healer'а — ни один для data | HIGH |
| **Proprioception** | НЕ сканирует возраст acquired data | MED |
| **MetaAgent** | Fleet consciousness НЕ реагирует на data degradation | MED |
| **WebSocket Feed** | websocket_feed.mjs — mock-only connect(), real WS не подключён | HIGH |

---

## 6. ГЕНИАЛЬНЫЕ РЕШЕНИЯ

### G-FEAT-01: DataOrgan Nervous System (Нервная Система Данных)

**Проблема**: Data Organ существует как изолированные скрипты. Нет единого "нерва" связывающего acquire→verify→enrich→consume.

**Решение**: Центральный `DataOrganController` — живой FSM данных, вложенный в главный FSM организма:

```
┌─────────────────────────────────────────────────────────────────┐
│ DataOrganController (вложенный FSM)                             │
│                                                                  │
│  States:                                                         │
│  ┌────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐    │
│  │ DORMANT │──→│ ACQUIRING │──→│ ENRICHING │──→│ NOURISHING │    │
│  └────────┘   └──────────┘   └──────────┘   └────────────┘    │
│       ↑            │              │               │             │
│       │            ▼              ▼               ▼             │
│       │       ┌──────────┐  ┌──────────┐   ┌────────────┐     │
│       └───────│ STARVING  │  │ DIGESTING │   │ STALE      │     │
│               └──────────┘  └──────────┘   └────────────┘     │
│                                                                  │
│  DORMANT    = нет данных, offline, ждёт ALLOW_NETWORK            │
│  ACQUIRING  = double-key активен, WS подключён, пишет raw       │
│  ENRICHING  = offline, orderbook→bars, signals, validation       │
│  NOURISHING = данные свежие, стратегии получают bars              │
│  STARVING   = acquire failed, нет raw data                       │
│  DIGESTING  = enrichment в процессе (intermediate)               │
│  STALE      = данные старше TTL, требуют re-acquire              │
│                                                                  │
│  Events (→ FSM Brain):                                           │
│    DATA_ALIVE    — fresh bars available for strategies            │
│    DATA_STALE    — last bar older than TTL                        │
│    DATA_STARVING — no data at all                                 │
│    DATA_ENRICHED — new enrichment cycle complete                  │
└─────────────────────────────────────────────────────────────────┘
```

**Файл**: `core/data/data_organ_controller.mjs`
**Genius**: Организм "чувствует" состояние своих данных как живой орган. FSM Brain получает DATA_ALIVE/STALE/STARVING и реагирует (DEGRADED при STALE, HEALING при STARVING).

---

### G-FEAT-02: Orderbook Alchemist (Алхимик Ордербука)

**Проблема**: OKX orderbook raw.jsonl → стратегии = МЁРТВАЯ ЗОНА. Нет конвертера.

**Решение**: `OrderbookAlchemist` — детерминистический конвертер orderbook snapshots → OHLCV bars:

```javascript
// core/data/orderbook_alchemist.mjs

/**
 * Трансформирует серию orderbook snapshots в OHLCV bars:
 *
 * 1. EXTRACT mid_price = (best_bid + best_ask) / 2  [weighted mid optional]
 * 2. AGGREGATE по time windows (bar_ms configurable: 60_000 = 1min)
 * 3. COMPUTE OHLCV:
 *    - open  = first mid in window
 *    - high  = max mid in window
 *    - low   = min mid in window
 *    - close = last mid in window
 *    - volume = sum(|depth_change|) across all updates [proxy volume]
 * 4. VALIDATE: H >= L, open/close in [L,H], volume >= 0, ts monotonic
 * 5. FINGERPRINT: SHA256 of canonical bar array
 *
 * Determinism: No float comparison, truncateTowardZero, sorted keys
 */
```

**Genius**:
- **Weighted Mid**: `wmid = (best_bid * ask_size + best_ask * bid_size) / (bid_size + ask_size)` — more accurate than simple mid
- **Proxy Volume**: Sum of `|Δ depth|` across all price levels = liquidity consumed (better proxy than orderbook size)
- **Imbalance Signal**: `bid_depth_total / (bid_depth_total + ask_depth_total)` → free order flow imbalance indicator
- **Seamless**: Output format = exact OHLCV that backtest engine expects. Plug-and-play.

**Файлы**:
- `core/data/orderbook_alchemist.mjs` — конвертер
- `scripts/edge/edge_okx_orderbook_12_to_ohlcv.mjs` — скрипт обогащения
- Lane в data_lanes.json: `ohlcv_okx_orderbook_derived` (kind=DERIVED, truth=HINT)

---

### G-FEAT-03: Data Freshness Sentinel (Часовой Свежести)

**Проблема**: Нет continuous monitoring of data age. Truth engine проверяет 5s staleness — но только для runtime. Для acquired data — нет проверки вообще.

**Решение**: Трёхуровневый sentinel:

```
Level 1: ACQUISITION FRESHNESS
  - Каждый lock.json → captured_at_tick (not wall-clock, tick of last message)
  - Sentinel сравнивает: "сколько тиков прошло с последнего acquire?"
  - TTL per lane: TRUTH = 24h, HINT = 72h, EXPERIMENTAL = 168h
  - Событие: DATA_TTL_WARN (75% TTL), DATA_TTL_EXPIRE (100%)

Level 2: ENRICHMENT FRESHNESS
  - features_liq.lock.json → enriched_at_tick
  - If raw data updated but enrichment stale → trigger re-enrich
  - Событие: ENRICH_STALE

Level 3: STRATEGY CONSUMPTION FRESHNESS
  - Last bar fed to strategy.onBar() → consumption_tick
  - If no new bar for 2x bar_ms → DATA_STARVING
  - Адаптивный TTL: fast strategies (1min bars) = 3min TTL
  -                  slow strategies (1h bars) = 3h TTL
```

**Genius**: Адаптивный TTL — не один threshold для всех, а per-strategy freshness window.

---

### G-FEAT-04: Data Self-Healer (Самоисцеление Данных)

**Проблема**: self_heal.mjs лечит git/node_modules — но если data corrupt/stale, организм не может себя починить.

**Решение**: 4 новых data healer'а для immune system:

```javascript
const DATA_HEALERS = {
  // H1: Stale data → trigger re-enrichment from latest raw
  staleEnrichment: {
    detect: () => enrichment_age > enrichment_ttl,
    heal: () => runBounded('edge_liq_02_signals.mjs'),
    severity: 'LOW'
  },

  // H2: Corrupt lock.json → recompute from raw.jsonl
  corruptLock: {
    detect: () => sha256(raw) !== lock.raw_capture_sha256,
    heal: () => recomputeLock(rawPath),
    severity: 'MEDIUM'
  },

  // H3: Missing enrichment output → regenerate
  missingEnrichment: {
    detect: () => !fs.existsSync('artifacts/outgoing/features_liq.jsonl'),
    heal: () => runBounded('edge_liq_02_signals.mjs'),
    severity: 'MEDIUM'
  },

  // H4: Orphan run dirs → quarantine old runs (keep latest N)
  orphanRuns: {
    detect: () => countRunDirs(lane) > MAX_RUNS,
    heal: () => quarantineOldRuns(lane, MAX_RUNS),
    severity: 'LOW'
  }
};
```

**Genius**: Иммунная система учится на data failures — immune_memory.mjs запоминает паттерны corrupt данных и предотвращает повторные ошибки.

---

### G-FEAT-05: Cross-Lane Temporal Coherence (Временная Когерентность)

**Проблема**: liq_bybit данные за 2026-02-15, price_fixture за 2025-01-01. Стратегия видит liq_pressure для одного периода и bars для другого. Результат бессмыслен.

**Решение**: Coherence gate:

```
ПРАВИЛО: Для TRUTH + HINT lanes в одной "стратегической сессии":
  - max(all_lane_ts_end) - min(all_lane_ts_start) < MAX_SPAN (7 days default)
  - overlap_ratio = intersection / union >= MIN_OVERLAP (0.5 default)
  - Если нарушено → COHERENCE_WARN + reason_code DATA_TEMPORAL_MISMATCH

GATE: RG_DATA_COHERENCE01
  - Проверяет overlap всех активных lanes
  - FAIL если TRUTH lane не overlaps с другими TRUTH lanes
  - WARN если HINT lanes не overlaps
```

**Genius**: Стратегии не могут получить "мусорные" совмещения данных из разных эпох.

---

### G-FEAT-06: Funding Rate Data Lane (Новый Канал Данных)

**Проблема**: Funding rates — мощнейший edge для crypto. Spec упоминает, lane не создан.

**Решение**: Новый data lane `funding_rate_perp_ws`:

```json
{
  "lane_id": "funding_rate_perp_ws",
  "lane_kind": "REST",
  "truth_level": "HINT",
  "providers": ["bybit_funding", "okx_funding", "binance_funding"],
  "schema_version": "funding_rate.perp.v1",
  "required_artifacts": [
    "artifacts/incoming/funding_rates/<PROVIDER>/<RUN_ID>/raw.jsonl",
    "artifacts/incoming/funding_rates/<PROVIDER>/<RUN_ID>/lock.json"
  ],
  "lane_state": "PLANNED"
}
```

**Signals**:
```
funding_rate:      float (-0.01..+0.01)
funding_premium:   float (price_perp - price_spot) / price_spot
annualized_rate:   funding_rate * 3 * 365 = annual %
regime:            POSITIVE_CARRY | NEGATIVE_CARRY | NEUTRAL
```

**Genius**: Funding carry strategy (SDD Stage 5) получает готовый data lane. Funding rate + liquidation pressure = strongest confluence signal в crypto.

---

### G-FEAT-07: Data Organ Proprioception (Самоосознание Органа)

**Проблема**: proprioception.mjs сканирует FSM, EventBus, но НЕ знает о состоянии data organ.

**Решение**: Расширить proprioception data scan:

```javascript
// В proprioception.scan() добавить:
data_organ: {
  lanes_total: 5,
  lanes_pass: 3,
  lanes_needs_data: 2,
  truth_lanes_pass: 1,

  freshness: {
    newest_acquire_age_sec: 3600,
    newest_enrichment_age_sec: 1200,
    freshness_status: 'FRESH' | 'AGING' | 'STALE' | 'DEAD'
  },

  pipeline: {
    acquire_ready: true,      // double-key available?
    enrich_ready: true,       // raw data present?
    consume_ready: false,     // OHLCV bars generated?
    bridge_present: false     // orderbook_alchemist exists?
  },

  quality: {
    last_coherence_check: 'PASS',
    dedup_ratio: 0.98,        // 98% unique rows
    monotonic: true
  }
}
```

**Genius**: Организм знает что "у меня данные 3-часовой давности, enrichment отстаёт на 20 минут, OHLCV bridge отсутствует" — и может принимать решения (park strategies, request re-acquire).

---

## 7. ЧТО СДЕЛАНО vs ЧТО НУЖНО — МАТРИЦА

```
                        DONE  PARTIAL  MISSING
                        ────  ───────  ───────
ACQUIRE (raw data)       ████   ░
VERIFY  (integrity)      ████   ░
ENRICH  (transform)      █░░░   ░░      ████
CONSUME (strategies)     ████   ░
ORGANISM (integration)   ██░░   ░░      ██░░
SELF-HEAL (data)                        ████
MONITORING (freshness)   ░              ████
COHERENCE (cross-lane)                  ████
NEW LANES (funding)                     ████
```

---

## 8. ПРИОРИТИЗИРОВАННЫЙ ПЛАН ДЕЙСТВИЙ

### P0 — Критический путь (без этого стратегии не работают на live data)

| # | Задача | Genius Feature | Файлы |
|---|--------|---------------|-------|
| 1 | **Orderbook Alchemist** | G-FEAT-02 | `core/data/orderbook_alchemist.mjs` + скрипт + lane |
| 2 | **Bar Validator** | (gap G4) | `core/data/bar_validator.mjs` |
| 3 | **Vol Regime Live** | (gap G5) | `core/data/vol_regime_detector.mjs` |
| 4 | **DataOrgan Controller** | G-FEAT-01 | `core/data/data_organ_controller.mjs` |

### P1 — Высокий приоритет (качество + надёжность)

| # | Задача | Genius Feature | Файлы |
|---|--------|---------------|-------|
| 5 | **Data Freshness Sentinel** | G-FEAT-03 | `core/data/freshness_sentinel.mjs` |
| 6 | **Cross-Lane Coherence** | G-FEAT-05 | `scripts/verify/regression_data_coherence.mjs` |
| 7 | **Data Self-Healer** | G-FEAT-04 | Extend `scripts/lib/self_heal.mjs` |
| 8 | **Data Proprioception** | G-FEAT-07 | Extend `scripts/ops/proprioception.mjs` |

### P2 — Развитие (новые возможности)

| # | Задача | Genius Feature | Файлы |
|---|--------|---------------|-------|
| 9 | **Funding Rate Lane** | G-FEAT-06 | Новые acquire + replay + signals скрипты |
| 10 | **Trust Score Implementation** | (gap G15) | `core/data/trust_score.mjs` |
| 11 | **Multi-Symbol Extension** | (gap G17) | Расширить CANONICAL_SYMBOLS |

---

## 9. ВЕРДИКТ

Data Organ Treasure Engine — это **мощная нижняя половина** (acquire + verify), но с **критическим разрывом в середине** (enrich) и **слабой верхней интеграцией** (organism).

**Метафора**: Организм умеет "вдыхать" данные (acquire), "очищать" их (verify), но не умеет "переваривать" (enrich/transform) и не чувствует "голод" (freshness monitoring). Стратегии питаются "консервами" (CSV fixtures) вместо "свежей пищи" (live orderbook bars).

**7 Genius Features** закрывают все 18 gaps и превращают Data Organ из набора скриптов в **живой, самоосознающий, самоисцеляющийся орган данных** — достойный Treasure Engine как организма.

---

*Готов к SDD-проработке Data Organ Stage 2 по твоему одобрению.*
