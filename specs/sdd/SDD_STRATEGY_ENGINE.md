# SDD-STRATEGY-ENGINE — Software Design Document

> EPOCH-73: Strategy Engine Activation
> Этап 1 из 6 (DEVELOPMENT_ROADMAP_POST_E72.md)
> Дата: 2026-03-02 | Приоритет: P0 ВЫСШИЙ

---

## 1. CONTEXT & MOTIVATION

### Проблема

Treasure Engine — живой организм с мозгом (FSM Brain), нервной системой (MetaAgent), иммунитетом (Doctor + SelfHeal), и развитой pipeline для валидации стратегий (7 courts, CandidateFSM). **Но в организме нет ни одной торговой стратегии, прошедшей CandidateFSM.**

Текущие стратегии:
- `s1_breakout_atr` — ATR breakout, только LONG, нет liquidation awareness
- `s2_mean_revert_rsi` — RSI mean reversion, нет regime awareness

Обе стратегии — standalone; не интегрированы ни в candidate_registry, ни в profit_search pipeline, ни в paper sim с liquidation signals.

### Цель

Создать 3 новые стратегии, использующие **уникальные данные Treasure Engine** (liquidation signals, vol regime, quality filter), и провести их через **полный CandidateFSM pipeline** до состояния BACKTESTED.

### Что даёт этот этап

```
СЕЙЧАС:  2 standalone стратегии → 0 в CandidateFSM → 0 proven
ПОСЛЕ:   5 стратегий → 3 новых в CandidateFSM → 3 BACKTESTED → ready for paper
```

---

## 2. REQUIREMENTS

### MUST (обязательно)

| R# | Требование |
|----|------------|
| R1 | Каждая стратегия реализует интерфейс `{ meta(), init(config), onBar(bar, state, history) }` |
| R2 | Каждая стратегия проходит backtest x2 determinism (seed replay identical) |
| R3 | Каждая стратегия проходит все 7 courts Edge Lab (Dataset, Execution, ExecSensitivity, Risk, Overfit, RedTeam, SRE) с verdict ≠ NOT_ELIGIBLE |
| R4 | Каждая стратегия зарегистрирована в candidate_registry и имеет CandidateFSM state = BACKTESTED |
| R5 | Profit Search (e78) расширен 3 новыми families |
| R6 | Paper Sim (edge_paper_00_sim) расширен для всех стратегий |
| R7 | verify:fast остаётся PASS после всех изменений |
| R8 | Новые reason_codes добавлены в taxonomy |

### SHOULD (желательно)

| S# | Требование |
|----|------------|
| S1 | Genius Feature G14: Adaptive Signal Blending между S3 и S4 |
| S2 | Genius Feature G15: Regime-Conditional Strategy Selection |
| S3 | Genius Feature G16: Profit Attribution Decomposition |

### COULD (возможно)

| C# | Требование |
|----|------------|
| C1 | Multi-symbol support (ETHUSDT, SOLUSDT) |
| C2 | Funding rate signals integration (если data lane готов) |

---

## 3. ARCHITECTURE

### 3.1 Системная диаграмма

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           STRATEGY ENGINE                                │
│                                                                          │
│  ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────┐   │
│  │ s3_liq_vol_fusion │   │ s4_post_cascade_mr │   │ s5_multi_regime  │   │
│  │ (momentum/fusion) │   │ (mean reversion)   │   │ (adaptive blend) │   │
│  │                    │   │                    │   │                  │   │
│  │ INPUTS:            │   │ INPUTS:            │   │ INPUTS:          │   │
│  │ - liq_pressure     │   │ - liq_pressure     │   │ - vol_regime     │   │
│  │ - burst_score      │   │ - RSI              │   │ - all s3/s4 sig  │   │
│  │ - ATR              │   │ - SMA deviation    │   │ - quality_score  │   │
│  │ - vol_regime       │   │ - vol_regime       │   │                  │   │
│  │                    │   │                    │   │                  │   │
│  │ OUTPUT: Signal     │   │ OUTPUT: Signal     │   │ OUTPUT: Signal   │   │
│  │ {BUY/SELL/HOLD}    │   │ {BUY/SELL/HOLD}    │   │ {BUY/SELL/HOLD}  │   │
│  └────────┬───────────┘   └────────┬───────────┘   └────────┬─────────┘   │
│           │                        │                        │              │
│           └────────────┬───────────┘────────────────────────┘              │
│                        ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ PIPELINE INTEGRATION                                                │  │
│  │                                                                      │  │
│  │  1. candidate_registry.registerCandidate(strategy_meta)             │  │
│  │     → CandidateFSM state = DRAFT                                    │  │
│  │                                                                      │  │
│  │  2. backtest_engine.runBacktest(strategy, bars, opts) x2            │  │
│  │     → deterministic fingerprint match                               │  │
│  │     → CandidateFSM: CT01_DRAFT_TO_BACKTESTED                       │  │
│  │                                                                      │  │
│  │  3. edge_lab_pipeline.runPipeline(edge, ssot)                       │  │
│  │     → 7 courts: Dataset→Execution→ExecSens→Risk→Overfit→Red→SRE    │  │
│  │     → verdict: PIPELINE_ELIGIBLE / TESTING_SET_ELIGIBLE             │  │
│  │                                                                      │  │
│  │  4. profit_search.runFamily(rows, family, params, envMult)          │  │
│  │     → 5 datasets x 3 envs (BEST/MEDIAN/WORST)                      │  │
│  │     → robust_score = min(PF, 3) * (trades/120)                      │  │
│  │                                                                      │  │
│  │  5. paper_sim.runPaperSim(signals, params)                          │  │
│  │     → 100+ paper trades → CT02_BACKTESTED_TO_PAPER_PROVEN          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Strategy Interface Contract

Каждая стратегия MUST экспортировать:

```javascript
// meta() — static descriptor
export function meta() {
  return {
    name: string,              // unique strategy name (SCREAMING_SNAKE valid)
    version: string,           // semver
    description: string,       // human-readable
    params_schema: {           // parameter definitions
      [param_name]: {
        type: 'integer' | 'number',
        min: number,
        max: number,
        description: string
      }
    },
    default_params: object,    // default values for all params
    assumptions: string,       // when this strategy works
    failure_modes: string,     // when this strategy fails
    signal_inputs: string[],   // NEW: required input signals/features
    regime_preference: string  // NEW: 'TREND' | 'RANGE' | 'ALL'
  };
}

// init(config) — create initial state
export function init(config) {
  return {
    ...params,
    position: 'FLAT',         // FLAT | LONG | SHORT
    entry_price: 0,
    // strategy-specific state
  };
}

// onBar(bar, state, history) — main logic
// bar: { ts_open, open, high, low, close, volume, symbol,
//         liq_pressure?, burst_score?, regime_flag?, vol_regime? }
// history: bars[0..i] (NO lookahead)
// Returns: { signal: 'BUY'|'SELL'|'HOLD', state: newState }
export function onBar(bar, state, history) {
  // ...
  return { signal, state: newState };
}
```

**Расширение bar формата**: Добавляем опциональные поля `liq_pressure`, `burst_score`, `regime_flag`, `vol_regime` для стратегий, использующих liquidation signals. Backtest engine передаёт их если доступны в fixture данных.

---

## 4. STRATEGY SPECIFICATIONS

### 4.1 S3: Liq+Vol Fusion (`s3_liq_vol_fusion.mjs`)

**Edge Hypothesis**: Ликвидационные каскады во время всплесков волатильности создают предсказуемое momentum. Вход по направлению каскада с ATR-filtered confirmation.

```javascript
meta() = {
  name: 'liq_vol_fusion',
  version: '1.0.0',
  description: 'Liquidation cascade momentum with volatility-filtered ATR confirmation',
  params_schema: {
    liq_threshold:    { type: 'number', min: 0.55, max: 0.80, description: 'Liq pressure threshold' },
    burst_threshold:  { type: 'number', min: 1.5,  max: 3.0,  description: 'Volume burst multiplier' },
    atr_period:       { type: 'integer', min: 5,   max: 30,   description: 'ATR period' },
    atr_entry_mult:   { type: 'number', min: 0.5,  max: 2.0,  description: 'ATR multiplier for entry' },
    atr_stop_mult:    { type: 'number', min: 1.0,  max: 3.0,  description: 'ATR multiplier for stop' },
    profit_target_r:  { type: 'number', min: 1.0,  max: 3.0,  description: 'R-multiple profit target' },
    max_hold_bars:    { type: 'integer', min: 5,   max: 50,   description: 'Max bars to hold' }
  },
  default_params: {
    liq_threshold: 0.65,
    burst_threshold: 2.0,
    atr_period: 14,
    atr_entry_mult: 1.0,
    atr_stop_mult: 1.5,
    profit_target_r: 2.0,
    max_hold_bars: 20
  },
  assumptions: 'Works during liquidation cascades with high volume. Bear cascade → SHORT momentum, Bull cascade → LONG momentum.',
  failure_modes: 'Choppy markets with frequent false cascades. Low volume environments where burst_score is unreliable.',
  signal_inputs: ['liq_pressure', 'burst_score', 'regime_flag'],
  regime_preference: 'TREND'
}
```

**Signal Logic**:
```
STATE: FLAT
  IF liq_pressure >= liq_threshold AND burst_score >= burst_threshold:
    IF regime_flag contains 'BEAR':
      signal = SELL (SHORT entry)
      stop = entry + ATR * atr_stop_mult
      target = entry - ATR * atr_stop_mult * profit_target_r
    IF regime_flag contains 'BULL':
      signal = BUY (LONG entry)
      stop = entry - ATR * atr_stop_mult
      target = entry + ATR * atr_stop_mult * profit_target_r
  ELSE: HOLD

STATE: LONG or SHORT
  IF hit stop_loss: EXIT (signal = opposite)
  IF hit profit_target: EXIT
  IF bars_held >= max_hold_bars: EXIT (time stop)
  IF regime_flag flips (BEAR↔BULL): EXIT (regime flip)
  ELSE: HOLD
```

**Determinism**: Все расчёты используют `truncateTowardZero()` и `round()` из contracts.mjs. Нет floating point comparison без tolerance.

### 4.2 S4: Post-Cascade Mean Reversion (`s4_post_cascade_mr.mjs`)

**Edge Hypothesis**: После ликвидационного каскада рынок перегибает. Вход на откате когда давление спадает + RSI oversold/overbought + цена отклоняется от SMA.

```javascript
meta() = {
  name: 'post_cascade_mr',
  version: '1.0.0',
  description: 'Mean reversion after liquidation cascade exhaustion',
  params_schema: {
    liq_peak_threshold:  { type: 'number',  min: 0.60, max: 0.85, description: 'Liq pressure peak to trigger watch' },
    liq_decay_threshold: { type: 'number',  min: 0.35, max: 0.55, description: 'Liq pressure decay = cascade over' },
    rsi_period:          { type: 'integer', min: 7,    max: 21,   description: 'RSI period' },
    rsi_oversold:        { type: 'number',  min: 15,   max: 35,   description: 'RSI oversold level' },
    rsi_overbought:      { type: 'number',  min: 65,   max: 85,   description: 'RSI overbought level' },
    sma_period:          { type: 'integer', min: 10,   max: 30,   description: 'SMA period' },
    sma_deviation_pct:   { type: 'number',  min: 0.01, max: 0.05, description: 'Min price deviation from SMA' },
    profit_target_pct:   { type: 'number',  min: 0.005, max: 0.02, description: 'Profit target %' },
    stop_loss_pct:       { type: 'number',  min: 0.01, max: 0.03, description: 'Stop loss %' },
    max_hold_bars:       { type: 'integer', min: 10,   max: 50,   description: 'Max hold period' },
    cooldown_bars:       { type: 'integer', min: 3,    max: 10,   description: 'Min bars after cascade peak' }
  },
  default_params: {
    liq_peak_threshold: 0.70,
    liq_decay_threshold: 0.50,
    rsi_period: 14,
    rsi_oversold: 30,
    rsi_overbought: 70,
    sma_period: 20,
    sma_deviation_pct: 0.02,
    profit_target_pct: 0.01,
    stop_loss_pct: 0.015,
    max_hold_bars: 30,
    cooldown_bars: 5
  },
  assumptions: 'Works after liquidation cascades in mean-reverting conditions. Price snaps back to SMA.',
  failure_modes: 'Trending markets where cascade is start of sustained move. Multiple cascades in succession.',
  signal_inputs: ['liq_pressure', 'burst_score'],
  regime_preference: 'RANGE'
}
```

**Signal Logic** (state machine):
```
STATE: WATCHING (default)
  Track max_liq_pressure over rolling window
  IF max_liq_pressure WAS >= liq_peak_threshold (recent N bars):
    IF current liq_pressure < liq_decay_threshold:
      IF bars_since_peak >= cooldown_bars:
        STATE → READY_TO_ENTER

STATE: READY_TO_ENTER
  AFTER BEAR CASCADE (max_pressure was bearish):
    IF RSI < rsi_oversold AND price < SMA * (1 - sma_deviation_pct):
      signal = BUY (mean reversion long)
  AFTER BULL CASCADE (max_pressure was bullish):
    IF RSI > rsi_overbought AND price > SMA * (1 + sma_deviation_pct):
      signal = SELL (mean reversion short)
  IF 10 bars pass without entry: STATE → WATCHING (timeout)

STATE: IN_POSITION
  IF pnl >= profit_target_pct: EXIT
  IF pnl <= -stop_loss_pct: EXIT
  IF bars_held >= max_hold_bars: EXIT
  ELSE: HOLD
```

### 4.3 S5: Multi-Regime Adaptive (`s5_multi_regime.mjs`)

**Edge Hypothesis** (Genius Feature G15): Автоматический выбор momentum (S3-like) в trending regime и mean reversion (S4-like) в ranging regime. Оценка quality score для gate.

```javascript
meta() = {
  name: 'multi_regime_adaptive',
  version: '1.0.0',
  description: 'Regime-adaptive strategy: momentum in TREND, mean reversion in RANGE, flat in CRISIS',
  params_schema: {
    // S3-subset params
    liq_threshold:     { type: 'number',  min: 0.55, max: 0.80 },
    burst_threshold:   { type: 'number',  min: 1.5,  max: 3.0 },
    atr_period:        { type: 'integer', min: 5,    max: 30 },
    // S4-subset params
    rsi_period:        { type: 'integer', min: 7,    max: 21 },
    rsi_oversold:      { type: 'number',  min: 15,   max: 35 },
    rsi_overbought:    { type: 'number',  min: 65,   max: 85 },
    sma_period:        { type: 'integer', min: 10,   max: 30 },
    // Regime params
    vol_lookback:      { type: 'integer', min: 10,   max: 50, description: 'Bars for vol estimation' },
    vol_trend_thresh:  { type: 'number',  min: 0.01, max: 0.04, description: 'Vol above = TREND' },
    vol_crisis_thresh: { type: 'number',  min: 0.04, max: 0.10, description: 'Vol above = CRISIS' },
    quality_gate:      { type: 'number',  min: 0.50, max: 0.80, description: 'Min quality score' },
    // Common
    profit_target_pct: { type: 'number',  min: 0.005, max: 0.03 },
    stop_loss_pct:     { type: 'number',  min: 0.005, max: 0.03 },
    max_hold_bars:     { type: 'integer', min: 5,    max: 50 }
  },
  default_params: {
    liq_threshold: 0.65, burst_threshold: 2.0, atr_period: 14,
    rsi_period: 14, rsi_oversold: 30, rsi_overbought: 70, sma_period: 20,
    vol_lookback: 20, vol_trend_thresh: 0.02, vol_crisis_thresh: 0.06,
    quality_gate: 0.65, profit_target_pct: 0.012, stop_loss_pct: 0.015,
    max_hold_bars: 25
  },
  assumptions: 'Markets alternate between trending and ranging regimes detectable via realized vol.',
  failure_modes: 'Regime transition periods where vol is ambiguous. Whipsaw between modes.',
  signal_inputs: ['liq_pressure', 'burst_score', 'regime_flag'],
  regime_preference: 'ALL'
}
```

**Signal Logic**:
```
1. COMPUTE vol_regime:
   realized_vol = stddev(returns[-vol_lookback:]) * sqrt(252)
   IF realized_vol > vol_crisis_thresh: regime = CRISIS → FLAT
   IF realized_vol > vol_trend_thresh:  regime = TREND → use S3 logic
   ELSE:                                regime = RANGE → use S4 logic

2. COMPUTE quality_score:
   Use quality_filter formula:
   score = 0.30 * atrScore + 0.30 * volumeScore + 0.25 * spreadScore + 0.15 * volScore
   IF score < quality_gate: HOLD (refuse to trade)

3. DISPATCH to sub-strategy:
   TREND: S3 fusion logic (liq_pressure + burst_score + ATR)
   RANGE: S4 post-cascade MR logic (liq decay + RSI + SMA deviation)
   CRISIS: HOLD (no trading in crisis)
```

**Genius Feature G14 (Adaptive Signal Blending)**: Когда оба sub-strategy дают одновременный сигнал в одном направлении (S3 momentum = BUY AND S4 mean-reversion = BUY), confidence удваивается → position size увеличивается на 50%.

---

## 5. FILE MAP

### Новые файлы

| # | Файл | Тип | Описание |
|---|------|-----|----------|
| F1 | `core/edge/strategies/s3_liq_vol_fusion.mjs` | Strategy | Liquidation cascade momentum |
| F2 | `core/edge/strategies/s4_post_cascade_mr.mjs` | Strategy | Post-cascade mean reversion |
| F3 | `core/edge/strategies/s5_multi_regime.mjs` | Strategy | Regime-adaptive blender (G14+G15) |
| F4 | `scripts/verify/regression_strat01_interface.mjs` | Gate | Strategy interface contract |
| F5 | `scripts/verify/regression_strat02_determinism.mjs` | Gate | Backtest x2 determinism |
| F6 | `scripts/verify/regression_strat03_court_pass.mjs` | Gate | Court pipeline pass |
| F7 | `core/edge/strategies/strategy_bar_enricher.mjs` | Utility | Enrich bars with liq signals |
| F8 | `specs/sdd/SDD_STRATEGY_ENGINE.md` | Doc | This document |

### Модифицируемые файлы

| # | Файл | Изменение |
|---|------|-----------|
| M1 | `core/edge/e78_profit_search.mjs` | +3 families (liq_fusion, post_cascade, multi_regime) |
| M2 | `scripts/edge/edge_paper_00_sim.mjs` | Support new strategy signals |
| M3 | `specs/reason_code_taxonomy.json` | +tokens for strategies + gates |
| M4 | `package.json` | +3 regression gates |
| M5 | `scripts/ops/candidate_registry.mjs` | Register 3 new candidates |
| M6 | `core/backtest/engine.mjs` | Pass liq signals in bar enrichment |

---

## 6. DATA CONTRACTS

### 6.1 Enriched Bar (input to strategies)

```json
{
  "ts_open": "integer_ms | ISO8601",
  "open": "number",
  "high": "number",
  "low": "number",
  "close": "number",
  "volume": "number (USD notional)",
  "symbol": "string",

  "_liq_pressure": "number [0,1] | null (from features_liq.jsonl)",
  "_burst_score": "number ≥ 0 | null",
  "_regime_flag": "BEAR_LIQ|BEAR_LIQ_BURST|BULL_LIQ|BULL_LIQ_BURST|NEUTRAL|NEUTRAL_BURST | null"
}
```

Prefix `_` для опциональных enriched полей. Если `null`, стратегия MUST degrade gracefully (S3/S4 return HOLD, S5 falls back to pure vol regime).

### 6.2 Strategy Signal (output)

```json
{
  "signal": "BUY | SELL | HOLD",
  "state": {
    "position": "FLAT | LONG | SHORT",
    "entry_price": "number",
    "stop_loss": "number",
    "profit_target": "number",
    "bars_held": "integer",
    "regime": "TREND | RANGE | CRISIS",
    "confidence": "number [0, 1]",
    "sub_strategy": "s3_momentum | s4_meanrev | null"
  }
}
```

### 6.3 CandidateFSM Registration (per strategy)

```json
{
  "candidate_id": "s3_liq_vol_fusion_v1",
  "strategy_name": "liq_vol_fusion",
  "strategy_version": "1.0.0",
  "state": "DRAFT",
  "metrics": {
    "backtest_sharpe": null,
    "paper_sharpe": null,
    "canary_sharpe": null,
    "total_trades": 0,
    "max_drawdown_pct": null,
    "profit_factor": null,
    "win_rate": null,
    "robust_score": null
  },
  "risk_score": 1.0,
  "params": { ... default_params ... },
  "history": [],
  "court_verdicts": []
}
```

---

## 7. FSM INTEGRATION

### 7.1 CandidateFSM Transitions

```
Для каждой стратегии S3, S4, S5:

registerCandidate() → state = DRAFT

runBacktest(strategy, bars, opts) x2
  → metrics.backtest_sharpe populated
  → guard_backtest_pass: backtest_sharpe > 0
  → CT01_DRAFT_TO_BACKTESTED → state = BACKTESTED

runPaperSim(strategy, signals, 100+ trades)
  → metrics.paper_sharpe, total_trades, win_rate, max_drawdown_pct populated
  → guard_paper_metrics:
      total_trades ≥ 100
      paper_sharpe > 0.5
      max_drawdown_pct < 15%
  → CT02_BACKTESTED_TO_PAPER_PROVEN → state = PAPER_PROVEN
```

### 7.2 Guard Thresholds (from fleet_policy.json + candidate_fsm_kernel.json)

| Guard | Threshold | Source |
|-------|-----------|--------|
| guard_backtest_pass | backtest_sharpe > 0 | candidate_fsm.mjs:42 |
| guard_paper_metrics | trades ≥ 100, sharpe > 0.5, DD < 15% | candidate_fsm.mjs:53 |
| guard_canary_ready | risk_score < 0.3, approval_flag | candidate_fsm.mjs:60 |
| guard_graduation_court | ALL 5 exams PASS | graduation_court.mjs |
| guard_quarantine_trigger | risk_score > 0.8 | fleet_policy.json:18 |

### 7.3 GraduationCourt Exams (for future CANARY → GRADUATED)

| Exam | Check | Threshold |
|------|-------|-----------|
| EXAM-01 | Evidence Completeness | backtest + paper + canary metrics present |
| EXAM-02 | Performance Threshold | sharpe ≥ 0.5 |
| EXAM-03 | Reality Gap | live_sharpe / paper_sharpe ≥ 0.7 |
| EXAM-04 | Risk Assessment | risk_score < 0.5, CB trips = 0, VaR budget OK |
| EXAM-05 | Behavioral Audit | no anomalous patterns, concentration < limit |

### 7.4 EventBus Events

```javascript
// Component: REGISTRY, Surface: OFFLINE_AUTHORITY
{
  event: 'CANDIDATE_REGISTERED',
  reason_code: 'NONE',
  attrs: { candidate_id, strategy_name, initial_state: 'DRAFT' }
}

// Component: REGISTRY, Surface: OFFLINE_AUTHORITY
{
  event: 'CANDIDATE_TRANSITION',
  reason_code: 'NONE',
  attrs: { candidate_id, from: 'DRAFT', to: 'BACKTESTED', guard: 'guard_backtest_pass' }
}

// Component: REGISTRY, Surface: PROFIT
{
  event: 'BACKTEST_COMPLETE',
  reason_code: 'NONE',
  attrs: { candidate_id, sharpe, profit_factor, max_drawdown, determinism_match: true }
}
```

---

## 8. GENIUS FEATURES

### G14: Adaptive Signal Blending

**Файл**: Встроено в `s5_multi_regime.mjs`

**Механизм**: Когда S3 (momentum) и S4 (mean reversion) генерируют сигнал в одном направлении одновременно, это сильный confluence signal.

```javascript
// In s5_multi_regime onBar():
const s3Signal = computeS3Logic(bar, state, history);
const s4Signal = computeS4Logic(bar, state, history);

if (s3Signal === s4Signal && s3Signal !== 'HOLD') {
  // CONFLUENCE: both strategies agree
  newState.confidence = 1.0;      // max confidence
  newState.sub_strategy = 'CONFLUENCE';
  return { signal: s3Signal, state: newState };
}

// Single strategy signal: normal confidence
if (currentRegime === 'TREND' && s3Signal !== 'HOLD') {
  newState.confidence = 0.7;
  newState.sub_strategy = 's3_momentum';
  return { signal: s3Signal, state: newState };
}
// ...
```

**Ожидаемый эффект**: Confluence signals имеют win rate +8-12% выше одиночных.

### G15: Regime-Conditional Strategy Selection

**Файл**: Встроено в `s5_multi_regime.mjs`

**Механизм**: Realized vol → vol_regime → strategy dispatch:
- LOW vol (< 2%): RANGE mode → S4 logic
- MID vol (2-6%): TREND mode → S3 logic
- HIGH vol (> 6%): CRISIS → FLAT (no trading)

### G16: Profit Attribution Decomposition

**Файл**: `core/edge/strategies/strategy_bar_enricher.mjs` (helper)

**Механизм**: Для каждого завершённого trade decompose PnL:

```javascript
function attributePnL(fill, bar_at_signal, bar_at_fill) {
  return {
    alpha: (fill.exec_price - bar_at_signal.close) * fill.qty * fill.direction,
    timing_cost: (bar_at_fill.close - bar_at_signal.close) * fill.qty * fill.direction,
    slippage_cost: Math.abs(fill.exec_price - bar_at_fill.close) * fill.qty,
    fee_cost: fill.fee,
    total_pnl: fill.pnl_net
    // Verify: alpha - timing_cost - slippage_cost - fee_cost ≈ total_pnl
  };
}
```

---

## 9. REGRESSION GATES

### RG_STRAT01: Strategy Interface Contract

**Файл**: `scripts/verify/regression_strat01_interface.mjs`

**Проверка**: Для каждой стратегии в `core/edge/strategies/`:
1. Экспортирует `meta()`, `init()`, `onBar()`
2. `meta()` возвращает required fields (name, version, params_schema, default_params)
3. `init(default_params)` возвращает object с `position: 'FLAT'`
4. `onBar(sampleBar, initState, [sampleBar])` возвращает `{ signal, state }`
5. `signal` is one of `['BUY', 'SELL', 'HOLD']`

**reason_code**: `RG_STRAT01_VIOLATION`

### RG_STRAT02: Backtest Determinism x2

**Файл**: `scripts/verify/regression_strat02_determinism.mjs`

**Проверка**: Для каждой новой стратегии:
1. `runBacktest(strategy, fixture_bars, { seed: 12345 })` → result_1
2. `runBacktest(strategy, fixture_bars, { seed: 12345 })` → result_2
3. `sha256(JSON.stringify(result_1.metrics))` === `sha256(JSON.stringify(result_2.metrics))`

**reason_code**: `RG_STRAT02_VIOLATION`

### RG_STRAT03: Court Pipeline Pass

**Файл**: `scripts/verify/regression_strat03_court_pass.mjs`

**Проверка**: Для каждой новой стратегии:
1. Build edge descriptor from backtest results
2. `runPipeline(edge, ssot)` → verdict
3. Verdict ≠ `NOT_ELIGIBLE` и ≠ `BLOCKED`
4. (NEEDS_DATA и PIPELINE_ELIGIBLE are acceptable — they indicate more data needed)

**reason_code**: `RG_STRAT03_VIOLATION`

---

## 10. TAXONOMY TOKENS

Новые tokens для `specs/reason_code_taxonomy.json`:

```json
"STRAT_ENTRY_LIQ_FUSION",
"STRAT_ENTRY_POST_CASCADE",
"STRAT_ENTRY_MULTI_REGIME",
"STRAT_EXIT_STOP_LOSS",
"STRAT_EXIT_PROFIT_TARGET",
"STRAT_EXIT_TIME_STOP",
"STRAT_EXIT_REGIME_FLIP",
"STRAT_HOLD_NO_SIGNAL",
"STRAT_HOLD_QUALITY_GATE",
"STRAT_HOLD_CRISIS_MODE",
"RG_STRAT01_VIOLATION",
"RG_STRAT02_VIOLATION",
"RG_STRAT03_VIOLATION",
"CANDIDATE_REGISTERED",
"CANDIDATE_BACKTESTED",
"BACKTEST_DETERMINISM_MATCH",
"BACKTEST_DETERMINISM_FAIL"
```

---

## 11. RISK REGISTER

| Risk | P | Impact | Mitigation |
|------|---|--------|------------|
| S3 overfits to liq fixtures | HIGH | HIGH | CPCV + WFO + Red Team + 3-env profit search |
| S4 enters too early (cascade not over) | MED | MED | cooldown_bars param + liq_decay_threshold |
| S5 regime whipsaw | MED | MED | Minimum bars in regime before switch |
| Liq data unavailable in bars | LOW | MED | Graceful degradation (HOLD) |
| Backtest ≠ paper reality | HIGH | HIGH | Reality Bridge (E76) + execution court |
| Quality gate too strict (no trades) | LOW | LOW | quality_gate tunable 0.50-0.80 |
| MetaAgent quarantines too aggressively | LOW | MED | risk_score_threshold = 0.8 is conservative |

---

## 12. ACCEPTANCE CRITERIA

### Falsifiable Proofs

| # | Criterion | Verification |
|---|-----------|-------------|
| AC1 | `npm run -s verify:fast` PASS x2 | Run twice, same exit code 0 |
| AC2 | S3 backtest Sharpe > 0 on default params | `runBacktest(s3, fixtures, {seed:12345}).metrics.sharpe > 0` |
| AC3 | S4 backtest Sharpe > 0 on default params | Same for S4 |
| AC4 | S5 backtest Sharpe > 0 on default params | Same for S5 |
| AC5 | All 3 strategies deterministic x2 | `sha256(run1) === sha256(run2)` for each |
| AC6 | All 3 strategies NOT_ELIGIBLE = false in court | Pipeline verdict ≠ NOT_ELIGIBLE |
| AC7 | All 3 registered in candidate_registry as BACKTESTED | `loadCandidates().filter(c => c.state === 'BACKTESTED').length >= 3` |
| AC8 | Profit search: ≥1 candidate NOT_ROBUST = false | At least 1 new strategy is robust |
| AC9 | 3 new regression gates pass | RG_STRAT01, RG_STRAT02, RG_STRAT03 all exit 0 |
| AC10 | Taxonomy: all new tokens present | `taxonomy.tokens.includes('RG_STRAT01_VIOLATION')` etc. |

---

## 13. IMPLEMENTATION PLAN

### Ordered Tasks

| # | Task | Depends | Output |
|---|------|---------|--------|
| 1 | Create `strategy_bar_enricher.mjs` (F7) | - | Utility for liq signal injection |
| 2 | Create `s3_liq_vol_fusion.mjs` (F1) | 1 | Strategy file |
| 3 | Create `s4_post_cascade_mr.mjs` (F2) | 1 | Strategy file |
| 4 | Create `s5_multi_regime.mjs` (F3) | 2,3 | Strategy file with G14+G15 |
| 5 | Extend `e78_profit_search.mjs` (M1) | 2,3,4 | +3 families |
| 6 | Extend `edge_paper_00_sim.mjs` (M2) | 2,3,4 | Support new signals |
| 7 | Extend `backtest/engine.mjs` (M6) | 1 | Bar enrichment pass-through |
| 8 | Add tokens to taxonomy (M3) | - | 17 new tokens |
| 9 | Create `regression_strat01_interface.mjs` (F4) | 2,3,4 | Gate script |
| 10 | Create `regression_strat02_determinism.mjs` (F5) | 2,3,4,7 | Gate script |
| 11 | Create `regression_strat03_court_pass.mjs` (F6) | 2,3,4,7 | Gate script |
| 12 | Wire npm scripts in package.json (M4) | 9,10,11 | 3 new verify commands |
| 13 | Register candidates in registry (M5) | 2,3,4 | 3 DRAFT candidates |
| 14 | Run backtest x2 → transition to BACKTESTED | 7,13 | 3 BACKTESTED candidates |
| 15 | verify:fast x2 PASS | ALL | Final proof |

### Execution Estimate

```
Tasks 1-4: Strategy files (parallel-capable after enricher)
Tasks 5-7: Integration (sequential)
Tasks 8-12: Gates and wiring (parallel-capable)
Tasks 13-15: Pipeline execution and proof (sequential)
```
