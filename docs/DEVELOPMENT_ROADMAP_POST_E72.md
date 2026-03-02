# КАРТА БЛИЖАЙШИХ ЭТАПОВ РАЗВИТИЯ TREASURE ENGINE

> Дата: 2026-03-02 | После EPOCH-72 (THE METAAGENT)
> Полная инвентаризация + приоритизированные этапы для SDD-проработки
> Ветка: claude/treasure-engine-architecture-8MsS8

---

## 0. ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ (после EPOCH-72)

### Что построено — ОРГАНИЗМ

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    TREASURE ENGINE — ЖИВОЙ ОРГАНИЗМ                       ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │ КОРА МОЗГА: MetaAgent (EPOCH-72)                                    │  ║
║  │   Сознание флота: scan → tick → quarantine/graduation/rebalance     │  ║
║  │   CandidateFSM: DRAFT→BACKTESTED→PAPER_PROVEN→CANARY→GRADUATED     │  ║
║  │   GraduationCourt: 5 экзаменов (evidence, performance, reality,     │  ║
║  │                     risk, behavior)                                  │  ║
║  └─────────────────────────┬───────────────────────────────────────────┘  ║
║                            │                                              ║
║  ┌─────────────────────────┴───────────────────────────────────────────┐  ║
║  │ НЕРВНАЯ СИСТЕМА: FSM Brain (EPOCH-69)                               │  ║
║  │   7 состояний: BOOT→CERTIFYING→CERTIFIED→RESEARCHING→EDGE_READY     │  ║
║  │                 DEGRADED→HEALING                                     │  ║
║  │   BFS goal-seeking: runToGoal('CERTIFIED')                          │  ║
║  │   Circuit breakers: threshold=3 per transition                       │  ║
║  │   Watermark: crash recovery checkpoint                              │  ║
║  └─────────────────────────┬───────────────────────────────────────────┘  ║
║                            │                                              ║
║  ┌──────────────┬──────────┴───────────┬──────────────────────────────┐  ║
║  │ ПРОПРИОЦЕП-  │ ИММУННАЯ СИСТЕМА    │ РЕФЛЕКСЫ (EPOCH-70)          │  ║
║  │ ЦИЯ (E70)   │ (EPOCH-71)          │                               │  ║
║  │ Сканер       │ Doctor v2 (7 фаз)   │ Автодеградация при probe     │  ║
║  │ состояния    │ ImmuneMemory         │ failure                      │  ║
║  │ окружения    │ SelfHeal (4 healer)  │ Immune reflex при DOCTOR     │  ║
║  │ траектории   │ Chaos (3 пробы)      │ VERDICT_FAIL                 │  ║
║  └──────────────┴──────────────────────┴──────────────────────────────┘  ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │ ОРГАНЫ:                                                             │  ║
║  │   EventBus v1 ─── TimeMachine ─── Autopilot v2 ─── Cockpit         │  ║
║  │   CandidateRegistry ─── Doctor ─── PolicyKernel ─── GovEngine      │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │ ДАННЫЕ (Data Organ):                                                │  ║
║  │   5 lanes: Bybit liq (TRUTH_READY), Binance liq (EXP),             │  ║
║  │            OKX liq (EXP), Price fixture (EXP),                      │  ║
║  │            OKX orderbook (PREFLIGHT)                                │  ║
║  │   R3 Acquire: edge_okx_orderbook_10 (live) + 11 (replay captured)  │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │ EDGE & PROFIT:                                                      │  ║
║  │   2 стратегии (breakout_atr, mean_revert_rsi)                       │  ║
║  │   Profit: harness → search → ledger → backtest → court              │  ║
║  │   Risk: fortress (DD-conditional) + max loss governor               │  ║
║  │   WOW SHIPPED: 10 of 38 (Feature Store, CPCV, Anti-Blowup,         │  ║
║  │                Partial Fills, Signal Freshness, Leakage v3, ...)    │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
║  GATES: 37/37 verify:fast x2 PASS | 146 reason_codes + 4 patterns       ║
║  TAXONOMY: COMPLETE (all organism tokens registered)                      ║
║  POLICY: 6 modes (CERT/CLOSE/AUDIT/RESEARCH/ACCEL/LIFE)                  ║
║  LEGACY: 95 exemptions expiring at EPOCH-72                               ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Ключевые метрики

| Метрика | Значение |
|---------|----------|
| Regression gates | 37/37 PASS x2 |
| Reason codes | 146 tokens + 4 patterns |
| Data lanes | 5 (1 TRUTH_READY, 2 EXPERIMENTAL, 1 PREFLIGHT, 1 FIXTURE) |
| WOW items | 38 (10 SHIPPED, 3 STAGED, 25 PROPOSED) |
| FSM states | 7 organism + 8 candidate + 6 risk = 21 |
| Strategies | 2 (breakout_atr, mean_revert_rsi) |
| Exchanges | 3 (Binance, Bybit, OKX) |
| Organism phases | 6+1 (proprio → consciousness → telemetry → doctor → reflex → immune → metaagent → seal) |

---

## ЭТАПЫ РАЗВИТИЯ

---

## ЭТАП 1: STRATEGY ENGINE ACTIVATION

> **Цель**: Новые стратегии → в пайплайн CandidateFSM → через все courts → до PAPER_PROVEN.
> **Приоритет**: P0 — ВЫСШИЙ. Без стратегий организм живой, но бесполезный.
> **Зависимости**: Весь SHIPPED стек (backtest, courts, risk fortress, candidate registry)

### 1.1 Новые стратегии

| ID | Стратегия | Тип | Сигналы | Файл |
|----|-----------|-----|---------|------|
| S3 | **Liq+Vol Fusion** | Momentum | liq_pressure + burst_score + ATR | `core/edge/strategies/s3_liq_vol_fusion.mjs` |
| S4 | **Post-Cascade Mean Reversion** | Mean Rev | liq_pressure decay + RSI + SMA | `core/edge/strategies/s4_post_cascade_mr.mjs` |
| S5 | **Funding Rate Carry** | Carry | funding_rate + delta-neutral hedge | `core/edge/strategies/s5_funding_carry.mjs` |

### 1.2 Candidate Pipeline Integration

```
S3/S4/S5 → registerCandidate(DRAFT)
         → backtest x2 (deterministic) → CT01 → BACKTESTED
         → paper trading (100+ trades) → CT02 → PAPER_PROVEN
         → GraduationCourt readiness check
```

### 1.3 Расширение Profit Search

- Добавить `liq_fusion`, `post_cascade`, `funding_carry` families в `e78_profit_search.mjs`
- 5 datasets x 3 environments (BEST/MEDIAN/WORST)
- Rejection: WORST trades < 8 → INVALID; BEST > 0 && WORST < 0 → NOT_ROBUST

### 1.4 Regression Gates

| Gate | Проверка |
|------|----------|
| RG_STRAT01 | Все стратегии реализуют { meta(), init(), onBar() } интерфейс |
| RG_STRAT02 | Backtest x2 determinism для каждой стратегии |
| RG_STRAT03 | Court verdicts coherence (все courts вызваны) |

### 1.5 SDD-требования

- Каждая стратегия: `meta()` с params_schema, default_params, assumptions, failure_modes
- Backtest через `core/backtest/engine.mjs` с реалистичной execution моделью
- Prüfung через все 5 courts: expectancy, overfit (CPCV), portfolio, risk, red-team
- CandidateFSM integration через `candidate_registry.mjs`

### 1.6 Genius Features

| G# | Feature | Описание |
|----|---------|----------|
| **G14** | **Adaptive Signal Blending** | S3/S4 работают антикоррелированно — fusion boost при одновременном сигнале |
| **G15** | **Regime-Conditional Strategy Selection** | Автоматический выбор S3 (trend) vs S4 (range) по vol_regime |
| **G16** | **Profit Attribution Decomposition** | PnL = Alpha + Costs + Slippage + Timing для каждого trade |

---

## ЭТАП 2: DATA ORGAN LIVENESS

> **Цель**: Живой поток данных — OKX orderbook live + funding rates + multi-symbol.
> **Приоритет**: P0. Без live данных стратегии работают только на fixtures.
> **Зависимости**: Этап 1 (стратегии для потребления данных), R3 acquire (уже SHIPPED)

### 2.1 OKX Orderbook Lane Promotion

- `price_okx_orderbook_ws`: PREFLIGHT → EXPERIMENTAL
- Wiring: `edge_okx_orderbook_10_acquire_live.mjs` уже SHIPPED (EPOCH-67)
- Wiring: `edge_okx_orderbook_11_replay_captured.mjs` уже SHIPPED
- Добавить: `acquire_command` в `data_lanes.json`

### 2.2 Funding Rate Data Lane (NEW)

| Поле | Значение |
|------|----------|
| lane_id | `funding_rate_multi_exchange` |
| lane_kind | `REST` |
| truth_level | `TRUTH` |
| lane_state | `PLANNED` → `EXPERIMENTAL` |
| providers | `[binance_funding, bybit_funding, okx_funding]` |

**Файлы**:
- `scripts/edge/edge_funding_00_acquire.mjs` — REST acquire (каждые 8h)
- `scripts/edge/edge_funding_01_replay.mjs` — offline replay + normalize
- `scripts/edge/edge_funding_02_signals.mjs` — funding pressure, carry score

### 2.3 Multi-Symbol Expansion

- Текущие пары: только BTCUSDT
- Целевые: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, ADAUSDT
- Обновить `data_capabilities.json` с multi-symbol конфигурацией
- Расширить `data_lanes.json` — lane per symbol или wildcard

### 2.4 WOW Features (Data Layer)

| WOW | Feature | Файл |
|-----|---------|------|
| **WOW-39** | **Data Health Doctor** | `scripts/ops/data_health_doctor.mjs` |
| **WOW-40** | **Data Lineage Explain** | `scripts/ops/data_lineage_explain.mjs` |

### 2.5 Regression Gates

| Gate | Проверка |
|------|----------|
| RG_DATA01 | Все EXPERIMENTAL+ lanes имеют acquire_command |
| RG_DATA02 | lock.json schema contract для каждого lane |
| RG_FUND01 | Funding rate lane schema + replay determinism |

### 2.6 Genius Features

| G# | Feature | Описание |
|----|---------|----------|
| **G17** | **Cross-Exchange Data Fusion** | Merge funding rates от 3 бирж в единый weighted signal |
| **G18** | **Data Freshness Alerting** | Автоматический DEGRADED при stale данных > threshold |
| **G19** | **Orderbook-Liq Correlation** | Совместный анализ OKX orderbook depth + liquidation pressure |

---

## ЭТАП 3: PORTFOLIO INTELLIGENCE

> **Цель**: Multi-symbol portfolio с correlation-aware allocation и rotation.
> **Приоритет**: P1. Диверсификация = Sharpe boost + drawdown reduction.
> **Зависимости**: Этапы 1 + 2 (стратегии + данные по нескольким символам)

### 3.1 Portfolio Manager

- Расширить `core/portfolio/portfolio_allocator.mjs` → `portfolio_manager.mjs`
- Correlation matrix между символами (rolling 30d window)
- Max pairwise corr ≤ 0.70 (court threshold)
- Kelly fraction per candidate + ensemble sizing

### 3.2 Strategy Rotation Engine

- Per-symbol strategy assignment на основе regime detection
- BTCUSDT: breakout_atr + liq_fusion в trending
- ETHUSDT: mean_revert_rsi в ranging
- Dynamic reallocation каждые N баров

### 3.3 WOW Features (Portfolio Layer)

| WOW | Feature | Файл |
|-----|---------|------|
| **WOW-07** | **Regime Detection Engine** (STAGED → SHIPPED) | `core/edge/regime_detector.mjs` |
| **WOW-13** | **Multi-Symbol Correlation Engine** | `core/edge/correlation_engine.mjs` |
| **WOW-21** | **Correlation Breakdown Detector** | `core/edge/correlation_breakdown.mjs` |

### 3.4 Genius Features

| G# | Feature | Описание |
|----|---------|----------|
| **G20** | **Ensemble Sharpe Optimizer** | BFS по allocation weights для max portfolio Sharpe |
| **G21** | **Dynamic Risk Budget** | Per-symbol risk budget = f(vol_regime, correlation, DD) |
| **G22** | **Cascade Contagion Shield** | Авто-park symbol при cascade contagion detection |

---

## ЭТАП 4: LIVE EXECUTION BRIDGE

> **Цель**: От paper к testnet → mainnet через CandidateFSM → CANARY_DEPLOYED → GRADUATED.
> **Приоритет**: P1. Это мост между simulation и реальными деньгами.
> **Зависимости**: Этапы 1-3 (стратегии proven through paper), GraduationCourt

### 4.1 Testnet Adapter

- `core/live/exchanges/bybit_rest_testnet.mjs` — уже EXISTS, но нуждается в интеграции
- Расширить `core/live/exchange_interface.mjs` → testnet mode
- Fill probe: `core/live/e125_fill_probe_runner.mjs` — EXISTS

### 4.2 Canary Deployment Pipeline

```
PAPER_PROVEN candidate → CT03 (guard_canary_ready) → CANARY_DEPLOYED
  → Min capital (1% of portfolio)
  → Live fills → ledger → reality gap measurement
  → live_sharpe / paper_sharpe ≥ 0.7 (EXAM-03)
```

### 4.3 Reality Gap Measurement

- `core/edge/e76_profit_reality_bridge.mjs` — EXISTS
- Расширить: continuous reality gap monitoring per candidate
- Auto-quarantine если reality_gap < 0.5

### 4.4 WOW Features (Execution Layer)

| WOW | Feature | Файл |
|-----|---------|------|
| **WOW-10** | **Smart Execution Router** (STAGED → SHIPPED) | `core/exec/smart_router.mjs` |
| **WOW-12** | **Dynamic Fee Model** | `core/exec/fee_model.mjs` |
| **WOW-25** | **PnL Attribution Engine** | `core/profit/pnl_attribution.mjs` |

### 4.5 Genius Features

| G# | Feature | Описание |
|----|---------|----------|
| **G23** | **Graduated Fleet Auto-Scaling** | MetaAgent auto-scales capital allocation для graduated candidates |
| **G24** | **Kill Switch v2** | Hierarchical kill: candidate → symbol → portfolio → global |
| **G25** | **Execution Forensics** | Каждый fill → decomposition: latency + slippage + spread + fee |

---

## ЭТАП 5: ADVANCED EDGE (WOW MOONSHOTS)

> **Цель**: Передовые features для качественного edge improvement.
> **Приоритет**: P2. Усиление после stable portfolio.
> **Зависимости**: Этапы 1-4 (stable base for measuring improvement)

### 5.1 WOW Candidates

| WOW | Feature | Layer | Impact |
|-----|---------|-------|--------|
| **WOW-02** | **OFI из L2 Orderbook** | EDGE | High — предсказание 1-5 мин |
| **WOW-08** | **Funding Rate Alpha** | EDGE | Medium — carry + timing |
| **WOW-18** | **Multi-Horizon Signal Ensemble** (MOONSHOT) | EDGE | High — confidence decay |
| **WOW-15** | **Deflated Sharpe Ratio Gate** | EDGE | Medium — overfit protection |
| **WOW-09** | **Volatility Surface Features** | EDGE | High — IV skew + term structure |

### 5.2 Genius Features

| G# | Feature | Описание |
|----|---------|----------|
| **G26** | **Neural Feature Selector** | Auto-select top-N features per regime via importance scoring |
| **G27** | **Adversarial Signal Stress Test** | Auto-generate worst-case scenarios для каждого signal |
| **G28** | **Cross-Timeframe Confluence** | Сигнал усиливается когда совпадает на M1, M5, H1 |

---

## ЭТАП 6: AUTONOMOUS EVOLUTION

> **Цель**: Самоулучшающийся организм — auto-exploration, auto-optimization, auto-adaptation.
> **Приоритет**: P2. Финальная стадия — организм управляет собой.
> **Зависимости**: Все предыдущие этапы

### 6.1 Auto-Exploration

- MetaAgent: `exploration_policy.min_pipeline_candidates = 3`
- Когда pipeline dry → auto-generate parameter mutations от GRADUATED candidates
- Bayesian optimization вместо grid search

### 6.2 Auto-Adaptation

- WOW-37: Strategy Performance Decay Predictor
- WOW-36: Anomaly Detection Agent
- Auto-park decaying strategies, auto-promote improving ones

### 6.3 WOW Candidates

| WOW | Feature | Layer |
|-----|---------|-------|
| **WOW-26** | **Hypothesis Generator Agent** | Auto-feature discovery |
| **WOW-28** | **WFO Orchestrator Agent** | Parallel walk-forward |
| **WOW-29** | **Risk Governor Agent** | Automated risk state management |
| **WOW-33** | **Red-Team Agent** | Adversarial strategy tester |

### 6.4 Genius Features

| G# | Feature | Описание |
|----|---------|----------|
| **G29** | **Evolutionary Strategy Breeding** | Genetic crossover параметров от top-performing candidates |
| **G30** | **Organism Consciousness Dashboard** | Real-time visualization всех FSM states, fleet, decisions |
| **G31** | **Self-Documenting Evidence** | Авто-генерация SDD для каждого нового candidate |

---

## МАТРИЦА ПРИОРИТЕТОВ

```
                    БЫСТРАЯ РЕАЛИЗАЦИЯ          ДОЛГАЯ РЕАЛИЗАЦИЯ
                 ┌───────────────────────────┬───────────────────────────┐
  ВЫСОКИЙ ROI    │ ЭТАП 1: Strategy Engine   │ ЭТАП 3: Portfolio Intel   │
                 │   S3 Liq+Vol Fusion       │   WOW-07 Regime Detect   │
                 │   S4 Post-Cascade MR      │   Correlation Engine      │
                 │   CandidateFSM wiring     │   Rotation Engine         │
                 │                           │                           │
                 │ ЭТАП 2: Data Organ        │ ЭТАП 4: Live Bridge      │
                 │   OKX lane promotion      │   Testnet adapter         │
                 │   Funding rate lane       │   Canary deployment       │
                 │   WOW-39/40 diagnostics   │   WOW-10 Smart Router     │
                 ├───────────────────────────┼───────────────────────────┤
  СРЕДНИЙ ROI    │ G14 Adaptive Blending     │ ЭТАП 5: Advanced Edge    │
                 │ G15 Regime Selection      │   WOW-02 OFI             │
                 │ G18 Freshness Alert       │   WOW-18 Multi-Horizon   │
                 │                           │   WOW-09 Vol Surface     │
                 ├───────────────────────────┼───────────────────────────┤
  НИЗКИЙ ROI     │ G16 PnL Attribution       │ ЭТАП 6: Auto-Evolution   │
  (но важный)    │ G19 OB-Liq Correlation    │   WOW-26 Hypothesis Gen  │
                 │                           │   WOW-29 Risk Governor    │
                 └───────────────────────────┴───────────────────────────┘
```

---

## ПОРЯДОК SDD-ПРОРАБОТКИ

Каждый этап получает полноценную SDD спецификацию. Рекомендуемый порядок:

| # | SDD | Этап | Файл |
|---|-----|------|------|
| 1 | **SDD-STRATEGY-ENGINE** | Этап 1 | `specs/sdd/SDD_STRATEGY_ENGINE.md` |
| 2 | **SDD-DATA-ORGAN-LIVE** | Этап 2 | `specs/sdd/SDD_DATA_ORGAN_LIVE.md` |
| 3 | **SDD-PORTFOLIO-INTELLIGENCE** | Этап 3 | `specs/sdd/SDD_PORTFOLIO_INTELLIGENCE.md` |
| 4 | **SDD-LIVE-EXECUTION-BRIDGE** | Этап 4 | `specs/sdd/SDD_LIVE_EXECUTION_BRIDGE.md` |
| 5 | **SDD-ADVANCED-EDGE** | Этап 5 | `specs/sdd/SDD_ADVANCED_EDGE.md` |
| 6 | **SDD-AUTONOMOUS-EVOLUTION** | Этап 6 | `specs/sdd/SDD_AUTONOMOUS_EVOLUTION.md` |

### Формат каждого SDD:

```markdown
# SDD-<NAME>

## 1. CONTEXT & MOTIVATION
## 2. REQUIREMENTS (MUST/SHOULD/COULD)
## 3. ARCHITECTURE
## 4. FILE MAP (new + modified files)
## 5. DATA CONTRACTS (input/output schemas)
## 6. FSM INTEGRATION (state transitions, guards, events)
## 7. GENIUS FEATURES (G#)
## 8. REGRESSION GATES (new gates)
## 9. TAXONOMY TOKENS (new reason_codes)
## 10. RISK REGISTER
## 11. ACCEPTANCE CRITERIA
## 12. EPOCH SPEC (EPOCH-73..78)
## 13. IMPLEMENTATION PLAN (ordered tasks)
```

---

## GENIUS FEATURES REGISTER (ВСЕ G14-G31)

| G# | Этап | Feature | Механизм |
|----|------|---------|----------|
| G14 | 1 | Adaptive Signal Blending | Anticorrelated strategy fusion boost |
| G15 | 1 | Regime-Conditional Selection | Auto S3(trend) vs S4(range) по vol_regime |
| G16 | 1 | Profit Attribution | PnL = Alpha + Costs + Slippage + Timing |
| G17 | 2 | Cross-Exchange Data Fusion | Weighted merge funding rates от 3 бирж |
| G18 | 2 | Data Freshness Alerting | Auto DEGRADED при stale > threshold |
| G19 | 2 | OB-Liq Correlation | Joint orderbook depth + liq pressure |
| G20 | 3 | Ensemble Sharpe Optimizer | BFS allocation weights → max Sharpe |
| G21 | 3 | Dynamic Risk Budget | risk_budget = f(vol, corr, DD) |
| G22 | 3 | Cascade Contagion Shield | Auto-park при contagion detection |
| G23 | 4 | Fleet Auto-Scaling | MetaAgent scales capital для graduated |
| G24 | 4 | Kill Switch v2 | Hierarchical: candidate→symbol→portfolio→global |
| G25 | 4 | Execution Forensics | Fill decomposition: latency+slippage+spread+fee |
| G26 | 5 | Neural Feature Selector | Auto top-N features per regime |
| G27 | 5 | Adversarial Signal Stress | Worst-case scenario generation |
| G28 | 5 | Cross-Timeframe Confluence | M1+M5+H1 signal reinforcement |
| G29 | 6 | Evolutionary Breeding | Genetic crossover от top candidates |
| G30 | 6 | Consciousness Dashboard | Real-time FSM+fleet visualization |
| G31 | 6 | Self-Documenting Evidence | Auto-SDD per candidate |

---

## ЗАВИСИМОСТИ МЕЖДУ ЭТАПАМИ

```
ЭТАП 1 ──→ ЭТАП 2 ──→ ЭТАП 3 ──→ ЭТАП 4 ──→ ЭТАП 5 ──→ ЭТАП 6
Strategy    Data        Portfolio   Live         Advanced    Autonomous
Engine      Organ       Intel      Bridge        Edge       Evolution
             │                       │
             └── можно параллельно ──┘
                 (Этапы 2 и 3 частично независимы)
```

**Критический путь**: 1 → 2 → 4 (стратегии → данные → live execution)

**Параллельные возможности**:
- Этап 3 (portfolio) может начаться параллельно с Этап 2
- Этап 5 (advanced edge) может начаться после Этап 1

---

## ONE_NEXT_ACTION

```
Начать SDD-проработку ЭТАПА 1: SDD-STRATEGY-ENGINE
```

Файл: `specs/sdd/SDD_STRATEGY_ENGINE.md`

Содержание:
- 3 новые стратегии (S3, S4, S5) с полными контрактами
- CandidateFSM integration flow
- Backtest + Court pipeline
- 3 Genius features (G14, G15, G16)
- 3 regression gates (RG_STRAT01-03)
- EPOCH-73 spec
