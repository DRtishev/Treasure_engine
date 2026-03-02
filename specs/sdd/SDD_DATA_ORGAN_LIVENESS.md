# SDD-DATA-ORGAN-LIVENESS — Software Design Document

> EPOCH-74: Data Organ Liveness
> Этап 2 из 6 (DEVELOPMENT_ROADMAP_POST_E72.md)
> Дата: 2026-03-02 | Приоритет: P0 ВЫСШИЙ

---

## 1. CONTEXT & MOTIVATION

### Проблема

Treasure Engine — живой организм с мозгом (FSM Brain, 7 states), нервной системой (EventBus), иммунитетом (Doctor v2 + SelfHeal), и флотом стратегий (MetaAgent + CandidateFSM). **Но Data Organ — его пищеварительная система — наполовину парализован.**

Текущее состояние:
```
ACQUIRE Layer:       ████████████ 100% — 5 lanes, 3 exchanges, OKX orderbook
VERIFY  Layer:       ███████████░  95% — SHA256, schema, dedup, 16+ gates
ENRICH  Layer:       ███░░░░░░░░░  30% — liq signals есть, NO orderbook→OHLCV
ORGANISM Integration:████░░░░░░░░  40% — FSM не чувствует data staleness
SELF-HEAL (data):    ░░░░░░░░░░░░   0% — нет ни одного data healer'а
```

### Критический разрыв

OKX orderbook raw.jsonl (`artifacts/incoming/okx/orderbook/`) **никогда не трансформируется в OHLCV bars** которые потребляет backtest engine. Стратегии питаются CSV fixtures вместо live data. FSM transition T04 (`RESEARCHING → EDGE_READY`) проверяет только `CANDIDATE_REGISTRY.json` наличие PROMOTED, **не свежесть данных**.

### Цель

Построить полный pipeline `Orderbook → OHLCV → Enriched Bars → Strategy`, внедрить Data Organ как живой компонент в организм (FSM, Doctor, SelfHeal, Proprioception), и обеспечить continuous data health monitoring.

### Что даёт этот этап

```
СЕЙЧАС:  Orderbook сидит мёртвым грузом → стратегии едят fixtures
ПОСЛЕ:   Orderbook → OHLCV → enriched bars → стратегии → BACKTESTED candidates
         Организм чувствует голод, лечит stale data, degraded mode на data failure
```

---

## 2. REQUIREMENTS

### MUST (обязательно)

| R# | Требование |
|----|------------|
| R1 | Orderbook Alchemist: OKX books5 snapshots → time-windowed OHLCV bars |
| R2 | Bar Validator: H≥L, open/close in [L,H], V≥0, ts monotonic |
| R3 | Vol Regime Detector: realized vol → LOW/MID/HIGH/CRISIS (live, не hardcoded) |
| R4 | DataOrgan Controller: вложенный FSM (DORMANT→ACQUIRING→ENRICHING→NOURISHING→STALE) |
| R5 | Freshness Sentinel: 3-level TTL monitoring (acquire/enrich/consume) |
| R6 | Data Self-Healer: ≥3 healer'а в immune system |
| R7 | Data Proprioception: расширить proprioception.scan() data organ полями |
| R8 | Doctor Data Probe: LIVENESS probe проверяет data freshness |
| R9 | verify:fast остаётся PASS после всех изменений |
| R10 | Новые reason_codes добавлены в taxonomy |

### SHOULD (желательно)

| S# | Требование |
|----|------------|
| S1 | Genius Feature G-FEAT-02: Weighted Mid Price (не просто (bid+ask)/2) |
| S2 | Genius Feature G-FEAT-05: Cross-Lane Temporal Coherence |
| S3 | Genius Feature G-FEAT-07: Order Flow Imbalance signal (free from orderbook) |

### COULD (возможно)

| C# | Требование |
|----|------------|
| C1 | Funding Rate Data Lane (новый lane в data_lanes.json) |
| C2 | Adaptive Freshness TTL per strategy speed |

---

## 3. ARCHITECTURE

### 3.1 Системная диаграмма

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA ORGAN LIVENESS                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 1: ACQUIRE (EXISTING — NO CHANGES)                             │   │
│  │                                                                       │   │
│  │  OKX WS books5 → raw.jsonl + lock.json     [DONE]                   │   │
│  │  Bybit WS v5 liqs → raw.jsonl + lock.json   [DONE]                  │   │
│  │  Binance WS forceOrder → raw.jsonl + lock.json [DONE]               │   │
│  │  Price fixtures → raw.jsonl + lock.json      [DONE]                  │   │
│  └─────────────────────────┬────────────────────────────────────────────┘   │
│                            ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 2: VERIFY (EXISTING — NO CHANGES)                              │   │
│  │                                                                       │   │
│  │  SHA256 recompute ✓  Schema validation ✓  Dedup ✓  Events ✓         │   │
│  │  data_readiness_seal: per-lane evaluation ✓                          │   │
│  └─────────────────────────┬────────────────────────────────────────────┘   │
│                            ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 3: ENRICH (NEW — THIS SDD)                                     │   │
│  │                                                                       │   │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────┐  │   │
│  │  │ ORDERBOOK ALCHEMIST│  │ BAR VALIDATOR      │  │ VOL REGIME    │  │   │
│  │  │ (G-FEAT-02)        │  │                    │  │ DETECTOR      │  │   │
│  │  │                    │  │                    │  │               │  │   │
│  │  │ OKX books5 raw →   │  │ H≥L, V≥0, ts↑   │  │ realized vol  │  │   │
│  │  │ weighted mid price │  │ OHLCV invariants  │  │ → LOW/MID/    │  │   │
│  │  │ → OHLCV bars       │  │ gap detection     │  │   HIGH/CRISIS │  │   │
│  │  │ + proxy volume     │  │ outlier flag      │  │               │  │   │
│  │  │ + OFI signal       │  │                    │  │ vol_mult map  │  │   │
│  │  └────────┬───────────┘  └────────┬───────────┘  └──────┬────────┘  │   │
│  │           └────────────┬──────────┘──────────────────────┘           │   │
│  │                        ▼                                              │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │ ENRICHED BAR OUTPUT                                          │    │   │
│  │  │ { ts_open, O, H, L, C, V, symbol,                          │    │   │
│  │  │   _liq_pressure, _burst_score, _regime_flag,                │    │   │
│  │  │   _vol_regime, _ofi, _weighted_mid, _spread_bps }          │    │   │
│  │  │                                                              │    │   │
│  │  │ → artifacts/outgoing/enriched_bars.jsonl + lock.json        │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────┬────────────────────────────────────────────┘   │
│                            ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 4: ORGANISM INTEGRATION (NEW — THIS SDD)                       │   │
│  │                                                                       │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────────┐   │   │
│  │  │ DataOrgan        │ │ Freshness       │ │ Data Self-Healer     │   │   │
│  │  │ Controller (FSM) │ │ Sentinel        │ │ (4 healers)          │   │   │
│  │  │                  │ │                 │ │                      │   │   │
│  │  │ DORMANT →        │ │ L1: Acquire TTL │ │ H1: staleEnrichment │   │   │
│  │  │ ACQUIRING →      │ │ L2: Enrich TTL  │ │ H2: corruptLock     │   │   │
│  │  │ ENRICHING →      │ │ L3: Consume TTL │ │ H3: missingEnrich   │   │   │
│  │  │ NOURISHING →     │ │                 │ │ H4: orphanRuns      │   │   │
│  │  │ STALE / STARVING │ │ DATA_ALIVE /    │ │                      │   │   │
│  │  │                  │ │ DATA_STALE /    │ │ → SelfHeal registry  │   │   │
│  │  │ → FSM Brain      │ │ DATA_STARVING   │ │ → ImmuneMemory       │   │   │
│  │  └─────────────────┘ └─────────────────┘ └──────────────────────┘   │   │
│  │                                                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │ Data Proprioception → proprioception.scan().data_organ       │    │   │
│  │  │ Doctor Data Probe → liveness check includes data freshness   │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Chain

```
OKX WS books5         Bybit/Binance WS liqs         Price fixtures
     │                        │                           │
     ▼                        ▼                           ▼
 raw.jsonl +              raw.jsonl +                 raw.jsonl +
 lock.json                lock.json                   lock.json
     │                        │                           │
     ▼                        ▼                           ▼
┌────────────┐        ┌──────────────┐            ┌──────────────┐
│ Orderbook  │        │ edge_liq_02  │            │ edge_price   │
│ Alchemist  │        │ _signals.mjs │            │ _01_replay   │
│ (NEW)      │        │ (EXISTING)   │            │ (EXISTING)   │
│            │        │              │            │              │
│ mid_price  │        │ liq_pressure │            │ OHLCV bars   │
│ OHLCV bars │        │ burst_score  │            │              │
│ OFI signal │        │ regime_flag  │            │              │
└─────┬──────┘        └──────┬───────┘            └──────┬───────┘
      │                      │                           │
      └──────────────┬───────┘───────────────────────────┘
                     ▼
           ┌──────────────────┐
           │ Bar Enricher     │
           │ (joins all)      │
           │                  │
           │ enriched_bars =  │
           │  OHLCV + liq +   │
           │  vol_regime +    │
           │  OFI + spread    │
           └────────┬─────────┘
                    ▼
           ┌──────────────────┐
           │ Bar Validator    │
           │                  │
           │ OHLCV invariants │
           │ gap detection    │
           │ outlier flagging │
           └────────┬─────────┘
                    ▼
           enriched_bars.jsonl
           enriched_bars.lock.json
                    │
                    ▼
           ┌──────────────────┐
           │ Backtest Engine  │
           │ Strategy.onBar() │
           │ Profit Search    │
           │ Paper Sim        │
           └──────────────────┘
```

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 Orderbook Alchemist (`core/data/orderbook_alchemist.mjs`)

**Purpose**: Transform OKX orderbook snapshots into time-windowed OHLCV bars.

**Input**: OKX books5 raw.jsonl (seq-state machine verified)

**OKX Message Format** (from fixtures):
```json
{
  "action": "snapshot|update",
  "arg": { "channel": "books5", "instId": "BTC-USDT" },
  "data": [{
    "asks": [["50000","1.0","0","1"], ...],
    "bids": [["49900","0.8","0","1"], ...],
    "seqId": 1001,
    "prevSeqId": 1000
  }]
}
```

**Algorithm**:

```javascript
export function alchemize(messages, opts = {}) {
  const {
    bar_ms = 60_000,         // 1-minute bars
    instId = 'BTC-USDT',
    use_weighted_mid = true  // G-FEAT-02
  } = opts;

  // Phase 1: Rebuild order book via seq-state machine
  //   (reuse exact logic from edge_okx_orderbook_01)
  //   BOOT → APPLY → RESET → canonical book at each message

  // Phase 2: Extract mid_price per message
  for (const msg of validMessages) {
    const book = currentBookState;
    const bestBid = getHighestBid(book.bids);  // compareDecimalStr DESC
    const bestAsk = getLowestAsk(book.asks);    // compareDecimalStr ASC

    if (!bestBid || !bestAsk) continue;  // skip empty books

    const bid = parseFloat(bestBid[0]);
    const ask = parseFloat(bestAsk[0]);
    const bidSize = parseFloat(bestBid[1]);
    const askSize = parseFloat(bestAsk[1]);

    // G-FEAT-02: Weighted mid-price
    const mid = use_weighted_mid
      ? (bid * askSize + ask * bidSize) / (bidSize + askSize)
      : (bid + ask) / 2;

    // Spread in basis points
    const spread_bps = ((ask - bid) / mid) * 10000;

    // G-FEAT-07: Order Flow Imbalance
    const totalBidDepth = sumDepth(book.bids);
    const totalAskDepth = sumDepth(book.asks);
    const ofi = totalBidDepth / (totalBidDepth + totalAskDepth);  // [0,1]

    // Proxy volume: sum of |Δ depth| across all levels this update
    const volumeProxy = computeDeltaVolume(prevBook, book);

    ticks.push({ mid, spread_bps, ofi, volumeProxy, seqId: msg.seqId });
  }

  // Phase 3: Aggregate into OHLCV bars (time-windowed)
  const bars = [];
  for (const window of groupByTimeWindow(ticks, bar_ms)) {
    bars.push({
      symbol: canonicalSymbol(instId),  // BTC-USDT → BTCUSDT
      ts_open: window.start_ms,
      ts_close: window.start_ms + bar_ms,
      open: window.ticks[0].mid,
      high: Math.max(...window.ticks.map(t => t.mid)),
      low: Math.min(...window.ticks.map(t => t.mid)),
      close: window.ticks.at(-1).mid,
      volume: window.ticks.reduce((s, t) => s + t.volumeProxy, 0),
      _weighted_mid: window.ticks.at(-1).mid,
      _spread_bps: mean(window.ticks.map(t => t.spread_bps)),
      _ofi: mean(window.ticks.map(t => t.ofi)),
      _ticks_in_bar: window.ticks.length,
      _source: 'okx_orderbook_alchemist'
    });
  }

  return { bars, fingerprint: sha256(JSON.stringify(bars)) };
}
```

**Exports**:
```javascript
export function alchemize(messages, opts)    // main transformer
export function canonicalSymbol(instId)      // BTC-USDT → BTCUSDT
export function computeWeightedMid(bid, ask, bidSize, askSize)  // G-FEAT-02
export function computeOFI(bids, asks)       // G-FEAT-07: Order Flow Imbalance
export function computeDeltaVolume(prev, curr) // proxy volume
```

**Determinism**: All float operations round to 6 decimal places via `Math.round(x * 1e6) / 1e6`. No parseFloat on price strings for sorting — use compareDecimalStr.

### 4.2 Bar Validator (`core/data/bar_validator.mjs`)

**Purpose**: Validate OHLCV bar invariants. Reject or flag invalid bars.

```javascript
export function validateBar(bar) {
  const errors = [];
  const warnings = [];

  // INVARIANT 1: High >= Low
  if (bar.high < bar.low) errors.push('INV_H_GE_L');

  // INVARIANT 2: Open and Close within [Low, High]
  if (bar.open < bar.low || bar.open > bar.high) errors.push('INV_O_IN_RANGE');
  if (bar.close < bar.low || bar.close > bar.high) errors.push('INV_C_IN_RANGE');

  // INVARIANT 3: Volume non-negative
  if (bar.volume < 0) errors.push('INV_V_NON_NEG');
  if (bar.volume === 0) warnings.push('WARN_V_ZERO');

  // INVARIANT 4: Timestamps valid
  if (!Number.isFinite(bar.ts_open) || bar.ts_open <= 0) errors.push('INV_TS_OPEN');
  if (bar.ts_close <= bar.ts_open) errors.push('INV_TS_ORDER');

  // INVARIANT 5: Symbol present
  if (!bar.symbol || typeof bar.symbol !== 'string') errors.push('INV_SYMBOL');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    bar
  };
}

export function validateBarSeries(bars) {
  const results = bars.map((b, i) => ({ ...validateBar(b), index: i }));
  const gaps = [];

  // SERIES CHECK 1: Monotonic timestamps
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].ts_open <= bars[i-1].ts_open) {
      results[i].errors.push('INV_TS_MONOTONIC');
      results[i].valid = false;
    }
  }

  // SERIES CHECK 2: Gap detection (missing bars)
  for (let i = 1; i < bars.length; i++) {
    const expected = bars[i-1].ts_close;
    const actual = bars[i].ts_open;
    if (actual > expected + (bars[i].ts_close - bars[i].ts_open)) {
      gaps.push({ after_index: i-1, gap_ms: actual - expected });
    }
  }

  // SERIES CHECK 3: Outlier detection (price jump > 10% in one bar)
  for (let i = 1; i < bars.length; i++) {
    const pctChange = Math.abs(bars[i].close - bars[i-1].close) / bars[i-1].close;
    if (pctChange > 0.10) results[i].warnings.push('WARN_OUTLIER_JUMP');
  }

  const invalidCount = results.filter(r => !r.valid).length;
  return {
    total: bars.length,
    valid: bars.length - invalidCount,
    invalid: invalidCount,
    gaps,
    results: results.filter(r => !r.valid || r.warnings.length > 0)
  };
}
```

### 4.3 Vol Regime Detector (`core/data/vol_regime_detector.mjs`)

**Purpose**: Live vol regime calculation. Currently hardcoded to 'MID' in risk_fortress.

**Integration**: Replaces hardcoded `vol_regime = 'MID'` in risk_fortress.sizingPolicy().

```javascript
// Constants matching risk_fortress.mjs VOL_MULT map
const VOL_THRESHOLDS = {
  LOW_MAX:    0.015,   // annualized vol ≤ 1.5% → LOW
  MID_MAX:    0.035,   // annualized vol ≤ 3.5% → MID
  HIGH_MAX:   0.070,   // annualized vol ≤ 7.0% → HIGH
  CRISIS_MIN: 0.070    // annualized vol > 7.0% → CRISIS
};

const LOOKBACK_BARS = 20;
const ANNUALIZATION_FACTOR = Math.sqrt(365 * 24); // for 1h bars

export function detectVolRegime(bars, opts = {}) {
  const {
    lookback = LOOKBACK_BARS,
    thresholds = VOL_THRESHOLDS
  } = opts;

  if (bars.length < 2) return { regime: 'MID', realized_vol: 0, confidence: 0 };

  // Compute log returns
  const recent = bars.slice(-lookback);
  const returns = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push(Math.log(recent[i].close / recent[i-1].close));
  }

  // Realized volatility (annualized)
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const stddev = Math.sqrt(variance);
  const realized_vol = stddev * ANNUALIZATION_FACTOR;

  // Classify regime
  let regime;
  if (realized_vol <= thresholds.LOW_MAX) regime = 'LOW';
  else if (realized_vol <= thresholds.MID_MAX) regime = 'MID';
  else if (realized_vol <= thresholds.HIGH_MAX) regime = 'HIGH';
  else regime = 'CRISIS';

  // Confidence: higher with more data points
  const confidence = Math.min(1.0, returns.length / lookback);

  return {
    regime,
    realized_vol: Math.round(realized_vol * 1e6) / 1e6,
    stddev: Math.round(stddev * 1e6) / 1e6,
    lookback_bars: returns.length,
    confidence: Math.round(confidence * 100) / 100
  };
}
```

### 4.4 DataOrgan Controller (`core/data/data_organ_controller.mjs`)

**Purpose**: Nested FSM inside the organism. Manages data lifecycle states.

```javascript
const DATA_ORGAN_STATES = {
  DORMANT:    { description: 'No data, offline, awaiting ALLOW_NETWORK' },
  ACQUIRING:  { description: 'Double-key active, WS connected, writing raw' },
  ENRICHING:  { description: 'Offline, orderbook→bars, signals, validation' },
  NOURISHING: { description: 'Fresh bars available for strategies' },
  STARVING:   { description: 'Acquire failed, no raw data at all' },
  STALE:      { description: 'Data older than TTL, needs re-acquire' }
};

const DATA_ORGAN_TRANSITIONS = {
  DT01_DORMANT_TO_ACQUIRING:   { guard: 'guard_double_key_present' },
  DT02_ACQUIRING_TO_ENRICHING: { guard: 'guard_raw_data_sealed' },
  DT03_ENRICHING_TO_NOURISHING:{ guard: 'guard_enriched_bars_valid' },
  DT04_NOURISHING_TO_STALE:    { guard: 'guard_freshness_expired' },
  DT05_STALE_TO_ACQUIRING:     { guard: 'guard_double_key_present' },
  DT06_ACQUIRING_TO_STARVING:  { guard: 'guard_acquire_failed' },
  DT07_STARVING_TO_DORMANT:    { guard: 'guard_network_revoked' },
  DT08_STALE_TO_ENRICHING:     { guard: 'guard_raw_data_newer' }
};

export class DataOrganController {
  constructor(bus) {
    this.state = 'DORMANT';
    this.bus = bus;
    this.lastAcquireTick = 0;
    this.lastEnrichTick = 0;
    this.lastConsumeTick = 0;
  }

  transition(transitionId) {
    const trans = DATA_ORGAN_TRANSITIONS[transitionId];
    if (!trans) return { success: false, detail: 'unknown transition' };

    const guard = this[trans.guard]();
    if (!guard.pass) return { success: false, detail: guard.detail };

    const from = this.state;
    const to = transitionId.split('_TO_')[1];
    this.state = to;

    this.bus.append({
      mode: 'CERT',
      component: 'DATA_ORGAN',
      event: 'DATA_ORGAN_TRANSITION',
      reason_code: 'NONE',
      surface: 'DATA',
      evidence_paths: [],
      attrs: { from, to, transition: transitionId }
    });

    return { success: true, from, to };
  }

  // Emits organism-level events for FSM Brain
  emitStatus() {
    const event = {
      NOURISHING: 'DATA_ALIVE',
      STALE: 'DATA_STALE',
      STARVING: 'DATA_STARVING',
      DORMANT: 'DATA_DORMANT'
    }[this.state] || 'DATA_UNKNOWN';

    this.bus.append({
      mode: 'CERT',
      component: 'DATA_ORGAN',
      event,
      reason_code: 'NONE',
      surface: 'DATA',
      evidence_paths: [],
      attrs: {
        state: this.state,
        acquire_age_ticks: this.bus.summary().ticks_n - this.lastAcquireTick,
        enrich_age_ticks: this.bus.summary().ticks_n - this.lastEnrichTick
      }
    });

    return event;
  }

  scan() {
    return Object.freeze({
      state: this.state,
      lastAcquireTick: this.lastAcquireTick,
      lastEnrichTick: this.lastEnrichTick,
      lastConsumeTick: this.lastConsumeTick,
      freshness: this.computeFreshness()
    });
  }

  computeFreshness() {
    const currentTick = this.bus.summary().ticks_n;
    return {
      acquire_age: currentTick - this.lastAcquireTick,
      enrich_age: currentTick - this.lastEnrichTick,
      consume_age: currentTick - this.lastConsumeTick,
      status: this.state === 'NOURISHING' ? 'FRESH'
            : this.state === 'STALE' ? 'STALE'
            : this.state === 'STARVING' ? 'DEAD'
            : 'UNKNOWN'
    };
  }
}
```

### 4.5 Freshness Sentinel (`core/data/freshness_sentinel.mjs`)

**Purpose**: 3-level TTL monitoring.

```javascript
const DEFAULT_TTLS = {
  // Level 1: Acquisition freshness (how old is raw data?)
  acquire: {
    TRUTH:        24 * 3600_000,   // 24h for TRUTH lanes
    HINT:         72 * 3600_000,   // 72h for HINT lanes
    EXPERIMENTAL: 168 * 3600_000   // 7 days for EXPERIMENTAL
  },
  // Level 2: Enrichment freshness (how old is enriched output?)
  enrich: {
    default: 4 * 3600_000          // 4h — re-enrich if raw updated
  },
  // Level 3: Consumption freshness (when was last bar fed to strategy?)
  consume: {
    fast: 3 * 60_000,              // 3min for 1-min bar strategies
    slow: 3 * 3600_000             // 3h for 1h bar strategies
  }
};

export function checkFreshness(lanes, enrichments, consumptions, opts = {}) {
  const ttls = { ...DEFAULT_TTLS, ...(opts.ttls || {}) };
  const warnings = [];
  const expirations = [];

  // Level 1: Acquisition
  for (const lane of lanes) {
    const age = lane.age_ms;
    const ttl = ttls.acquire[lane.truth_level] || ttls.acquire.HINT;
    const ratio = age / ttl;

    if (ratio >= 1.0) {
      expirations.push({
        level: 'ACQUIRE', lane_id: lane.lane_id,
        reason: 'DATA_TTL_EXPIRE', age_ms: age, ttl_ms: ttl
      });
    } else if (ratio >= 0.75) {
      warnings.push({
        level: 'ACQUIRE', lane_id: lane.lane_id,
        reason: 'DATA_TTL_WARN', age_ms: age, ttl_ms: ttl,
        remaining_pct: Math.round((1 - ratio) * 100)
      });
    }
  }

  // Level 2: Enrichment
  for (const enrich of enrichments) {
    if (enrich.raw_updated && enrich.enrich_age_ms > ttls.enrich.default) {
      expirations.push({
        level: 'ENRICH', source: enrich.source,
        reason: 'ENRICH_STALE', age_ms: enrich.enrich_age_ms
      });
    }
  }

  // Level 3: Consumption
  for (const consume of consumptions) {
    const ttl = consume.bar_ms <= 60_000 ? ttls.consume.fast : ttls.consume.slow;
    if (consume.age_ms > ttl) {
      expirations.push({
        level: 'CONSUME', strategy: consume.strategy_name,
        reason: 'DATA_STARVING', age_ms: consume.age_ms, ttl_ms: ttl
      });
    }
  }

  return {
    fresh: expirations.length === 0,
    warnings,
    expirations,
    status: expirations.length > 0 ? 'EXPIRED'
          : warnings.length > 0 ? 'AGING'
          : 'FRESH'
  };
}
```

### 4.6 Data Self-Healers (extend `scripts/lib/self_heal.mjs`)

**4 new healers** added to existing healAll():

```javascript
// H1: Stale enrichment → trigger re-enrichment from latest raw
export function healStaleEnrichment() {
  const enrichPath = path.join(ROOT, 'artifacts/outgoing/features_liq.lock.json');
  const rawDir = path.join(ROOT, 'artifacts/incoming/liquidations/bybit_ws_v5');
  if (!fs.existsSync(rawDir)) return { healed: false, action: 'stale_enrichment', detail: 'no raw data' };

  if (!fs.existsSync(enrichPath)) {
    // Missing enrichment output → regenerate
    const result = runBounded('TREASURE_NET_KILL=1 node scripts/edge/edge_liq_02_signals.mjs', { cwd: ROOT });
    return { healed: result.ec === 0, action: 'stale_enrichment', detail: `regenerated ec=${result.ec}` };
  }
  return { healed: false, action: 'stale_enrichment', detail: 'enrichment exists' };
}

// H2: Corrupt lock.json → recompute from raw.jsonl
export function healCorruptLock() {
  const lanes = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/data_lanes.json'), 'utf8')).lanes;
  let healed = false;
  for (const lane of lanes) {
    // Check dynamic lanes with <RUN_ID>
    const base = lane.required_artifacts[0]?.split('/<RUN_ID>/')[0];
    if (!base) continue;
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    const latest = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name).sort().at(-1);
    if (!latest) continue;
    const lockPath = path.join(dir, latest, 'lock.json');
    const rawPath = path.join(dir, latest, 'raw.jsonl');
    if (fs.existsSync(rawPath) && !fs.existsSync(lockPath)) {
      // Raw exists but lock missing → flag for attention
      healed = true; // trigger doctor attention
    }
  }
  return { healed, action: 'corrupt_lock', detail: healed ? 'missing lock detected' : 'all locks present' };
}

// H3: Missing enriched bars → regenerate
export function healMissingEnrichedBars() {
  const enrichedPath = path.join(ROOT, 'artifacts/outgoing/enriched_bars.jsonl');
  if (!fs.existsSync(enrichedPath)) {
    return { healed: false, action: 'missing_enriched_bars', detail: 'enriched_bars not yet generated' };
  }
  return { healed: false, action: 'missing_enriched_bars', detail: 'enriched_bars present' };
}

// H4: Orphan run dirs → quarantine old runs (keep latest 3)
export function healOrphanRuns() {
  const MAX_RUNS = 3;
  let quarantined = 0;
  const baseDirs = [
    'artifacts/incoming/liquidations/bybit_ws_v5',
    'artifacts/incoming/liquidations/okx_ws_v5',
    'artifacts/incoming/liquidations/binance_forceorder_ws',
    'artifacts/incoming/okx/orderbook'
  ];
  for (const rel of baseDirs) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) continue;
    const runs = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name).sort();
    if (runs.length <= MAX_RUNS) continue;
    const toQuarantine = runs.slice(0, runs.length - MAX_RUNS);
    for (const run of toQuarantine) {
      const src = path.join(dir, run);
      const dest = path.join(ROOT, 'artifacts/quarantine', `data-heal-${Date.now()}`, rel, run);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
      quarantined++;
    }
  }
  return { healed: quarantined > 0, action: 'orphan_runs', detail: `quarantined ${quarantined} old runs` };
}
```

### 4.7 Data Proprioception (extend `scripts/ops/proprioception.mjs`)

Add `data_organ` field to `scan()` return:

```javascript
// NEW in scan():
data_organ: Object.freeze({
  lanes_total: lanes.length,
  lanes_pass: perLane.filter(l => l.status === 'PASS').length,
  lanes_needs_data: perLane.filter(l => l.status === 'NEEDS_DATA').length,
  truth_lanes_pass: truthLanes.filter(l => l.status === 'PASS').length,

  freshness: {
    acquire_freshest_age_sec: newestAcquireAge,
    enrich_age_sec: enrichAge,
    freshness_status: freshnessStatus   // FRESH | AGING | STALE | DEAD
  },

  pipeline: {
    acquire_ready: hasAllowNetwork,
    enrich_ready: hasRawData,
    consume_ready: hasEnrichedBars,
    alchemist_present: fs.existsSync('core/data/orderbook_alchemist.mjs')
  },

  quality: {
    coherence_check: coherenceStatus,
    dedup_ratio: dedupRatio,
    monotonic: allMonotonic
  },

  controller_state: dataOrganState   // DORMANT | NOURISHING | STALE | etc.
})
```

### 4.8 Doctor Data Probe (extend `scripts/ops/doctor_v2.mjs`)

Add data freshness check to LIVENESS probe:

```javascript
// In LIVENESS PROBE section, AFTER verify:fast x2:

// DATA FRESHNESS CHECK (new)
const dataReadinessPath = path.join(ROOT, 'reports/evidence/EXECUTOR/gates/manual/public_data_readiness_seal.json');
if (fs.existsSync(dataReadinessPath)) {
  const seal = JSON.parse(fs.readFileSync(dataReadinessPath, 'utf8'));
  const truthPass = seal.per_lane
    .filter(l => l.truth_level === 'TRUTH')
    .every(l => l.status === 'PASS');

  if (!truthPass) {
    probeResults.push({
      probe: 'DATA_FRESHNESS',
      pass: false,
      detail: `TRUTH lanes not all PASS: ${JSON.stringify(seal.per_lane.filter(l => l.truth_level === 'TRUTH').map(l => l.status))}`
    });
  } else {
    probeResults.push({ probe: 'DATA_FRESHNESS', pass: true, detail: 'TRUTH lanes PASS' });
  }
}
```

---

## 5. FILE MAP

### Новые файлы

| # | Файл | Тип | Описание |
|---|------|-----|----------|
| F1 | `core/data/orderbook_alchemist.mjs` | Transform | Orderbook → OHLCV bars + OFI + spread |
| F2 | `core/data/bar_validator.mjs` | Validate | OHLCV invariant checks |
| F3 | `core/data/vol_regime_detector.mjs` | Compute | Live vol regime (LOW/MID/HIGH/CRISIS) |
| F4 | `core/data/data_organ_controller.mjs` | FSM | Nested data lifecycle FSM |
| F5 | `core/data/freshness_sentinel.mjs` | Monitor | 3-level TTL monitoring |
| F6 | `scripts/edge/edge_okx_orderbook_12_to_ohlcv.mjs` | Script | Orchestrates alchemist pipeline |
| F7 | `scripts/verify/regression_data_organ01_alchemist.mjs` | Gate | Alchemist determinism x2 |
| F8 | `scripts/verify/regression_data_organ02_bar_valid.mjs` | Gate | Bar validation invariants |
| F9 | `scripts/verify/regression_data_organ03_vol_regime.mjs` | Gate | Vol regime classification |
| F10 | `scripts/verify/regression_data_organ04_freshness.mjs` | Gate | Freshness TTL checks |
| F11 | `specs/sdd/SDD_DATA_ORGAN_LIVENESS.md` | Doc | This document |

### Модифицируемые файлы

| # | Файл | Изменение |
|---|------|-----------|
| M1 | `scripts/lib/self_heal.mjs` | +4 data healers (H1-H4) |
| M2 | `scripts/ops/proprioception.mjs` | +data_organ field in scan() |
| M3 | `scripts/ops/doctor_v2.mjs` | +DATA_FRESHNESS in LIVENESS probe |
| M4 | `core/edge/risk_fortress.mjs` | Import vol_regime_detector instead of hardcoded 'MID' |
| M5 | `specs/reason_code_taxonomy.json` | +tokens for data organ |
| M6 | `package.json` | +4 regression gates |
| M7 | `specs/data_lanes.json` | +1 DERIVED lane (ohlcv_okx_orderbook_derived) |

---

## 6. DATA CONTRACTS

### 6.1 Enriched Bar (output of enrichment pipeline)

```json
{
  "symbol": "BTCUSDT",
  "ts_open": 1735689600000,
  "ts_close": 1735689660000,
  "open": 50025.5,
  "high": 50100.2,
  "low": 49980.1,
  "close": 50050.0,
  "volume": 125.8,

  "_liq_pressure": 0.62,
  "_burst_score": 1.45,
  "_regime_flag": "BEAR_LIQ",
  "_vol_regime": "MID",
  "_ofi": 0.55,
  "_weighted_mid": 50048.3,
  "_spread_bps": 2.4,
  "_ticks_in_bar": 42,
  "_source": "okx_orderbook_alchemist"
}
```

Prefix `_` = optional enriched fields. If `null`, strategies MUST degrade gracefully (HOLD).

### 6.2 Enriched Bars Lock

```json
{
  "schema_version": "enriched_bars.v1",
  "provider_id": "okx_orderbook_ws",
  "source_run_id": "acq-ob-BTC-USDT-...",
  "bar_ms": 60000,
  "bars_n": 1440,
  "symbols": ["BTCUSDT"],
  "liq_source_run_id": "acq-liq-bybit-...",
  "enriched_bars_sha256": "<sha256>",
  "validation": {
    "total": 1440,
    "valid": 1438,
    "invalid": 2,
    "gaps": 1
  }
}
```

### 6.3 DERIVED Lane in data_lanes.json

```json
{
  "lane_id": "ohlcv_okx_orderbook_derived",
  "lane_kind": "DERIVED",
  "truth_level": "HINT",
  "providers": ["okx_orderbook_ws"],
  "readiness_rules": {
    "PASS": "enriched bars present and valid",
    "RDY01": "missing enriched_bars.jsonl",
    "RDY02": "bar validation failed or hash mismatch"
  },
  "replay_command": "TREASURE_NET_KILL=1 node scripts/edge/edge_okx_orderbook_12_to_ohlcv.mjs --replay",
  "required_artifacts": [
    "artifacts/outgoing/enriched_bars.jsonl",
    "artifacts/outgoing/enriched_bars.lock.json"
  ],
  "required_lock_fields": [
    "schema_version", "provider_id", "bar_ms", "bars_n", "enriched_bars_sha256"
  ],
  "schema_version": "enriched_bars.v1",
  "lane_state": "EXPERIMENTAL"
}
```

---

## 7. ORGANISM INTEGRATION

### 7.1 FSM Brain Wiring

DataOrgan Controller emits events that FSM Brain consumes:

| DataOrgan Event | FSM Reaction | Guard |
|-----------------|-------------|-------|
| DATA_ALIVE | T04 guard_data_ready may pass | guard checks CANDIDATE_REGISTRY |
| DATA_STALE | T05 guard_probe_failure triggers | EventBus scan for STALE |
| DATA_STARVING | T05 → DEGRADED → T06 HEALING | Doctor detects in LIVENESS |
| DATA_ENRICHED | No direct reaction | Informational for proprioception |

### 7.2 Doctor Integration

Doctor v2 LIVENESS probe now includes:
1. verify:fast x2 (existing)
2. ops:life x2 (existing)
3. **DATA_FRESHNESS** (new) — checks TRUTH lanes PASS
4. Scoreboard weight: DATA_FRESHNESS = 10 points (out of 100)

### 7.3 Self-Heal Integration

4 new healers registered in healAll():
- `healStaleEnrichment` — re-run liq signals pipeline
- `healCorruptLock` — detect missing lock.json
- `healMissingEnrichedBars` — flag missing enrichment
- `healOrphanRuns` — quarantine old acquisition runs

### 7.4 Immune Memory Integration

Data healers are tracked in immune_memory.mjs:
- `failure_count['DATA_FRESHNESS']` — incremented on TRUTH lane failure
- `heal_history` — includes `stale_enrichment`, `corrupt_lock` actions
- Recurring data failures (≥3) → priority gate in Doctor

---

## 8. GENIUS FEATURES

### G-FEAT-02: Weighted Mid Price

**В файле**: `core/data/orderbook_alchemist.mjs`

```javascript
// Simple mid: (bid + ask) / 2
// Weighted mid: (bid × askSize + ask × bidSize) / (bidSize + askSize)
//
// Weighted mid accounts for depth imbalance:
//   - If askSize >> bidSize: mid shifts toward bid (more supply = price pressure down)
//   - If bidSize >> askSize: mid shifts toward ask (more demand = price pressure up)
//
// Expected effect: +2-4% accuracy on fill price prediction vs simple mid
```

### G-FEAT-05: Cross-Lane Temporal Coherence

**В файле**: `scripts/verify/regression_data_organ05_coherence.mjs` (future)

```
Rule: All active lanes must overlap in time by ≥50%
  overlap_ratio = intersection(lane_ts_ranges) / union(lane_ts_ranges)
  IF overlap_ratio < 0.5 → DATA_TEMPORAL_MISMATCH warning
  IF TRUTH lanes don't overlap with each other → FAIL
```

### G-FEAT-07: Order Flow Imbalance (OFI)

**В файле**: Встроено в `core/data/orderbook_alchemist.mjs`

```javascript
// OFI = total_bid_depth / (total_bid_depth + total_ask_depth)
// Range: [0, 1]
//   OFI > 0.55 → buy pressure (more bids than asks)
//   OFI < 0.45 → sell pressure (more asks than bids)
//   OFI ≈ 0.50 → balanced
//
// This is a FREE signal derived from orderbook data.
// No additional data source needed — extracted during alchemist transformation.
// Strategies can use _ofi as a confluence filter.
```

---

## 9. REGRESSION GATES

### RG_DATA_ORGAN01: Alchemist Determinism

**Файл**: `scripts/verify/regression_data_organ01_alchemist.mjs`

**Проверка**:
1. Load OKX orderbook fixture (main/fixture.jsonl)
2. Run `alchemize(messages, { bar_ms: 60000 })` → result_1
3. Run `alchemize(messages, { bar_ms: 60000 })` → result_2
4. `result_1.fingerprint === result_2.fingerprint`
5. Output bars have valid OHLCV (via bar_validator)
6. Weighted mid ≠ simple mid (for books with depth imbalance)

**reason_code**: `RG_DATA_ORGAN01_VIOLATION`

### RG_DATA_ORGAN02: Bar Validation

**Файл**: `scripts/verify/regression_data_organ02_bar_valid.mjs`

**Проверка**:
1. Construct known-good bars → validateBarSeries() → all valid
2. Construct known-bad bars (H<L, V<0, non-monotonic ts) → validateBarSeries() → catches all
3. Gap detection → identifies missing bars correctly

**reason_code**: `RG_DATA_ORGAN02_VIOLATION`

### RG_DATA_ORGAN03: Vol Regime Classification

**Файл**: `scripts/verify/regression_data_organ03_vol_regime.mjs`

**Проверка**:
1. Low-vol fixture bars → regime = LOW
2. Mid-vol fixture bars → regime = MID
3. High-vol fixture bars → regime = HIGH
4. Crisis-vol fixture bars → regime = CRISIS
5. Determinism x2: same bars → same regime

**reason_code**: `RG_DATA_ORGAN03_VIOLATION`

### RG_DATA_ORGAN04: Freshness Sentinel

**Файл**: `scripts/verify/regression_data_organ04_freshness.mjs`

**Проверка**:
1. Fresh data → status = FRESH
2. 75% TTL data → status = AGING, warnings emitted
3. 100% TTL data → status = EXPIRED, expirations emitted
4. TRUTH vs HINT TTL difference honoured

**reason_code**: `RG_DATA_ORGAN04_VIOLATION`

---

## 10. TAXONOMY TOKENS

New tokens for `specs/reason_code_taxonomy.json`:

```json
"DATA_ORGAN_ALCHEMIST_PASS",
"DATA_ORGAN_ALCHEMIST_FAIL",
"DATA_ORGAN_BAR_INVALID",
"DATA_ORGAN_BAR_GAP",
"DATA_ORGAN_BAR_OUTLIER",
"DATA_ORGAN_VOL_REGIME_LOW",
"DATA_ORGAN_VOL_REGIME_MID",
"DATA_ORGAN_VOL_REGIME_HIGH",
"DATA_ORGAN_VOL_REGIME_CRISIS",
"DATA_ORGAN_FRESHNESS_FRESH",
"DATA_ORGAN_FRESHNESS_AGING",
"DATA_ORGAN_FRESHNESS_EXPIRED",
"DATA_ORGAN_TRANSITION",
"DATA_ALIVE",
"DATA_STALE",
"DATA_STARVING",
"DATA_DORMANT",
"DATA_TEMPORAL_MISMATCH",
"RG_DATA_ORGAN01_VIOLATION",
"RG_DATA_ORGAN02_VIOLATION",
"RG_DATA_ORGAN03_VIOLATION",
"RG_DATA_ORGAN04_VIOLATION"
```

---

## 11. RISK REGISTER

| Risk | P | Impact | Mitigation |
|------|---|--------|------------|
| Orderbook gaps → invalid OHLCV | HIGH | HIGH | Bar validator rejects, gap detection, outlier flagging |
| Proxy volume ≠ real volume | MED | MED | Documented as HINT, strategies degrade gracefully |
| Vol regime whipsaw (rapid regime flips) | MED | MED | Min bars in regime before switch (LOOKBACK=20) |
| Stale data fed to strategies silently | HIGH | HIGH | Freshness Sentinel + Doctor probe + DataOrgan FSM |
| Self-heal triggers during backtest | LOW | HIGH | Healers check TREASURE_NET_KILL before network ops |
| Cross-lane time mismatch | MED | MED | Coherence gate warns, documented as HINT |
| OFI signal noisy on thin orderbooks | MED | LOW | Confidence field, quality_gate filters |

---

## 12. ACCEPTANCE CRITERIA

### Falsifiable Proofs

| # | Criterion | Verification |
|---|-----------|-------------|
| AC1 | `npm run -s verify:fast` PASS x2 | Run twice, same exit code 0 |
| AC2 | Alchemist produces ≥1 OHLCV bar from fixture | `alchemize(fixture).bars.length > 0` |
| AC3 | Alchemist deterministic x2 | `fingerprint_run1 === fingerprint_run2` |
| AC4 | Bar validator catches H<L | `validateBar({high:1,low:2}).valid === false` |
| AC5 | Vol regime = LOW on low-vol fixture | `detectVolRegime(lowVolBars).regime === 'LOW'` |
| AC6 | Vol regime = CRISIS on crisis-vol fixture | `detectVolRegime(crisisVolBars).regime === 'CRISIS'` |
| AC7 | Freshness EXPIRED on 100% TTL data | `checkFreshness(...).status === 'EXPIRED'` |
| AC8 | DataOrgan Controller transitions DORMANT→NOURISHING | Full FSM walk succeeds |
| AC9 | 4 regression gates pass | RG_DATA_ORGAN01-04 all exit 0 |
| AC10 | Taxonomy: all new tokens present | All 22 tokens in taxonomy |
| AC11 | Proprioception scan includes data_organ | `scan().data_organ !== undefined` |
| AC12 | Doctor LIVENESS includes DATA_FRESHNESS | Probe present in results |

---

## 13. IMPLEMENTATION PLAN

### Ordered Tasks

| # | Task | Depends | Output |
|---|------|---------|--------|
| 1 | Create `bar_validator.mjs` (F2) | - | Validator module |
| 2 | Create `vol_regime_detector.mjs` (F3) | - | Vol regime module |
| 3 | Create `orderbook_alchemist.mjs` (F1) | 1 | Alchemist module |
| 4 | Create `edge_okx_orderbook_12_to_ohlcv.mjs` (F6) | 3 | Pipeline script |
| 5 | Create `freshness_sentinel.mjs` (F5) | - | Freshness module |
| 6 | Create `data_organ_controller.mjs` (F4) | 5 | Controller FSM |
| 7 | Extend `self_heal.mjs` with 4 data healers (M1) | - | Data healers |
| 8 | Extend `proprioception.mjs` with data_organ (M2) | 6 | Data proprioception |
| 9 | Extend `doctor_v2.mjs` with DATA_FRESHNESS (M3) | 5 | Doctor probe |
| 10 | Wire `vol_regime_detector` into `risk_fortress.mjs` (M4) | 2 | Live vol regime |
| 11 | Add DERIVED lane to `data_lanes.json` (M7) | 3,4 | New lane |
| 12 | Add taxonomy tokens (M5) | - | 22 new tokens |
| 13 | Create RG_DATA_ORGAN01 gate (F7) | 3 | Alchemist gate |
| 14 | Create RG_DATA_ORGAN02 gate (F8) | 1 | Bar validation gate |
| 15 | Create RG_DATA_ORGAN03 gate (F9) | 2 | Vol regime gate |
| 16 | Create RG_DATA_ORGAN04 gate (F10) | 5 | Freshness gate |
| 17 | Wire npm scripts in package.json (M6) | 13-16 | 4 new verify commands |
| 18 | verify:fast x2 PASS | ALL | Final proof |

### Execution Estimate

```
Tasks 1-2, 5, 7, 12: Independent foundations (parallel-capable)
Tasks 3-4: Alchemist (depends on bar_validator)
Tasks 6, 8-9: Organism integration (depends on freshness/controller)
Task 10: Risk fortress wiring (depends on vol_regime)
Task 11: Lane registration (depends on alchemist + script)
Tasks 13-17: Gates and wiring (parallel-capable after modules)
Task 18: Final verification (sequential, last)
```
