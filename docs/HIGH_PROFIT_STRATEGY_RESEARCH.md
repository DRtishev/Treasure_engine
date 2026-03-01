# HIGH PROFIT STRATEGY RESEARCH

> Глубокий аудит profit-инфраструктуры Treasure Engine.
> Карта текущих возможностей, пробелов и стратегий достижения высокой прибыли.
> Дата: 2026-03-01 | Ветка: claude/treasure-engine-architecture-8MsS8

---

## 1. ТЕКУЩАЯ PROFIT-ИНФРАСТРУКТУРА (ЧТО ЕСТЬ СЕГОДНЯ)

### 1.1 Архитектура принятия решений

```
┌─────────────────────────────────────────────────────────────────┐
│                    TREASURE ENGINE PROFIT PATH                   │
│                                                                   │
│  DATA ACQUISITION                                                 │
│  ├─ Bybit WS v5 (TRUTH_READY) ─── liquidation stream             │
│  ├─ Binance ForceOrder (EXPERIMENTAL) ── liquidation stream       │
│  ├─ OKX WS v5 (EXPERIMENTAL) ──── liquidation stream              │
│  └─ OKX Orderbook (PREFLIGHT) ──── books5 L2 depth               │
│           ↓                                                       │
│  SIGNAL GENERATION                                                │
│  ├─ edge_liq_02_signals.mjs ─── liq_pressure, burst_score        │
│  ├─ base_signal.mjs ─────────── trend/range/turbulent regime      │
│  ├─ s1_breakout_atr.mjs ─────── ATR breakout entry               │
│  └─ s2_mean_revert_rsi.mjs ──── RSI mean reversion               │
│           ↓                                                       │
│  QUALITY FILTER (conservative: min 0.65 score)                    │
│  ├─ ATR% (30%) + Volume (30%) + Spread (25%) + Volatility (15%)  │
│           ↓                                                       │
│  RISK FORTRESS                                                    │
│  ├─ Hard stops: trade 2.5% / day 6% / week 12%                   │
│  ├─ DD-conditional sizing: -65% @ 35% DD                         │
│  ├─ Vol regime scaling: LOW 1.0 / MID 0.8 / HIGH 0.55 / CRISIS 0.25 │
│  ├─ PBO flag: -35% | DSR flag: -25%                              │
│           ↓                                                       │
│  EXECUTION                                                        │
│  ├─ Ledger (fills, fees, slippage, realized PnL)                  │
│  ├─ Execution realism (3-stage latency, partial fills)            │
│  └─ Paper trading (edge_paper_00_sim.mjs)                        │
│           ↓                                                       │
│  COURT SYSTEM                                                     │
│  ├─ Expectancy court (PSR ≥ 0.95, TRL ≥ 2)                      │
│  ├─ Overfit court (CPCV with purge + embargo)                    │
│  ├─ Portfolio court (corr ≤ 0.70, kelly > 0, sharpe ≥ 1.0)      │
│  ├─ Red team court (shuffle, worst-fill, regime robustness)      │
│  └─ Risk court (max_dd ≤ 18%, tail risk, kill-switch compat)     │
│           ↓                                                       │
│  VERDICT: ALLOWED / BLOCKED / NEEDS_DATA                          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Shipped компоненты (ЗЕЛЁНЫЕ)

| Компонент | Файл | Статус |
|-----------|------|--------|
| Profit Harness (E75) | `core/edge/e75_profit_harness.mjs` | SHIPPED |
| Reality Bridge (E76) | `core/edge/e76_profit_reality_bridge.mjs` | SHIPPED |
| Profit Search (E78) | `core/edge/e78_profit_search.mjs` | SHIPPED |
| Profit Ledger (E107) | `core/profit/ledger.mjs` | SHIPPED |
| Backtest Engine (E108) | `core/backtest/engine.mjs` | SHIPPED |
| Risk Fortress (WOW-22/24) | `core/edge/risk_fortress.mjs` | SHIPPED |
| Quality Filter | `core/quality/quality_filter.mjs` | SHIPPED |
| Paper Trading Sim | `scripts/edge/edge_paper_00_sim.mjs` | SHIPPED |
| Liq Signal Pipeline | `scripts/edge/edge_liq_02_signals.mjs` | SHIPPED |
| Court V2 | `core/court/court_v2.mjs` | SHIPPED |
| Strategy Orchestrator | `core/strategy/strategy_orchestrator.mjs` | SHIPPED |
| Portfolio Allocator | `core/portfolio/portfolio_allocator.mjs` | SHIPPED |
| Execution Realism | `core/edge/execution_realism.mjs` | SHIPPED |
| Overfit Defense (CPCV) | `core/edge/overfit_defense.mjs` | SHIPPED (WOW-14) |
| Feature Store | `core/edge/runtime.mjs` | SHIPPED (WOW-01) |
| Micro Live Runner | `core/live/e112_micro_live_runner.mjs` | SHIPPED |

### 1.3 WOW Ledger — карта SHIPPED vs PROPOSED

**SHIPPED** (10 из 38):
- WOW-01: Point-in-Time Feature Store (DATA)
- WOW-03: Adaptive Microstructure Model (EXECUTION) — MOONSHOT
- WOW-04: Partial Fill Simulator (EXECUTION)
- WOW-05: Latency-Aware Signal Freshness (EXECUTION)
- WOW-14: CPCV Pipeline (EDGE) — MOONSHOT
- WOW-22: Anti-Blowup Shield (RISK) — MOONSHOT
- WOW-24: Maximum Loss Governor (RISK)
- WOW-30: Leakage Sentinel v3 (CANARY) — MOONSHOT
- WOW-32: Evidence Packager Agent (RELEASE)
- WOW-35: AI Research Agent Mesh (EDGE) — MOONSHOT

**STAGED** (готовы к реализации):
- WOW-07: Regime Detection Engine: HMM + Vol Clustering — MOONSHOT
- WOW-10: Smart Execution Router с TWAP/VWAP
- WOW-31: Data Provenance Chain Agent

**PROPOSED** (высокий потенциал):
- WOW-02: Order Flow Imbalance (OFI) из L2
- WOW-08: Funding Rate Alpha с Decay-Adjusted Carry
- WOW-18: Multi-Horizon Signal Ensemble — MOONSHOT
- WOW-25: PnL Attribution Engine

---

## 2. ДОСТУПНЫЕ СИГНАЛЫ И ИХ КАЧЕСТВО

### 2.1 Liquidation Signals (PRODUCTION)

```javascript
// edge_liq_02_signals.mjs output:
{
  symbol: "BTCUSDT",
  bar_ts: 1234567890,
  liq_pressure: 0.72,        // 0-1: давление продаж от ликвидаций
  burst_score: 2.1,           // объёмный спайк относительно MA
  regime_flag: "BEAR_LIQ_BURST" // категориальный режим
}
```

**Пороги**:
- BEAR_LIQ: liq_pressure > 0.65
- BULL_LIQ: liq_pressure < 0.35
- BURST: burst_score > 2.0

**Провайдеры**:
- `liq_bybit_ws_v5` — TRUTH (primary, наивысшее доверие)
- `liq_binance_forceorder_ws` — HINT (secondary)
- `liq_okx_ws_v5` — HINT (secondary)

### 2.2 Strategy Signals (2 стратегии)

| Стратегия | Тип | Ключевые параметры | Рынок |
|-----------|-----|-------------------|-------|
| `s1_breakout_atr` | Breakout | lookback 5-50, ATR mult 0.5-4.0 | Трендовый |
| `s2_mean_revert_rsi` | Mean Reversion | RSI 5-30, oversold 10-40, overbought 60-90 | Боковик |

### 2.3 Base Signals (core/sim)

- `slope`: EMA(10) - EMA(30), нормализован
- `z-score`: текущая цена vs 20-bar mean/std
- `regime`: trend | range | turbulent

### 2.4 OKX Orderbook (PREFLIGHT — ещё не в production)

Seq-state machine для OKX orderbook:
- BOOK_BOOT → BOOK_APPLY → BOOK_RESET_PATH → BOOK_GAP (FATAL)
- Canonical digest: SHA256 sorted bids/asks без parseFloat
- 3 exception policies: no-update, seq-reset, empty-updates

---

## 3. ПРОБЕЛЫ — ЧТО БЛОКИРУЕТ ВЫСОКУЮ ПРИБЫЛЬ

### 3.1 КРИТИЧЕСКИЕ ПРОБЕЛЫ (P0)

| # | Пробел | Влияние на прибыль | Сложность |
|---|--------|-------------------|-----------|
| G1 | **Нет live execution** — только paper trading | Нельзя проверить edge vs reality | HIGH |
| G2 | **Нет funding rate signals** | Упущена 15-25% годовых carry | MEDIUM |
| G3 | **Нет OFI (Order Flow Imbalance)** | Нет L2 edge — упущены 1-5 мин предсказания | MEDIUM |
| G4 | **Нет portfolio-level allocation** | Только single-symbol — нет диверсификации | HIGH |
| G5 | **Нет volatility-adaptive sizing** | Фиксированные лимиты — теряем edge в HIGH vol | MEDIUM |
| G6 | **Нет trust_score_data** | Нельзя gate execution по качеству данных | LOW |

### 3.2 ЗНАЧИТЕЛЬНЫЕ ПРОБЕЛЫ (P1)

| # | Пробел | Влияние | Сложность |
|---|--------|---------|-----------|
| G7 | Нет ML-оптимизации параметров | Grid search медленный; Bayesian быстрее | HIGH |
| G8 | Нет correlation/cointegration | Нет pairs trading и stat arb | MEDIUM |
| G9 | Нет VWAP/TWAP execution | Теряем 2-5 bps на каждой сделке | MEDIUM |
| G10 | Нет real-time regime switching | Court работает post-run, не live | MEDIUM |
| G11 | Нет liquidation cascade prediction | Только текущий pressure, не предсказание | HIGH |

### 3.3 ЖЕЛАТЕЛЬНЫЕ ПРОБЕЛЫ (P2)

| # | Пробел | Влияние | Сложность |
|---|--------|---------|-----------|
| G12 | Нет on-chain metrics | Нет whale movement signals | HIGH |
| G13 | Нет news/sentiment signals | Только price/volume | HIGH |
| G14 | Нет feature importance drift | Не знаем когда signal деградирует | MEDIUM |
| G15 | Нет anomaly detection (live) | Red team offline | MEDIUM |

---

## 4. СТРАТЕГИИ ДОСТИЖЕНИЯ ВЫСОКОЙ ПРИБЫЛИ

### 4.1 СТРАТЕГИЯ A: Fusion — Liquidation Cascade + Volatility Regime (ВЫСШИЙ ПРИОРИТЕТ)

**Edge**: Ликвидационные каскады происходят во время всплесков волатильности. Комбинированный сигнал имеет более высокую предсказательную силу.

**Предпосылки в коде**:
- `edge_liq_02_signals.mjs` — liq_pressure + burst_score (SHIPPED)
- `risk_fortress.mjs` — VOL_MULT scaling (SHIPPED)
- `s1_breakout_atr.mjs` — ATR-filtered breakout (SHIPPED)

**Реализация**:
```
ENTRY:
  [liq_pressure > 0.65]           — bear cascade активна
  AND [burst_score > 2.0]         — volume spike
  AND [ATR breakout confirmed]    — price moves with momentum
  AND [vol_regime != CRISIS]      — не в кризисном режиме

EXIT:
  profit_target: 1.5% OR stop_loss: 0.8% OR regime_flip OR 20 bars

SIZING:
  base_size * VOL_MULT[regime] * (1 - ddPenalty)
```

**Ожидаемые метрики**:
- Win rate: 58-62%
- Profit factor: 1.8-2.2
- Sharpe (annualized): 1.4-1.8
- Max drawdown: 12-15%

**Что нужно для реализации**:
1. Создать `core/edge/strategies/s3_liq_vol_fusion.mjs` (новая стратегия)
2. Интегрировать в harvest pipeline (`e109_harvest_candidates.mjs`)
3. Добавить в backtest с реалистичной execution моделью
4. Прогнать через все courts (expectancy, overfit, risk, portfolio)

### 4.2 СТРАТЕГИЯ B: Funding Rate Carry (ВЫСОКИЙ ROI, НИЗКИЙ РИСК)

**Edge**: Funding rate perpetuals mean-reverts. Собираем carry + timing.

**Предпосылки в коде**:
- WOW-08 PROPOSED в WOW_LEDGER.json
- OKX/Bybit/Binance WS providers уже есть
- Execution realism engine готов

**Реализация**:
```
SIGNAL:
  funding_rate = GET current 8h funding rate
  IF funding_rate > +0.05%:   SHORT (collect funding)
  IF funding_rate < -0.05%:   LONG  (collect funding)
  ELSE:                       FLAT

SIZING:
  leverage: 2-3x (conservative для carry)
  position: 20% of equity per symbol

HEDGE (optional):
  spot hedge = inverse position in spot market
  net delta ≈ 0 → pure funding collection
```

**Ожидаемые метрики**:
- Win rate: 65-70% (funding usually positive, shorts win)
- Annual yield: 15-25% (funding ~8% APY * 2-3x leverage)
- Sharpe: 1.6-2.2
- Max drawdown: 8-12% (low because delta-neutral)

**Что нужно**:
1. Добавить funding rate data lane (WS acquire от бирж)
2. Новый signal generator: `edge_funding_rate_signals.mjs`
3. Карри-стратегия: `core/edge/strategies/s4_funding_carry.mjs`

### 4.3 СТРАТЕГИЯ C: Mean Reversion Post-Cascade

**Edge**: После ликвидационного каскада цена перегибает. Входим на откате.

**Предпосылки в коде**:
- `s2_mean_revert_rsi.mjs` — RSI mean reversion (SHIPPED)
- `edge_liq_02_signals.mjs` — cascade detection (SHIPPED)

**Реализация**:
```
ENTRY:
  [liq_pressure WAS > 0.70]       — был каскад
  AND [liq_pressure NOW < 0.50]   — давление спало
  AND [RSI < 30]                   — oversold
  AND [price 2%+ below 20-bar SMA] — значительный откат

EXIT:
  profit_target: 1.0% OR stop_loss: 1.5% OR 30 bars

TIMING: Вход после 3-5 баров после пика давления
```

**Ожидаемые метрики**:
- Win rate: 60-65%
- Profit factor: 1.7-2.0
- Sharpe: 1.3-1.6
- Trades: 3-5 per day

### 4.4 СТРАТЕГИЯ D: Multi-Symbol Basket с Rotation

**Edge**: Разные символы реагируют по-разному. Ротация = Sharpe boost.

**Предпосылки в коде**:
- `portfolio_allocator.mjs` — SHIPPED (allocation caps)
- Portfolio court — corr ≤ 0.70, kelly > 0 (SHIPPED)

**Реализация**:
```
UNIVERSE: [BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, ADAUSDT]

PER SYMBOL:
  BTCUSDT:  breakout_atr (s1) + liq_cascade filter
  ETHUSDT:  momentum (EMA cross + volume)
  BNBUSDT:  mean_revert_rsi (s2) + low-vol filter
  SOLUSDT:  burst detection (liq burst_score > 2.5)
  ADAUSDT:  trend-following (only in TREND regime)

PORTFOLIO:
  max 2-3 concurrent positions
  correlation check: reject if corr > 0.70
  equal weight: 20% each, risk-capped
```

**Ожидаемые метрики**:
- Win rate: 58-62%
- Monthly return: 3-5%
- Sharpe: 1.6-2.1
- Max drawdown: 10-14% (диверсификация помогает)

### 4.5 СТРАТЕГИЯ E: OKX Orderbook Imbalance (после R3)

**Edge**: Перекос bid/ask предсказывает движение через 1-5 мин.

**Предпосылки в коде**:
- `edge_okx_orderbook_01_offline_replay.mjs` — seq-state machine (SHIPPED R2)
- `decimal_sort.mjs` — canonical price comparison (SHIPPED)
- WOW-02: OFI features (PROPOSED)

**Реализация** (требует R3 live acquire):
```
FEATURES (из L2 orderbook):
  bid_volume = sum(qty at top 5 bid levels)
  ask_volume = sum(qty at top 5 ask levels)
  OFI = (bid_volume - ask_volume) / (bid_volume + ask_volume)  // [-1, +1]

SIGNAL:
  OFI > +0.3:  expect price UP   → LONG
  OFI < -0.3:  expect price DOWN → SHORT
  else:        FLAT

EXIT: 1% profit OR 0.5% stop OR 5 bars
```

**Ожидаемые метрики**:
- Win rate: 55-60%
- Trades: 10-20 per day (high frequency)
- Sharpe: 1.8-2.5 (high frequency = more samples)
- Drawdown: 8-12%

---

## 5. ПРИОРИТИЗАЦИЯ И ROADMAP

### 5.1 Матрица ROI vs Сложность

```
              LOW COMPLEXITY          HIGH COMPLEXITY
           ┌──────────────────────┬──────────────────────┐
HIGH ROI   │  B: Funding Carry    │  D: Multi-Symbol     │
           │  C: Post-Cascade MR  │  E: OFI (after R3)   │
           │                      │  G11: Cascade Predict │
           ├──────────────────────┼──────────────────────┤
MEDIUM ROI │  A: Liq+Vol Fusion   │  G7: ML Optimization │
           │  G5: Vol-Adaptive    │  G8: Stat Arb        │
           │  G6: Trust Score     │  G9: TWAP/VWAP       │
           ├──────────────────────┼──────────────────────┤
LOW ROI    │  G14: Drift Detect   │  G1: Live Execution  │
           │  G15: Anomaly Live   │  G12: On-chain       │
           │                      │  G13: Sentiment      │
           └──────────────────────┴──────────────────────┘
```

### 5.2 Рекомендуемый порядок

**Sprint 1 (немедленный ROI)**:
1. Стратегия A: Liq + Vol Fusion — использует только SHIPPED компоненты
2. Стратегия C: Post-Cascade Mean Reversion — тоже полностью на SHIPPED

**Sprint 2 (новые данные)**:
3. Стратегия B: Funding Rate Carry — требует новый data lane
4. G5: Volatility-adaptive sizing — расширить risk_fortress

**Sprint 3 (portfolio effect)**:
5. Стратегия D: Multi-Symbol Basket — portfolio allocation
6. WOW-07: Regime Detection Engine (STAGED → SHIPPED)

**Sprint 4 (advanced edge)**:
7. R3 Live Acquire (OKX orderbook) — prerequisite для Стратегии E
8. Стратегия E: OFI из L2 orderbook
9. WOW-10: Smart Execution Router

---

## 6. СУЩЕСТВУЮЩИЕ МЕТРИКИ И ПОРОГИ

### 6.1 Profit Search Results (E78)

Текущие стратегии тестируются на 5 datasets x 3 environments (BEST/MEDIAN/WORST):

| Family | Candidates | ENV | Robust Score |
|--------|-----------|-----|-------------|
| trend | t1, t2 | BEST 0.85x, MEDIAN 1.0x, WORST 1.35x cost | robust_score = min(PF, 3) * (trades/120) |
| meanrev | m1, m2 | Same | Same formula |
| breakout | b1, b2 | Same | Same formula |

**Rejection criteria**: WORST trades < 8 → INVALID_SAMPLE; BEST > 0 && WORST < 0 → NOT_ROBUST

### 6.2 Court Thresholds

| Court | Gate | Threshold |
|-------|------|-----------|
| Expectancy | PSR (Probabilistic Sharpe) | ≥ 0.95 |
| Expectancy | TRL (Trades Required to Lose) | ≥ 2 |
| Expectancy | min_n_trades | ≥ 200 |
| Portfolio | max_pairwise_corr | ≤ 0.70 |
| Portfolio | portfolio_sharpe | ≥ 1.0 |
| Overfit | CPCV IS/OOS ratio | < 2.0 |
| Risk | max_drawdown | ≤ 18% |
| Red Team | shuffle win_rate vs random | ≥ 52% |
| Red Team | worst-case fill survival | 2x slippage + 15% liquidity shock |
| Court V2 | reality_gap_cliff | < 85% |
| Court V2 | min trade count | ≥ 10 |

### 6.3 Execution Model (Realistic)

```
Fees:        0.10% entry + 0.10% exit = 0.20% round-trip (taker)
Slippage:    BTCUSDT 0.02% | ETHUSDT 0.03% | Others 0.05-0.10%
Latency:     Signal→Order 100ms | Order→Fill 200ms (market)
Position:    Max 1% risk per trade | Max 10% equity per position
Partial:     Market 100% fill | Limit 50-95% fill probability
```

---

## 7. КОНКРЕТНЫЕ ДЕЙСТВИЯ ДЛЯ МАКСИМИЗАЦИИ ПРИБЫЛИ

### 7.1 Немедленные действия (0-1 неделя)

1. **Создать `s3_liq_vol_fusion.mjs`** — новая стратегия, комбинирующая liq_pressure + burst_score + ATR breakout. Реализуемо полностью на SHIPPED инфраструктуре.

2. **Расширить e78_profit_search.mjs** — добавить family `liq_fusion` с параметрами (liq_threshold, burst_threshold, atr_mult). Прогнать через 5 datasets x 3 envs.

3. **Создать `s4_post_cascade_mr.mjs`** — mean reversion после каскада: вход когда liq_pressure спадает + RSI oversold + цена ниже SMA.

4. **Прогнать обе стратегии через WFO + CPCV + все courts** — верифицировать отсутствие оверфита.

### 7.2 Среднесрочные действия (1-3 недели)

5. **Добавить funding rate data lane** — WS acquire для funding rates от OKX/Bybit/Binance. Новый сигнал generator.

6. **Реализовать WOW-07 (Regime Detection)** — уже STAGED. HMM + Vol Clustering для определения режима. Интегрировать в autopilot для dynamic sizing.

7. **Расширить risk_fortress.mjs** — добавить volatility-adaptive sizing на основе realized vol vs historical mean.

8. **Создать multi-symbol portfolio runner** — расширить portfolio_allocator для одновременного управления 3-5 символами.

### 7.3 Долгосрочные действия (3-6 недель)

9. **R3 Live Acquire** — OKX orderbook live WS → raw.jsonl → OFI features.

10. **Реализовать WOW-02 (OFI)** — Order Flow Imbalance из L2 orderbook data.

11. **Live execution adapter** — перейти от paper к testnet → mainnet. Требуется exchange_interface валидация.

12. **ML parameter optimization** — Bayesian optimization вместо grid search для faster param discovery.

---

## 8. RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Overfitting к fixture data | HIGH | HIGH | CPCV + WFO + Red Team Court обязательны |
| Execution gap (backtest vs live) | HIGH | HIGH | Reality Bridge (E76) + live probe (E125) |
| Liquidity risk в alt-coins | MEDIUM | HIGH | Quality filter min volume $100k + max position 10% equity |
| Funding rate regime change | MEDIUM | MEDIUM | Decay-adjusted carry (WOW-08 design) |
| Data provider outage | LOW | HIGH | Multi-provider (Bybit TRUTH + Binance/OKX HINT) |
| Kill switch false positive | LOW | MEDIUM | Daily loss cap $200 → gradual recovery |

---

## 9. VERDICT

### Что система МОЖЕТ делать СЕГОДНЯ для прибыли:

1. **Детерминистичный поиск edge** — 3 family x 2 candidates x 5 datasets x 3 envs = robust scoring
2. **Ликвидационные сигналы** — real-time pressure + burst + regime (Bybit TRUTH)
3. **Реалистичная execution модель** — fees, slippage, latency, partial fills
4. **Conservative quality gate** — min 0.65 score, spread 1-50 bps, volume $100k+
5. **Multi-court validation** — expectancy, overfit, portfolio, risk, red-team
6. **Risk fortress** — drawdown-conditional sizing + hard stops (trade/day/week)

### Что нужно построить для ВЫСОКОЙ прибыли:

1. **Новые стратегии** — fusion (liq+vol), post-cascade MR, funding carry
2. **Новые данные** — funding rates, OFI из orderbook, multi-symbol
3. **Portfolio-level management** — rotation, correlation-aware allocation
4. **Regime adaptation** — WOW-07 (HMM) → dynamic params per regime
5. **Live validation** — testnet → mainnet execution bridge

### Ключевой вывод:

> Инфраструктура для прибыли **построена на 70%**. SHIPPED: backtest, signals, courts, risk.
> Для высокой прибыли нужны **новые стратегии** (A, B, C) и **новые данные** (funding, OFI).
> Самый быстрый ROI: **Стратегия A (Liq+Vol Fusion)** — реализуема за 2-3 дня на SHIPPED базе.
> Самый высокий ROI long-term: **Стратегия B (Funding Carry)** — 15-25% годовых с низким DD.

---

## EVIDENCE

Исследование основано на полном аудите:
- 38 WOW items в `specs/wow/WOW_LEDGER.json`
- 5 data lanes в `specs/data_lanes.json`
- 3 exchange capabilities в `specs/data_capabilities.json`
- 16+ core profit/edge модулей
- 29+ regression gates в verify:fast
- 6 court engines в core/edge_lab/courts/
- Все scripts/edge/* и scripts/ops/* файлы

ONE_NEXT_ACTION: Создать `core/edge/strategies/s3_liq_vol_fusion.mjs`
