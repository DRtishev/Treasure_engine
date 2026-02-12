# EDGE WOW PROPOSALS — Прорывные предложения для Treasure Engine

> **Версия**: 1.0.0 | **Дата**: 2026-02-12
> **Автор**: Principal Quant Systems Architect
> **Статус**: PROPOSAL — требует review и gate-acceptance перед имплементацией
> **Источники контекста**: `docs/SDD_EDGE_EPOCHS_31_40.md`, `specs/epochs/EPOCH-31..40.md`, `docs/EDGE_RESEARCH/*`, `specs/CONSTRAINTS.md`, `core/sim/*`, `core/risk/*`, `core/exec/*`, `scripts/verify/*`

---

## 1. EXECUTIVE SUMMARY

### Топ-7 предложений (одна строка + почему это важно)

| # | ID | Название | Почему это прорыв |
|---|-----|----------|-------------------|
| 1 | WOW-03 | **Адаптивная модель микроструктуры с калибровкой по L2** | Уничтожает fantasy fills — главный убийца прибыли при переходе sim→live |
| 2 | WOW-07 | **Regime Detection Engine (Hidden Markov + Vol Clustering)** | Единственный способ не торговать в убийственном режиме рынка |
| 3 | WOW-14 | **Combinatorial Purged Cross-Validation (CPCV) Pipeline** | Убивает overfit до того, как он убьёт капитал |
| 4 | WOW-18 | **Multi-Horizon Signal Ensemble с Confidence Decay** | Агрегация сигналов разных таймфреймов = более стабильная альфа |
| 5 | WOW-22 | **Anti-Blowup Shield: Drawdown-Conditional Sizing** | Экспоненциальное сжатие позиций при приближении к max DD — выживание > прибыль |
| 6 | WOW-30 | **Leakage Sentinel v3: Автоматический Fuzzing Pipeline** | Ни один feature leak не проходит незамеченным |
| 7 | WOW-35 | **AI Research Agent Mesh с детерминистичным воспроизведением** | Фабрика гипотез, которая в 10x быстрее ручного research, но полностью аудируема |

### 5 главных «убийц прибыли», против которых мы проектируем

| # | Убийца | Механизм уничтожения капитала | Наш ответ |
|---|--------|-------------------------------|-----------|
| 1 | **Execution Fantasy** | Sim показывает +40% annual, live показывает −5% из-за slippage/fees/latency | WOW-03, WOW-04, WOW-05 (микроструктура + gap monitor) |
| 2 | **Overfit Illusion** | Стратегия "работает" на 5000 бэктестов, 0 реальной альфы | WOW-14, WOW-15, WOW-30 (CPCV + PBO + leakage sentinel) |
| 3 | **Regime Blindness** | Mean-reversion стратегия в trending market = стабильный слив | WOW-07, WOW-08 (regime detection + conditional logic) |
| 4 | **Tail Risk / Blowup** | Один flash-crash обнуляет 2 года прибыли | WOW-22, WOW-23, WOW-24 (anti-blowup shield + tail hedge) |
| 5 | **Data Leakage** | Future data просочилось в features = фейковая альфа | WOW-30, WOW-31 (leakage sentinel v3 + provenance chain) |

---

## 2. КАТАЛОГ ПРЕДЛОЖЕНИЙ

---

### TRACK A: EDGE — Альфа и исполнение

---

#### WOW-01
- **Track**: EDGE
- **Title**: Point-in-Time Feature Store с Temporal Join Engine
- **Mechanism**: Все features вычисляются строго по `ts <= t_event`. Temporal Join Engine гарантирует, что при replay данные не могут содержать future information. Каждый feature row получает provenance hash, включающий snapshot_id + config_hash + seed. Любое изменение future row не влияет на features текущего момента.
- **Required data**: OHLCV (минимум). С L2-данными — расширенный feature set (order flow imbalance, VPIN). Без L2 — работает на bar-level features.
- **Determinism impact**: Seed фиксируется в FeatureManifest. Canonical JSON serialization с sorted keys. Rounding: prices 1e-8, features 1e-6.
- **Safety impact**: Leakage sentinel fixture (E37) — обязательный positive/negative control. Нарушение = HARD FAIL.
- **Implementation scope**: MVP 2 дня (temporal join + manifest generation). Full 1 неделя (lineage DAG + cache invalidation).
- **Where it plugs in**: E31 (FeatureFrame/FeatureManifest contracts), `core/data/`.
- **Falsifiable test**: Мутировать future bar, пересчитать features для t_current. Если fingerprint изменился — тест провален, механизм бесполезен.
- **Evidence gates**: `reports/evidence/<EP>/epoch31/LOOKAHEAD_SENTINEL_PLAN.md`, replay diff log, fingerprint stability proof (2 runs).
- **Red-team critique**: Survivorship bias может протечь через universe selection, даже если temporal join чист.
- **Mitigation**: Symbol-universe snapshots by date (anti-pattern #2 из ANTI_PATTERNS.md).

---

#### WOW-02
- **Track**: EDGE
- **Title**: Order Flow Imbalance Features (OFI) из L2 Snapshots
- **Mechanism**: Рассчёт VPIN (Volume-Synchronized Probability of Informed Trading), Order Flow Imbalance, и Trade Flow Toxicity из L2-данных. Эти features содержат информацию о краткосрочном давлении покупателей/продавцов, которая отсутствует в OHLCV.
- **Required data**: L2 order book snapshots (top 5-20 levels), tick-by-tick trades. Без L2 — degraded mode с bar-level proxies (spread_bps из high-low range, уже есть в `core/sim/engine.mjs`).
- **Determinism impact**: L2 snapshot ordering по `(symbol, ts_event, level)`. Bucket classification для VPIN: volume buckets с фиксированным seed для bar assignment.
- **Safety impact**: Offline-first: L2 data из immutable snapshots. Network fetch за `ENABLE_NETWORK_TESTS=1`.
- **Implementation scope**: MVP 2 дня (OFI из top-5 levels, proxy mode). Full 2 недели (VPIN + toxicity + calibration loop).
- **Where it plugs in**: E31 (FeatureFrame расширение), E34 (Signal confidence boost).
- **Falsifiable test**: Backtest OFI-enhanced стратегия vs. baseline на OOS window. Если Sharpe improvement < 0.05 и p-value > 0.1 — feature не добавляет альфу.
- **Evidence gates**: Feature importance ranking (permutation importance), OOS performance delta.
- **Red-team critique**: L2 snapshots могут иметь survivorship bias (только liquid instruments). OFI может быть noise на illiquid markets.
- **Mitigation**: Liquidity-bucket фильтр. Features отключаются для illiquid instruments автоматически.

---

#### WOW-03
- **Track**: EDGE
- **Title**: Адаптивная модель микроструктуры с калибровкой по реальным fills (MOONSHOT)
- **Mechanism**: Замена фиксированного slippage model на адаптивную модель, калибруемую по shadow fills. Компоненты: (a) spread model = f(volatility, time_of_day, OFI); (b) market impact model = g(order_size / ADV, urgency); (c) latency model = стохастическая с параметрами из реальных замеров. Все модели хранят калибровочные артефакты как immutable manifests.
- **Required data**: OHLCV + trade tick data (минимум). L2 snapshots (оптимально). Shadow fill records (E39) для калибровки.
- **Determinism impact**: Модель параметризована конфигом с фиксированным seed. Калибровка = immutable snapshot. Replay с тем же конфигом = идентичный fingerprint.
- **Safety impact**: GapReport (E38) сравнивает sim fills vs. shadow fills. При delta > threshold → auto-brake.
- **Implementation scope**: MVP 3 дня (parametric spread+fee, калибровка по offline data). Full 2 недели (impact model + shadow feedback loop).
- **Where it plugs in**: E32 (SimReport), E38 (GapReport calibration), `core/sim/models.mjs`.
- **Falsifiable test**: Сравнить sim fills vs. историческые fills на 1000+ trades. Если median absolute deviation > 5 bps — модель неадекватна.
- **Evidence gates**: Calibration manifest (dataset ref + params + fit metrics), sim-vs-real comparison report, GapScore trajectory.
- **Red-team critique**: Overfitting к конкретному рыночному режиму. Калибровка по спокойному рынку бесполезна в кризис.
- **Mitigation**: Regime-conditional calibration (WOW-07). Stress-test калибровку на кризисных данных. Conservative fallback при high uncertainty.

---

#### WOW-04
- **Track**: EDGE
- **Title**: Partial Fill Simulator с Liquidity Buckets
- **Mechanism**: Разделение инструментов на liquidity buckets (HIGH/MID/LOW/MICRO) на основе ADV (Average Daily Volume). Для каждого bucket — отдельная модель partial fills: HIGH = 95%+ fill rate, MID = 70-95%, LOW = 40-70%, MICRO = <40%. Fill rate зависит от order_size / estimated_queue_depth.
- **Required data**: OHLCV + объёмы. L2 для точной queue depth (опционально).
- **Determinism impact**: Bucket assignment детерминирован (ADV порог фиксирован в конфиге). Partial fill percentage = f(config, size, rng(seed)).
- **Safety impact**: Intent rejection при predicted fill_rate < min_threshold. Prevents over-sizing on illiquid instruments.
- **Implementation scope**: MVP 1 день (static bucket assignment + table lookup). Full 1 неделя (dynamic bucket + calibration).
- **Where it plugs in**: E32 (SimReport.partial_fill_assumptions), E34 (Intent constraints).
- **Falsifiable test**: Проверить на historical data: если модель предсказывает fill_rate=0.6, а реальный fill_rate=0.95 (или наоборот) на 100+ trades — модель не работает.
- **Evidence gates**: Bucket assignment audit log, fill_rate prediction vs. actual report.
- **Red-team critique**: Bucket boundaries могут быть нестабильны (инструмент мигрирует между buckets).
- **Mitigation**: Hysteresis zone между bucket boundaries. Re-classification только при sustained shift.

---

#### WOW-05
- **Track**: EDGE
- **Title**: Latency-Aware Signal Freshness Engine
- **Mechanism**: Каждый Signal получает `freshness_score = max(0, 1 - (t_now - t_signal) / max_staleness_ms)`. Intent mapper отклоняет signals с freshness < threshold. Для разных стратегий — разный max_staleness: HFT-like = 500ms, swing = 5min, position = 1h.
- **Required data**: Системные timestamps с sub-ms precision. Конфигурация strategy-level staleness.
- **Determinism impact**: Timestamps инжектируются через `context.now_ms` (уже есть в `core/exec/safety_integrated_executor.mjs`). Freshness вычисление чисто функционально.
- **Safety impact**: Stale signals не превращаются в intents → нет adverse selection от задержки.
- **Implementation scope**: MVP 1 день (static threshold per strategy). Full 3 дня (adaptive staleness + latency percentile tracking).
- **Where it plugs in**: E34 (Intent invariants — staleness check), `core/exec/signal_converter.mjs`.
- **Falsifiable test**: Inject signal с timestamp 10s в прошлом при max_staleness=5s. Если Intent сгенерирован — тест провален.
- **Evidence gates**: Reject log с reason="STALE_SIGNAL", freshness histogram per strategy type.
- **Red-team critique**: Слишком агрессивный threshold → пропуск хороших сигналов.
- **Mitigation**: Настраиваемый threshold per strategy class. Мониторинг rejection rate.

---

#### WOW-06
- **Track**: EDGE
- **Title**: Cross-Venue Feature Divergence Detector
- **Mechanism**: Мониторинг расхождения цен/спредов между venues (Binance vs. OKX vs. Bybit). Divergence > threshold = арбитражный сигнал ИЛИ warning о data quality issue. Feature: `cross_venue_divergence_bps = abs(mid_A - mid_B) / mid_A * 10000`.
- **Required data**: Multi-venue OHLCV или L1/L2 snapshots. Минимум 2 venues.
- **Determinism impact**: Venue ordering фиксирован в конфиге (alphabetical). Merge logic = deterministic temporal join.
- **Safety impact**: Large divergence может означать data feed failure — trigger для CAUTIOUS mode в Risk FSM.
- **Implementation scope**: MVP 2 дня (2-venue divergence metric). Full 1 неделя (N-venue + arbitrage signal + data quality alert).
- **Where it plugs in**: E31 (FeatureFrame extension), E36 (Risk trigger: data integrity failure).
- **Falsifiable test**: Inject artificial divergence > 100 bps. Если Risk FSM не получает alert — тест провален.
- **Evidence gates**: Divergence histogram, correlation с data quality events.
- **Red-team critique**: Divergence может быть реальной (different fee structures) или артефактом (different timestamp resolution).
- **Mitigation**: Baseline divergence profiling per venue pair. Alert = deviation from baseline.

---

#### WOW-07
- **Track**: EDGE
- **Title**: Regime Detection Engine: HMM + Vol Clustering (MOONSHOT)
- **Mechanism**: Hidden Markov Model с 3-5 скрытыми состояниями (TRENDING_UP, TRENDING_DOWN, MEAN_REVERTING, HIGH_VOL_CHAOS, LOW_VOL_SQUEEZE). Входы: returns distribution (skew, kurtosis), realized vol, vol-of-vol, autocorrelation r(1). Выход: probability distribution over regimes + most likely regime. Стратегии получают regime_context и могут условно активировать/деактивировать свою логику.
- **Required data**: OHLCV (минимум 500 баров для fit). Funding rates + OI для крипто-specific regime features (опционально).
- **Determinism impact**: HMM fit = offline batch с фиксированным seed. Emission/transition matrices — immutable artifact. Online inference = deterministic forward pass.
- **Safety impact**: Regime = HIGH_VOL_CHAOS → Risk FSM escalation to CAUTIOUS. Confidence < threshold → размер позиций снижается.
- **Implementation scope**: MVP 3 дня (3-state HMM на returns + vol). Full 2 недели (5-state + online Bayesian update + strategy-conditional logic).
- **Where it plugs in**: E31 (Feature extension), E33 (Strategy compatibility), E34 (Signal conditioning), E36 (Risk trigger).
- **Falsifiable test**: На OOS-данных: проверить, что regime detection предсказывает vol regime switch за ≥2 бара до факта в >60% случаев. Если нет — HMM не добавляет value.
- **Evidence gates**: Regime transition matrix, confusion matrix vs. realized regimes, strategy PnL conditioning on regime.
- **Red-team critique**: HMM может переключаться слишком часто (noisy) или слишком медленно (запаздывание). Число состояний — гиперпараметр, подверженный overfit.
- **Mitigation**: Minimum dwell time constraint (3-5 баров в одном состоянии). BIC/AIC для выбора числа состояний. CPCV validation (WOW-14).

---

#### WOW-08
- **Track**: EDGE
- **Title**: Funding Rate Alpha с Decay-Adjusted Carry
- **Mechanism**: На крипто перп-рынках funding rate создаёт predictable carry. Features: `funding_rate_current`, `funding_rate_8h_ema`, `funding_rate_zscore` (относительно 30d rolling). При extreme funding → контр-тренд bias. Decay factor учитывает, что рынок адаптируется к persistent funding.
- **Required data**: Funding rate history (Binance/OKX API → offline snapshots). OHLCV для контекста.
- **Determinism impact**: EMA с фиксированным span и initial value. Z-score rolling window фиксирован.
- **Safety impact**: Funding rate может flip внезапно. Stop-loss обязателен.
- **Implementation scope**: MVP 1 день (funding z-score feature). Full 1 неделя (decay model + carry strategy integration).
- **Where it plugs in**: E31 (Feature), E33 (Strategy input), E34 (Signal confidence modifier).
- **Falsifiable test**: OOS backtest: funding-based signal добавляет > 0.1 Sharpe increment vs. baseline. Если нет — не стоит complexity cost.
- **Evidence gates**: Feature importance, OOS IC (information coefficient), decay half-life estimate.
- **Red-team critique**: Funding alpha широко known → crowded trade → mean reversion к нулю.
- **Mitigation**: Мониторинг crowding indicator (OI growth + funding convergence). Decay model учитывает alpha erosion.

---

#### WOW-09
- **Track**: EDGE
- **Title**: Volatility Surface Features (IV Skew + Term Structure)
- **Mechanism**: Извлечение implied volatility из options market (если доступно) или estimation из realized vol + funding. Features: `iv_skew_25delta` (put-call skew), `vol_term_structure_slope`, `vol_risk_premium` (IV - RV). Эти features содержат forward-looking market expectation.
- **Required data**: Options data (Deribit для BTC/ETH). Fallback: realized vol features only.
- **Determinism impact**: Vol surface fitting = offline batch с pinned model. Interpolation = deterministic cubic spline.
- **Safety impact**: High IV skew → market expecting tail event → Risk FSM: CAUTIOUS.
- **Implementation scope**: MVP 2 дня (realized vol features only). Full 2 недели (full vol surface + options data pipeline).
- **Where it plugs in**: E31 (Feature), E36 (Risk trigger enrichment).
- **Falsifiable test**: Проверить IC of vol_risk_premium на OOS: если IC < 0.02 persistent — feature бесполезен.
- **Evidence gates**: Feature IC report, backtest PnL attribution с/без vol features.
- **Red-team critique**: Options data может быть illiquid (крипто вне BTC/ETH). IV estimation из RV = circular.
- **Mitigation**: Availability flag per instrument. Fallback to RV-only features с пометкой DEGRADED.

---

#### WOW-10
- **Track**: EDGE
- **Title**: Smart Execution Router с TWAP/VWAP Fallback
- **Mechanism**: Для orders > liquidity threshold — разбиение на child orders. TWAP: равномерное распределение по времени. VWAP: распределение по прогнозируемому volume profile. Router выбирает алгоритм по urgency + predicted impact.
- **Required data**: Intraday volume profile (estimable из OHLCV). Real-time market data для live execution (за ENABLE_NETWORK флагом).
- **Determinism impact**: Splitting logic = deterministic (seed + config). Volume profile = precomputed offline artifact.
- **Safety impact**: Каждый child order проходит через SafetyGateValidator + RiskGovernor.
- **Implementation scope**: MVP 2 дня (simple TWAP splitter). Full 2 недели (VWAP + adaptive + impact model integration).
- **Where it plugs in**: E34 (Intent→Order execution), E39 (Shadow harness can test splitting logic), `core/exec/`.
- **Falsifiable test**: Sim: compare single-order execution cost vs. TWAP/VWAP split на 100+ large orders. Если savings < 1 bps median — overhead не оправдан.
- **Evidence gates**: Execution cost comparison report, implementation shortfall analysis.
- **Red-team critique**: Splitting увеличивает complexity и latency. В fast markets — хуже чем aggressive single fill.
- **Mitigation**: Urgency parameter. High urgency = aggressive single order. Low urgency = TWAP/VWAP.

---

#### WOW-11
- **Track**: EDGE
- **Title**: Feature Importance Drift Detector
- **Mechanism**: Мониторинг Permutation Feature Importance (PFI) во времени. Если top-10 features в IS сильно отличаются от top-10 в rolling OOS → signal degradation. Alert metric: Kendall tau между IS и OOS feature importance rankings.
- **Required data**: Model + feature matrix (уже есть).
- **Determinism impact**: PFI с фиксированным seed для permutation. Kendall tau = deterministic computation.
- **Safety impact**: Feature drift → confidence cap снижается → позиции уменьшаются.
- **Implementation scope**: MVP 1 день (PFI computation + drift metric). Full 1 неделя (automated alerting + dashboard).
- **Where it plugs in**: E37 (WFO enrichment), E38 (Gap enrichment — feature drift as gap component).
- **Falsifiable test**: Inject synthetic feature drift (shuffle top features). Если detector не поднимает alert — бесполезен.
- **Evidence gates**: PFI drift report per WFO window, Kendall tau trajectory.
- **Red-team critique**: PFI может быть unstable для correlated features.
- **Mitigation**: Grouped feature importance (feature clusters). Conditional PFI.

---

#### WOW-12
- **Track**: EDGE
- **Title**: Dynamic Fee Model с Exchange-Specific Calibration
- **Mechanism**: Каждая venue имеет свою fee structure (maker/taker, VIP tiers, BNB discount). Fee model читает immutable fee schedule artifact и вычисляет точные costs. При изменении fee schedule — re-calibration trigger.
- **Required data**: Official fee schedules (Tier-1 source per SOURCES.md). VIP tier конфигурация.
- **Determinism impact**: Fee config = immutable JSON artifact. Computation = pure function.
- **Safety impact**: Underestimated fees = overestimated PnL = dangerous. Fee model MUST err on conservative side.
- **Implementation scope**: MVP 1 день (single venue fee table). Full 1 неделя (multi-venue + VIP tier + rebate logic).
- **Where it plugs in**: E32 (SimReport.fee_model), `core/sim/models.mjs` (extends `sampleSpreadProxy`).
- **Falsifiable test**: Сравнить sim fee costs vs. actual exchange fee for 1000+ trades. Если median error > 0.5 bps — model wrong.
- **Evidence gates**: Fee calibration manifest, sim-vs-actual fee comparison.
- **Red-team critique**: Fee schedules change. Stale config = wrong costs.
- **Mitigation**: Staleness check: fee schedule artifact has `valid_until` date. Alert if expired.

---

#### WOW-13
- **Track**: EDGE
- **Title**: Multi-Symbol Correlation Feature Engine
- **Mechanism**: Rolling correlation matrix между tracked symbols. Features: `corr_btc_eth_30d`, `eigen_portfolio_factor_1`, `dispersion_index`. При regime change — корреляции spike → early warning.
- **Required data**: OHLCV для N symbols (минимум 3-5 major crypto).
- **Determinism impact**: Rolling window фиксирован. Eigen decomposition с fixed tolerance и deterministic sort.
- **Safety impact**: Correlation spike = systemic risk → Risk FSM CAUTIOUS. Dispersion collapse = herding → position reduction.
- **Implementation scope**: MVP 1 день (pairwise rolling corr). Full 1 неделя (PCA + factor model + dispersion index).
- **Where it plugs in**: E31 (FeatureFrame extension), E36 (Risk trigger enrichment).
- **Falsifiable test**: Correlation spike detector должен fire ≥1 бар до major crypto drawdown в >50% случаев на OOS. Если нет — feature noise.
- **Evidence gates**: Correlation matrix stability report, PCA explained variance, drawdown prediction precision/recall.
- **Red-team critique**: Crypto корреляции нестабильны. Короткая история = ненадёжная estimation.
- **Mitigation**: Shrinkage estimator (Ledoit-Wolf). Minimum history requirement (100+ bars).

---

### TRACK B: PROFIT ROBUSTNESS — Крепость риска

---

#### WOW-14
- **Track**: ROBUSTNESS
- **Title**: CPCV (Combinatorial Purged Cross-Validation) Pipeline (MOONSHOT)
- **Mechanism**: Реализация Lopez de Prado (2018) CPCV: все возможные train/test splits с purge + embargo → distribution of OOS metrics → вычисление PBO (Probability of Backtest Overfitting). Стратегия принимается ТОЛЬКО если PBO < threshold (HEURISTIC: 0.30, калибровать ежеквартально).
- **Required data**: Feature matrix + labels из E31. Достаточно OHLCV + derived features.
- **Determinism impact**: Split definitions pre-committed и hash-locked (E37). Seed per split combination. Canonical rounding 1e-6 на все metrics.
- **Safety impact**: PBO > threshold → стратегия BLOCKED от promotion. Non-bypassable gate.
- **Implementation scope**: MVP 3 дня (CPCV с 6-fold, purge=10, embargo=5). Full 2 недели (full combinatorial + parallel execution + PBO confidence intervals).
- **Where it plugs in**: E37 (WFOReport), `core/truth/truth_engine.mjs`.
- **Falsifiable test**: Применить CPCV к known-overfit стратегии (fitted на noise). Если PBO < 0.5 — CPCV implementation broken. Применить к стратегии с genuine alpha → PBO should be < 0.3.
- **Evidence gates**: PBO distribution histogram, OOS Sharpe distribution, seed dispersion report.
- **Red-team critique**: CPCV computationally expensive (O(C(n,k)) combinations). На малых datasets — high variance of PBO estimate.
- **Mitigation**: Subset sampling для MVP (random 100 combinations из C(n,k)). Confidence interval on PBO. Minimum dataset size requirement.

---

#### WOW-15
- **Track**: ROBUSTNESS
- **Title**: Deflated Sharpe Ratio (DSR) Gate
- **Mechanism**: Bailey & Lopez de Prado (2014): корректировка Sharpe ratio за множественное тестирование. DSR = SR / sqrt(1 + variance_correction + skew/kurtosis_penalty). Учитывает сколько стратегий было протестировано (trials count). Если DSR < critical_value → стратегия отклоняется.
- **Required data**: IS/OOS metrics + trials count (из strategy registry E33).
- **Determinism impact**: Pure computation. Trials count = immutable from registry.
- **Safety impact**: Prevents "best of N" selection bias. Mandatory для promotion gate.
- **Implementation scope**: MVP 1 день (DSR formula + gate check). Full 3 дня (integration с WFO pipeline + automated trials tracking).
- **Where it plugs in**: E37 (дополнение к WFOReport), E33 (StrategyManifest.trials_count field).
- **Falsifiable test**: Generate 1000 random strategies. Select best by raw Sharpe. DSR должен отклонить ~95%+. Если acceptance rate > 20% — DSR слишком слабый.
- **Evidence gates**: DSR value per strategy, trials count, acceptance/rejection log.
- **Red-team critique**: DSR depends on accurate trials count. Если не все trials logged — underestimate.
- **Mitigation**: Registry-enforced trials tracking. Unregistered strategies cannot be evaluated.

---

#### WOW-16
- **Track**: ROBUSTNESS
- **Title**: Walk-Forward Anchored Backtesting (WFAB)
- **Mechanism**: Расширение стандартного WFO: anchored expanding window (не sliding). Train window растёт monotonically, test window фиксирован. Это ближе к реальному experience (мы не забываем старые данные). Сравнение WFAB vs. standard WFO → если results сильно diverge → overfit warning.
- **Required data**: OHLCV + features (E31 pipeline).
- **Determinism impact**: Window definitions pre-committed, seed per window.
- **Safety impact**: Divergence между WFO и WFAB → стратегия under scrutiny. Large divergence = BLOCKED.
- **Implementation scope**: MVP 1 день (anchored window generator). Full 1 неделя (full comparison framework).
- **Where it plugs in**: E37 (WFOReport extension — dual mode).
- **Falsifiable test**: На synthetic data с known regime break: WFAB должен показать degradation, WFO может скрыть.
- **Evidence gates**: WFO vs. WFAB comparison report, divergence metrics.
- **Red-team critique**: Anchored window over-weights old data. In fast-changing markets — disadvantage.
- **Mitigation**: Use both methods. Divergence = information, не replacement.

---

#### WOW-17
- **Track**: ROBUSTNESS
- **Title**: Transaction Cost Sensitivity Analysis
- **Mechanism**: Для каждой стратегии — sweep по cost multipliers: 0.5x, 1.0x, 1.5x, 2.0x, 3.0x базовых costs. Построение "cost sensitivity curve": PnL vs. cost multiplier. Если стратегия убыточна при 1.5x costs — она "тонкокожая" и опасна.
- **Required data**: Уже есть (sim output + cost model).
- **Determinism impact**: Sweep = параметрический. Каждый run с тем же seed + разным cost multiplier.
- **Safety impact**: Тонкокожие стратегии не проходят promotion gate.
- **Implementation scope**: MVP 0.5 дня (sweep script). Full 2 дня (automated + visualization + threshold).
- **Where it plugs in**: E37 (WFO enrichment), E32 (SimReport.fee_model sensitivity).
- **Falsifiable test**: Стратегия с >2 Sharpe при 1.0x costs должна быть >1 Sharpe при 2.0x costs. Если breakeven при 1.3x — тонкокожая.
- **Evidence gates**: Cost sensitivity curve, breakeven multiplier, promotion/block decision.
- **Red-team critique**: Linear cost sweep может miss nonlinear effects (impact at high volume).
- **Mitigation**: Add volume-dependent cost scenarios для крупных стратегий.

---

#### WOW-18
- **Track**: EDGE / ROBUSTNESS
- **Title**: Multi-Horizon Signal Ensemble с Confidence Decay (MOONSHOT)
- **Mechanism**: Параллельные signal generators для разных horizons (5m, 1h, 4h, 1d). Ensemble: weighted average of signals, weights = f(recent_OOS_performance, regime_confidence). Confidence decay: signal weight снижается exponentially если OOS performance деградирует. Meta-strategy: может быть pure momentum, pure mean-reversion, или mixed — regime-conditional.
- **Required data**: OHLCV на всех timeframes. Multi-timeframe feature computation.
- **Determinism impact**: EMA weights deterministic (seed + config). Ensemble = pure function.
- **Safety impact**: Ensemble diversification → natural risk reduction. No single-strategy concentration.
- **Implementation scope**: MVP 3 дня (2-horizon ensemble с static weights). Full 2 недели (N-horizon + adaptive weights + regime conditioning).
- **Where it plugs in**: E33 (multi-strategy registry), E34 (Signal aggregation), E35 (Portfolio — ensemble position).
- **Falsifiable test**: OOS Sharpe of ensemble > max(individual strategy Sharpes) - 0.1. Если ensemble consistently worse — aggregation hurts.
- **Evidence gates**: Per-strategy vs. ensemble performance comparison, weight trajectory, diversification ratio.
- **Red-team critique**: Если все horizons are correlated (e.g., все momentum) — no diversification benefit. Weight adaptation may overfit to recent regime.
- **Mitigation**: Minimum diversity constraint (max correlation < 0.7 between signals). Weight update с long EMA (decay half-life > 20 periods).

---

#### WOW-19
- **Track**: ROBUSTNESS
- **Title**: Synthetic Stress Scenario Generator
- **Mechanism**: Генерация синтетических stress scenarios: flash crash (−15% за 5 баров), liquidation cascade (volume spike + price cascade), black swan vol expansion (vol 5x за 1 hour). Inject в sim и verify strategy behavior. Стратегия должна survive каждый scenario с loss < max_stress_dd.
- **Required data**: Нет (генерация). Calibration по historical worst-case (March 2020, May 2021, FTX Nov 2022).
- **Determinism impact**: Scenarios generated с фиксированным seed. Immutable scenario manifests.
- **Safety impact**: Failure at any stress scenario → BLOCKED from promotion.
- **Implementation scope**: MVP 2 дня (3 базовых сценария). Full 1 неделя (10+ scenarios + calibration по historical events).
- **Where it plugs in**: E37 (validation enrichment), E36 (Risk FSM verification under stress).
- **Falsifiable test**: Known blow-up strategy (e.g., naked short vol) MUST fail stress test. If it passes — generator too weak.
- **Evidence gates**: Stress test report per scenario, max DD per scenario, strategy verdict.
- **Red-team critique**: Synthetic scenarios may be unrealistic (never seen in real market).
- **Mitigation**: Calibration по historical extremes + 2x amplification. Scenarios are conservative by design.

---

#### WOW-20
- **Track**: ROBUSTNESS
- **Title**: Drawdown Speed Monitor с Early Warning
- **Mechanism**: Мониторинг не только drawdown depth, но и drawdown speed (скорость нарастания). Metric: `dd_speed = delta_dd / delta_t`. Fast drawdown (>1% equity per bar) → immediate Risk FSM escalation даже если absolute DD ещё не critical.
- **Required data**: Equity curve (real-time или sim).
- **Determinism impact**: Pure computation on equity series.
- **Safety impact**: Fast DD → CAUTIOUS → RESTRICTED. Prevents slow reaction to sudden regime break.
- **Implementation scope**: MVP 0.5 дня (speed metric + threshold). Full 2 дня (adaptive threshold + integration с Risk FSM).
- **Where it plugs in**: E36 (Kill-switch matrix — new trigger: drawdown speed), `core/risk/risk_governor.mjs`.
- **Falsifiable test**: Inject 2% equity loss in 1 bar. Если Risk FSM не escalate within next bar — broken.
- **Evidence gates**: DD speed alert log, FSM transition proof.
- **Red-team critique**: Too aggressive → false alarms during normal vol.
- **Mitigation**: Threshold calibrated per strategy volatility class. HEURISTIC with quarterly calibration.

---

#### WOW-21
- **Track**: ROBUSTNESS
- **Title**: Correlation Breakdown Detector для Portfolio Risk
- **Mechanism**: Tracking rolling correlation matrix eigenvalue concentration. При correlation breakdown (все eigenvalues collapse to 1) — portfolio diversification исчезает. Alert: Herfindahl Index of eigenvalues > threshold → CAUTIOUS.
- **Required data**: Multi-asset returns (минимум 3-5 assets в portfolio).
- **Determinism impact**: Eigenvalue computation с fixed tolerance. Stable sort.
- **Safety impact**: Correlation breakdown → portfolio risk выше чем модель думает → position reduction.
- **Implementation scope**: MVP 1 день. Full 3 дня (rolling + adaptive threshold).
- **Where it plugs in**: E36 (Risk enrichment), E35 (Portfolio allocation input).
- **Falsifiable test**: Inject synthetic correlation spike. Если detector не fire — broken.
- **Evidence gates**: Eigenvalue concentration trajectory, Herfindahl index log.
- **Red-team critique**: Short rolling window → noisy. Long window → too slow.
- **Mitigation**: Dual-window approach (fast 20-bar + slow 100-bar). Alert on fast window, confirm on slow.

---

#### WOW-22
- **Track**: ROBUSTNESS
- **Title**: Anti-Blowup Shield: Drawdown-Conditional Dynamic Sizing (MOONSHOT)
- **Mechanism**: Position sizing = f(current_dd / max_allowed_dd). Формула: `size_multiplier = max(floor, (1 - dd/max_dd)^exponent)`. При dd=0 → full size. При dd приближается к max_dd → size стремится к floor (e.g., 10%). Exponent > 1 = aggressive compression (e.g., exponent=2: при dd=50% max → size=25%). Это математическая гарантия, что blowup невозможен при любом single-bar loss < 100%.
- **Required data**: Equity curve (в реальном времени).
- **Determinism impact**: Pure function. Parameters in config.
- **Safety impact**: КРИТИЧЕСКИЙ. Это primary anti-blowup mechanism. Non-bypassable.
- **Implementation scope**: MVP 1 день. Full 3 дня (integration с E35 allocator + stress testing).
- **Where it plugs in**: E35 (PortfolioState.exposure computation), E36 (Risk FSM interaction).
- **Falsifiable test**: Monte Carlo sim: 10000 equity paths с random returns. С WOW-22: max DD < max_allowed_dd в 99.9%+ cases. Без WOW-22: blowup in >>0.1% cases.
- **Evidence gates**: Monte Carlo simulation report, blowup probability estimation, worst-case path analysis.
- **Red-team critique**: При длительном drawdown — позиции настолько малы, что recovery невозможен.
- **Mitigation**: Floor parameter (minimum 10% of normal size). Recovery mode: gradual size increase при DD improvement. HALTED override при max DD breach.

---

#### WOW-23
- **Track**: ROBUSTNESS
- **Title**: Tail Risk Budget с Conditional VaR (CVaR)
- **Mechanism**: Вместо VaR (useless для fat tails) — CVaR (Expected Shortfall). Position sizing constrained so that portfolio CVaR(99%) < daily_risk_budget. CVaR estimated via historical simulation с emphasis на worst 1% outcomes.
- **Required data**: Returns history (300+ observations minimum).
- **Determinism impact**: Historical simulation с fixed data window. Bootstrap seed fixed.
- **Safety impact**: CVaR breach → Risk FSM CAUTIOUS + position reduction until compliant.
- **Implementation scope**: MVP 2 дня (historical CVaR estimation + size constraint). Full 1 неделя (parametric CVaR + stress-augmented tail).
- **Where it plugs in**: E35 (Portfolio allocation constraint), E36 (Risk trigger).
- **Falsifiable test**: Construct portfolio violating CVaR budget intentionally. Gate MUST reject. Construct compliant portfolio. Gate MUST pass.
- **Evidence gates**: CVaR estimation report, budget compliance log, rejection log.
- **Red-team critique**: Historical CVaR underestimates truly unprecedented events.
- **Mitigation**: Stress-augmented CVaR: mix historical + synthetic worst-case (WOW-19).

---

#### WOW-24
- **Track**: ROBUSTNESS
- **Title**: Maximum Loss Governor (Hard Stop per-Trade + per-Day + per-Week)
- **Mechanism**: Три уровня hard stops: (1) per-trade: max loss = X% equity (HEURISTIC: 1%); (2) per-day: max daily loss = Y% equity (HEURISTIC: 3%); (3) per-week: max weekly loss = Z% equity (HEURISTIC: 5%). Breach → immediate position closure + cooldown.
- **Required data**: Real-time PnL tracking (уже в `core/risk/risk_governor.mjs`).
- **Determinism impact**: Thresholds in config. Breach detection = deterministic.
- **Safety impact**: КРИТИЧЕСКИЙ. Тройная защита от serial losses. Non-bypassable.
- **Implementation scope**: MVP 1 день (extend existing RiskGovernorState). Full 2 дня (weekly tracking + integration tests).
- **Where it plugs in**: E36 (Kill-switch matrix extension), `core/risk/risk_governor.mjs`.
- **Falsifiable test**: Inject losses exceeding each threshold. Если позиции не закрыты + cooldown не activated — broken.
- **Evidence gates**: Breach log, cooldown activation proof, position closure proof.
- **Red-team critique**: Rigid stops → forced selling at worst prices.
- **Mitigation**: HEURISTIC thresholds calibrated quarterly. Cooldown is time-based (not price-based) to avoid selling into panic.

---

#### WOW-25
- **Track**: ROBUSTNESS
- **Title**: PnL Attribution Engine (Decomposition: Alpha + Beta + Costs + Slippage)
- **Mechanism**: Разложение PnL на компоненты: (a) alpha component (excess return after factor adjustment), (b) beta component (market exposure return), (c) transaction costs (fees), (d) slippage (execution shortfall), (e) funding costs. Позволяет видеть, откуда реально приходит прибыль.
- **Required data**: Trade log + market returns + cost records.
- **Determinism impact**: Decomposition = deterministic computation on immutable trade log.
- **Safety impact**: Если alpha component ≤ 0 → стратегия живёт на beta → не нужна. Immediate red flag.
- **Implementation scope**: MVP 2 дня (simple alpha/beta/cost split). Full 1 неделя (full factor model + attribution report).
- **Where it plugs in**: E37 (WFO enrichment — PnL attribution per window), reports pipeline.
- **Falsifiable test**: На рынке с 0 alpha (random entries): attribution должен показать alpha ≈ 0 + costs < 0. Если alpha > 0 → attribution broken.
- **Evidence gates**: PnL attribution report per strategy per period, alpha stability chart.
- **Red-team critique**: Factor model может быть misspecified → alpha estimate biased.
- **Mitigation**: Multiple factor specifications. Conservative alpha estimate = min across specifications.

---

### TRACK C: AI AGENTS — Исследовательская фабрика и QA-автоматизация

---

#### WOW-26
- **Track**: AI
- **Title**: Hypothesis Generator Agent (Automated Feature Discovery)
- **Mechanism**: AI-agent, который генерирует hypothesis candidates: "Feature X предсказывает returns на horizon H с IC > threshold". Источник идей: combinatorial feature engineering (cross-products, lags, transformations) + pattern library. Output: ranked list of hypotheses с prior confidence estimates. Каждая hypothesis → automated pipeline для проверки.
- **Required data**: Feature matrix из E31 pipeline.
- **Determinism impact**: Feature generation = deterministic (seed + transformation catalog). Ranking = deterministic scoring.
- **Safety impact**: Hypothesis count = controlled (max N per run). Prevents unbounded compute.
- **Implementation scope**: MVP 2 дня (100 template transformations + IC scoring). Full 2 недели (ML-guided search + pruning).
- **Where it plugs in**: E31 (Feature extension), E37 (WFO pipeline input), AI Agent Mesh (WOW-35).
- **Falsifiable test**: На synthetic data с known true feature: generator MUST surface true feature in top-10% of candidates. Если нет — generator useless.
- **Evidence gates**: Hypothesis catalog (immutable), IC ranking report, accepted/rejected log.
- **Red-team critique**: Combinatorial explosion → multiple testing nightmare.
- **Mitigation**: DSR gate (WOW-15) применяется к hypothesis count. Strict FDR control.

---

#### WOW-27
- **Track**: AI
- **Title**: Leakage Sentinel Agent (Automated Leakage Hunting)
- **Mechanism**: Специализированный agent, который непрерывно тестирует pipeline на data leakage: (1) future-mutation test (mutate future → check feature change), (2) split-aware normalization check (scaler fit stats hash), (3) timestamp monotonicity check, (4) label availability check (label not computed from future data). Runs automatically перед каждым WFO evaluation.
- **Required data**: Feature pipeline config + data snapshots.
- **Determinism impact**: All checks = deterministic. Positive/negative controls with fixed fixtures.
- **Safety impact**: КРИТИЧЕСКИЙ. Any leakage detection = HARD FAIL → pipeline BLOCKED.
- **Implementation scope**: MVP 2 дня (4 core checks). Full 1 неделя (extended battery + automated fixture generation).
- **Where it plugs in**: E37 (leakage battery), E31 (feature pipeline guards), AI Agent Mesh.
- **Falsifiable test**: Inject 5 types of known leakage. Sentinel MUST catch all 5. False negative = broken sentinel.
- **Evidence gates**: `LEAKAGE_POSITIVE_CONTROL.log`, `LEAKAGE_NEGATIVE_CONTROL.log` (per AI_MODULE.md).
- **Red-team critique**: Novel leakage types may bypass known patterns.
- **Mitigation**: Fuzzing mode (WOW-30): random mutations to pipeline → check if OOS performance implausibly improves.

---

#### WOW-28
- **Track**: AI
- **Title**: WFO Orchestrator Agent (Parallel Walk-Forward Executor)
- **Mechanism**: Agent координирует массовый WFO: sharding по (strategy × window × seed), parallel execution, result aggregation, deterministic evidence packing. Input: strategy registry + window definitions + seed vector. Output: aggregated WFOReport with per-window metrics, seed dispersion, PBO estimate.
- **Required data**: Feature matrix + strategy configs + compute resources.
- **Determinism impact**: Each shard: fixed (strategy, window, seed) tuple. Aggregate = deterministic merge sorted by shard_id.
- **Safety impact**: Orchestrator enforces purge/embargo. Cannot skip or modify windows.
- **Implementation scope**: MVP 2 дня (serial WFO with seed loop). Full 2 недели (parallel + distributed + sharding).
- **Where it plugs in**: E37 (WFOReport production), AI Agent Mesh.
- **Falsifiable test**: Run WFO twice с identical inputs. Outputs MUST be byte-identical. Если нет — nondeterminism leak.
- **Evidence gates**: WFOReport + seed dispersion + sharding manifest + replay proof.
- **Red-team critique**: Parallel execution may introduce nondeterminism (race conditions, floating point).
- **Mitigation**: Deterministic merge protocol. Each shard independently deterministic. No shared mutable state.

---

#### WOW-29
- **Track**: AI
- **Title**: Risk Governor Agent (Automated Risk State Management)
- **Mechanism**: Agent мониторит all risk metrics в реальном времени и управляет FSM transitions: NORMAL→CAUTIOUS→RESTRICTED→HALTED. Input: equity curve, position state, market data, gap scores. Output: risk actions (reduce exposure, close positions, halt). All actions logged and auditable.
- **Required data**: Portfolio state + market data (from shadow or sim).
- **Determinism impact**: FSM = deterministic state machine. Same inputs → same transitions.
- **Safety impact**: КРИТИЧЕСКИЙ. Agent is the "last line of defense". Non-bypassable.
- **Implementation scope**: MVP 1 день (extend `core/risk/risk_governor.mjs` с FSM logic). Full 1 неделя (full kill-switch matrix + cooldown management).
- **Where it plugs in**: E36 (RiskState), E38 (GapReport → Risk FSM), AI Agent Mesh.
- **Falsifiable test**: Inject каждый kill-switch trigger (DD breach, loss streak, gap spike, etc.). FSM MUST transition correctly каждый раз.
- **Evidence gates**: FSM transition log, trigger→action mapping proof, HALTED exit proof (cooldown + ack + replay).
- **Red-team critique**: Agent может быть too aggressive (frequent HALTED) или too slow (delayed reaction).
- **Mitigation**: Configurable thresholds per HEURISTIC policy. Calibration protocol.

---

#### WOW-30
- **Track**: AI
- **Title**: Leakage Sentinel v3: Automated Fuzzing Pipeline (MOONSHOT)
- **Mechanism**: Beyond fixed leakage checks (WOW-27): automated fuzzing. Agent randomly mutates pipeline components: (1) shuffle feature order, (2) add random lag to timestamps, (3) inject future data into random features, (4) swap train/test partition boundaries, (5) remove embargo bars. After each mutation: run WFO. If OOS Sharpe implausibly improves → potential leakage vector found.
- **Required data**: Feature pipeline + WFO infrastructure.
- **Determinism impact**: Mutation seed fixed. Each mutation = deterministic transformation.
- **Safety impact**: КРИТИЧЕСКИЙ. Finds leakage that manual checks miss.
- **Implementation scope**: MVP 3 дня (5 mutation types × 10 seeds). Full 2 недели (50+ mutation types + importance ranking).
- **Where it plugs in**: E37 (leakage battery v3), AI Agent Mesh.
- **Falsifiable test**: Insert 3 known subtle leakages. Fuzzer MUST discover at least 2/3. Если < 2/3 → fuzzer insufficient.
- **Evidence gates**: Mutation catalog, per-mutation OOS delta, leakage candidate list, false positive rate.
- **Red-team critique**: Fuzzing is computationally expensive. False positives from random noise.
- **Mitigation**: Statistical significance threshold for OOS improvement (p < 0.01). Tiered execution: fast fuzz (10 mutations) → deep fuzz (50+) only on candidates.

---

#### WOW-31
- **Track**: AI
- **Title**: Data Provenance Chain Agent
- **Mechanism**: Immutable provenance chain: каждый data artifact получает hash, parent references, transformation description. Agent validates chain integrity: any broken link = HARD FAIL. Chain stored as append-only JSON manifest. Enables full trace from signal → features → raw data.
- **Required data**: Все data artifacts (snapshots, feature manifests, sim reports).
- **Determinism impact**: Provenance chain IS determinism infrastructure.
- **Safety impact**: Broken provenance = untrusted data → BLOCKED.
- **Implementation scope**: MVP 1 день (chain builder + validator). Full 1 неделя (visualization + audit tooling).
- **Where it plugs in**: E31 (FeatureManifest.provenance), E40 (CertificationReport.evidence_hash), AI Agent Mesh.
- **Falsifiable test**: Break one link in chain (modify artifact without updating hash). Validator MUST detect.
- **Evidence gates**: Provenance chain manifest, validation log, integrity proof.
- **Red-team critique**: Chain cannot prevent malicious modification at the root (initial data source).
- **Mitigation**: Root anchoring: raw data snapshot hash anchored to external timestamp service (offline).

---

#### WOW-32
- **Track**: AI
- **Title**: Evidence Packager Agent (Automated Gate Report Generation)
- **Mechanism**: Agent автоматически собирает evidence artifacts после каждого gate run: logs, manifests, diffs, verdicts. Validates completeness against epoch-specific checklist. Produces md-only evidence pack under `reports/evidence/<EPOCH>/`.
- **Required data**: Gate outputs + checksums.
- **Determinism impact**: Packaging = deterministic. Same inputs → same md content (modulo timestamps in metadata).
- **Safety impact**: Prevents "evidence theater" (anti-pattern #19). Incomplete evidence = BLOCKED.
- **Implementation scope**: MVP 1 день. Full 3 дня (multi-epoch + delta comparison + archival).
- **Where it plugs in**: All epochs (evidence infrastructure), AI Agent Mesh.
- **Falsifiable test**: Run gate, then delete 1 evidence file. Packager MUST report incomplete.
- **Evidence gates**: Completeness checklist result, packaged evidence manifest.
- **Red-team critique**: Agent может generate "plausible-looking" evidence from incomplete runs.
- **Mitigation**: Evidence hash chain must link to actual gate run output hashes. Cross-validation.

---

#### WOW-33
- **Track**: AI
- **Title**: Red-Team Agent (Adversarial Strategy Tester)
- **Mechanism**: Agent активно пытается "сломать" стратегию: (1) inject adversarial market conditions, (2) amplify costs, (3) degrade data quality, (4) spike correlations, (5) simulate exchange downtime. Любой test где стратегия теряет > threshold → red flag report.
- **Required data**: Strategy + sim infrastructure.
- **Determinism impact**: Adversarial scenarios = deterministic (seed + scenario manifest).
- **Safety impact**: Стратегия, не прошедшая red-team → NOT PROMOTED.
- **Implementation scope**: MVP 2 дня (5 adversarial scenarios). Full 2 недели (20+ scenarios + automated report).
- **Where it plugs in**: E37 (validation extension), E33 (strategy qualification gate), AI Agent Mesh.
- **Falsifiable test**: Strategy known-vulnerable to liquidity crisis. Red-team MUST find the vulnerability. Если нет → red-team too weak.
- **Evidence gates**: Adversarial scenario catalog, per-scenario strategy performance, vulnerability report.
- **Red-team critique**: Agent may not find truly novel attack vectors.
- **Mitigation**: Scenario library updated from real market incidents. Historical worst-case calibration.

---

#### WOW-34
- **Track**: AI
- **Title**: Microstructure Calibrator Agent (Sim↔Shadow Alignment)
- **Mechanism**: Agent сравнивает sim fills vs. shadow fills (E39) и auto-calibrates sim parameters: spread model, impact model, latency distribution. Output: calibrated SimConfig artifact + GapReport delta trajectory. При large gap → triggers auto-brake.
- **Required data**: Shadow fill records + sim replay with same inputs.
- **Determinism impact**: Calibration = offline batch. Result = immutable config artifact.
- **Safety impact**: Gap score monitored continuously. Large gap → Risk FSM CAUTIOUS.
- **Implementation scope**: MVP 2 дня (linear regression calibration). Full 2 недели (Bayesian calibration + online update).
- **Where it plugs in**: E32 (SimReport calibration), E38 (GapReport), E39 (Shadow data source), AI Agent Mesh.
- **Falsifiable test**: Artificially degrade sim accuracy (set slippage=0). Calibrator MUST detect large gap and adjust.
- **Evidence gates**: Calibration manifest, gap trajectory, parameter change log.
- **Red-team critique**: Calibration can overfit to recent market conditions.
- **Mitigation**: Regularization in calibration model. Conservative fallback if uncertainty high.

---

#### WOW-35
- **Track**: AI
- **Title**: AI Research Agent Mesh с детерминистичным воспроизведением (MOONSHOT)
- **Mechanism**: Координированная mesh из 7 агентов (Researcher, Leakage Sentinel, Microstructure Calibrator, WFO Orchestrator, Risk Governor, Evidence Packager, Red-Team), работающих через message bus с immutable log. Каждый agent = independent process с defined input/output contracts. Communication через JSON messages. Full replay: message log replay reproduces identical agent behavior.
- **Required data**: All project data + configurations.
- **Determinism impact**: КЛЮЧЕВОЙ. Каждый agent deterministic. Message bus = ordered, immutable. Replay = identical.
- **Safety impact**: Agent mesh cannot execute live orders. Shadow-only. Red-Team agent actively attacks.
- **Implementation scope**: MVP 3 дня (3 agents: Researcher + Leakage Sentinel + Evidence Packager). Full 3 недели (full 7-agent mesh + replay infrastructure).
- **Where it plugs in**: All EDGE epochs. Оркестрация через `core/ai/master_orchestrator.mjs` (расширение).
- **Falsifiable test**: Replay agent mesh from message log. Output MUST be byte-identical to original run.
- **Evidence gates**: Agent run manifest, message log, replay diff, per-agent verdicts.
- **Red-team critique**: Complex multi-agent system = hard to debug. Emergent behaviors.
- **Mitigation**: Each agent independently testable. Integration tests for 2-agent pairs. Gradual mesh expansion (3 → 5 → 7 agents).

---

#### WOW-36
- **Track**: AI
- **Title**: Anomaly Detection Agent (Market + System Anomalies)
- **Mechanism**: Расширение `core/ml/anomaly_detector.mjs`. Dual-mode: (1) market anomaly — price/volume/correlation regime breaks, (2) system anomaly — latency spikes, data gaps, pipeline delays. Output: anomaly score per timestep. Score > threshold → Risk FSM alert.
- **Required data**: Market data + system telemetry.
- **Determinism impact**: Anomaly model fitted offline. Score computation = deterministic.
- **Safety impact**: Anomaly detection = early warning system.
- **Implementation scope**: MVP 1 день (z-score based detector). Full 1 неделя (isolation forest + autoencoder).
- **Where it plugs in**: E36 (Risk trigger), E38 (Gap enrichment), AI Agent Mesh.
- **Falsifiable test**: Inject synthetic anomaly (volume 10x spike). Detector MUST fire. Inject normal data. Detector MUST NOT fire.
- **Evidence gates**: Anomaly score trajectory, detection precision/recall on synthetic fixtures.
- **Red-team critique**: Anomaly ≠ actionable. Many anomalies are harmless.
- **Mitigation**: Tiered response: score → alert levels → only high-severity triggers Risk FSM.

---

#### WOW-37
- **Track**: AI
- **Title**: Strategy Performance Decay Predictor
- **Mechanism**: Agent мониторит rolling OOS performance каждой стратегии. Predicts performance trajectory: если projected Sharpe crosses below minimum → pre-emptive deactivation. Uses exponential decay model fitted on recent performance history.
- **Required data**: Strategy PnL history (rolling windows).
- **Determinism impact**: Decay model = deterministic. Fixed parameters in config.
- **Safety impact**: Pre-emptive deactivation → prevents extended losses from dying strategy.
- **Implementation scope**: MVP 1 день (rolling Sharpe + linear extrapolation). Full 1 неделя (exponential decay + confidence intervals).
- **Where it plugs in**: E33 (strategy lifecycle), E37 (WFO extension), AI Agent Mesh.
- **Falsifiable test**: Strategy с known linear decay. Predictor should forecast crossing below min Sharpe within ±2 windows.
- **Evidence gates**: Prediction vs. actual performance trajectory, deactivation trigger log.
- **Red-team critique**: Mean-reverting strategy performance may be incorrectly killed.
- **Mitigation**: Grace period (N windows of continued monitoring before deactivation). Regime-aware prediction.

---

#### WOW-38
- **Track**: AI
- **Title**: Governance Automation Agent (Policy Enforcement)
- **Mechanism**: Agent enforces project governance: (1) no secrets in repo (scan), (2) md-only in reports/ (scan), (3) offline-first default (network guard), (4) evidence completeness (checklist), (5) determinism (replay check). Runs as pre-commit hook equivalent.
- **Required data**: Repository state.
- **Determinism impact**: All checks = deterministic.
- **Safety impact**: Prevents governance violations before they enter pipeline.
- **Implementation scope**: MVP 1 день (5 checks). Full 3 дня (full governance matrix from specs/CONSTRAINTS.md).
- **Where it plugs in**: All epochs (governance infrastructure), scripts/verify/ extension.
- **Falsifiable test**: Commit a .json file to reports/. Agent MUST block. Commit a .md file. Agent MUST pass.
- **Evidence gates**: Governance check log, violation list, resolution actions.
- **Red-team critique**: Overly strict governance → developer friction.
- **Mitigation**: Clear bypass mechanism for justified exceptions (written risk acceptance).

---

## 3. THE "MOONSHOT 7" — Глубокий разбор

---

### MOONSHOT 1: WOW-03 — Адаптивная модель микроструктуры

**Step-by-step build plan:**
1. Создать `core/sim/adaptive_microstructure.mjs` с parametric spread model: `effective_spread = base_spread × (1 + vol_sensitivity × normalized_vol + tof_sensitivity × time_of_day_bucket)`.
2. Добавить market impact model: `impact_bps = alpha × (order_size / adv)^beta`. α и β — calibration parameters.
3. Добавить stochastic latency: `latency_ms = base_latency + rng.exponential(lambda)`.
4. Создать CalibrationManifest: `{params, fit_date, dataset_ref, fit_metrics, valid_until}`.
5. Интегрировать с `core/sim/engine.mjs` (replace fixed spread proxy).
6. Создать gap monitor: sim fills → shadow fills comparison → GapScore.

**Evaluation protocol:**
- WFO с calibrated vs. fixed model. Compare OOS Sharpe stability.
- Gap analysis: median absolute deviation of sim_fill_price vs. shadow_fill_price.
- Threshold: MAD < 3 bps → model adequate. MAD > 5 bps → model needs recalibration.

**Risk budget + stop rules:**
- Max development time: 2 недели. Если через 1 неделю нет calibration working → simplify to parametric-only.
- Calibration must improve sim realism by ≥20% (gap reduction). Если improvement < 10% → abort.

**Expected payoff profile:**
- HEURISTIC: 30-50% reduction in sim→live PnL gap. Calibration plan: measure on first 500 shadow trades.

---

### MOONSHOT 2: WOW-07 — Regime Detection Engine

**Step-by-step build plan:**
1. Создать `core/ml/regime_detector.mjs` с 3-state HMM.
2. Features для HMM: `[log_return, abs_return (proxy vol), return_autocorr_lag1]`.
3. Offline fit: Baum-Welch algorithm с EM iterations (max 100, convergence tolerance 1e-6).
4. Online inference: Forward algorithm → posterior probabilities.
5. Regime labels: cluster states по emission means → TRENDING / MEAN_REVERTING / HIGH_VOL.
6. Add minimum dwell time constraint (post-processing: require N consecutive posterior > threshold).
7. Интегрировать с FeatureFrame (regime_prob fields) и Risk FSM (HIGH_VOL → CAUTIOUS).

**Evaluation protocol:**
- CPCV (WOW-14) на стратегии с regime filter vs. без.
- Confusion matrix: predicted regime vs. realized (ex-post classification by rolling Sharpe sign).
- Information ratio: regime-filtered strategy vs. unfiltered.

**Risk budget + stop rules:**
- Max development: 2 недели MVP. Если OOS Sharpe improvement < 0.05 через CPCV → regime filter not adding value. Downgrade to simple vol regime (high/low) без HMM.

**Expected payoff profile:**
- HEURISTIC: 15-30% drawdown reduction in wrong-regime periods. Calibration: measure on 3 distinct market periods (trending, choppy, crash).

---

### MOONSHOT 3: WOW-14 — CPCV Pipeline

**Step-by-step build plan:**
1. Создать `core/truth/cpcv.mjs`.
2. Input: feature matrix, labels, N_splits, purge_bars, embargo_bars.
3. Generate all C(N, N/2) combinations (for N=6 → C(6,3)=20 combinations).
4. For each combination: train on selected splits, test on remaining, with purge+embargo.
5. Collect OOS metrics per combination.
6. Compute PBO: proportion of combinations where IS-optimized strategy ranks below median in OOS.
7. Output: PBO value, OOS Sharpe distribution, per-combination results.

**Evaluation protocol:**
- Validate on synthetic data: strategy fit on noise → PBO should be ~0.5 (no better than random).
- Strategy with genuine alpha → PBO should be < 0.3.
- Cross-check with DSR (WOW-15): both should agree on overfit strategies.

**Risk budget + stop rules:**
- Max development: 3 дня MVP. Full combinatorial can be expensive: if C(N,k) > 1000, sample 200 random combinations.
- Если на 3 known-overfit strategies PBO < 0.4 → CPCV implementation has bug.

**Expected payoff profile:**
- HEURISTIC: Eliminates 80%+ of overfit strategies before live deployment. Calibration: retrospective analysis on historical strategy performance.

---

### MOONSHOT 4: WOW-18 — Multi-Horizon Signal Ensemble

**Step-by-step build plan:**
1. Создать `core/strategy/multi_horizon_ensemble.mjs`.
2. Define signal sources: strategy_5m, strategy_1h, strategy_4h.
3. Each generates Signal с confidence score.
4. Ensemble: `combined_signal = Σ(weight_i × signal_i × confidence_i)` / `Σ(weight_i)`.
5. Weights initialized equal, adjusted by rolling OOS IC (Information Coefficient).
6. Weight update: `w_i(t+1) = w_i(t) × (1 - decay_rate) + decay_rate × normalized_IC_i`.
7. Add correlation penalty: if signals too correlated, penalize the weaker one.

**Evaluation protocol:**
- OOS Sharpe of ensemble vs. individual strategies (WFO).
- Diversification ratio: portfolio vol / weighted sum of individual vols.
- Weight stability analysis (should not flip-flop rapidly).

**Risk budget + stop rules:**
- Max development: 3 дня MVP (2 horizons, static weights). Если ensemble Sharpe < best individual - 0.1 → ensemble not working.
- Full: 2 недели. Если adaptive weights destabilize → fallback to static equal weights.

**Expected payoff profile:**
- HEURISTIC: 10-20% Sharpe improvement through diversification. 15-25% drawdown reduction. Calibration: compare on 4+ OOS periods.

---

### MOONSHOT 5: WOW-22 — Anti-Blowup Shield

**Step-by-step build plan:**
1. Создать `core/risk/anti_blowup_shield.mjs`.
2. Core formula: `size_multiplier = max(floor, (1 - current_dd / max_dd) ^ exponent)`.
3. Parameters: `floor = 0.10` (10% of normal size), `max_dd = 0.15` (15%), `exponent = 2.0`.
4. Интегрировать в `core/risk/risk_governor.mjs`: apply multiplier to every position sizing call.
5. Add recovery mode: when DD decreases by X% from peak DD → gradually increase floor.
6. Monte Carlo validation: 10000 paths × 1000 bars → verify blowup probability.

**Evaluation protocol:**
- Monte Carlo: P(max_dd > max_allowed_dd) < 0.1% (with shield) vs. >1% (without).
- Backtest on historical crisis periods (March 2020, May 2021, Nov 2022).
- Recovery analysis: time to recover from DD=50% of max_dd.

**Risk budget + stop rules:**
- Max development: 1 день MVP. Если Monte Carlo shows blowup probability > 0.5% → exponent or floor needs adjustment.
- Non-negotiable: shield cannot be disabled. Only parameters tunable.

**Expected payoff profile:**
- HEURISTIC: 95%+ reduction in blowup probability. Moderate drag on returns (5-15%) during drawdown periods due to reduced sizing. Net positive: survival >> returns.

---

### MOONSHOT 6: WOW-30 — Leakage Sentinel v3: Fuzzing Pipeline

**Step-by-step build plan:**
1. Создать `core/truth/leakage_fuzzer.mjs`.
2. Define mutation operators: (a) timestamp_shift, (b) feature_shuffle, (c) future_inject, (d) split_swap, (e) embargo_remove, (f) label_peek, (g) scaler_leak, (h) universe_peek.
3. For each mutation: apply to pipeline → run abbreviated WFO (2 windows, fast) → measure OOS Sharpe delta.
4. Statistical test: if OOS Sharpe improves by > 2σ of baseline noise → mutation found leakage vector.
5. Rank mutations by leakage severity (Sharpe delta magnitude).
6. Output: leakage vulnerability report.

**Evaluation protocol:**
- Inject 5 known leakage types with varying severity. Fuzzer MUST detect ≥4/5.
- False positive rate: on clean pipeline, should flag < 5% of mutations.
- Calibration: run on 3+ strategies.

**Risk budget + stop rules:**
- Max development: 3 дня MVP (5 mutations × 10 seeds). Если detection rate < 60% on known leakages → rethink mutation operators.
- Full: 2 недели (50 mutations + statistical framework).

**Expected payoff profile:**
- HEURISTIC: Catches 80%+ of subtle leakage vectors that manual review misses. Calibration: retrospective analysis on strategies where live PnL << backtest PnL.

---

### MOONSHOT 7: WOW-35 — AI Research Agent Mesh

**Step-by-step build plan:**
1. Создать `core/ai/agent_mesh/` directory.
2. Message bus: `core/ai/agent_mesh/message_bus.mjs` — ordered, append-only, JSON log.
3. Base agent class: `core/ai/agent_mesh/base_agent.mjs` — input/output contracts, deterministic execution.
4. MVP agents (3):
   - Researcher (WOW-26): generates hypotheses → message bus.
   - Leakage Sentinel (WOW-27): receives hypothesis → runs leakage checks → verdict.
   - Evidence Packager (WOW-32): collects results → produces md evidence.
5. Integration: `core/ai/agent_mesh/orchestrator.mjs` — координирует pipeline.
6. Replay: `core/ai/agent_mesh/replay.mjs` — replays from message log → verifies identical output.
7. Phase 2: add WFO Orchestrator + Risk Governor + Calibrator + Red-Team.

**Evaluation protocol:**
- Replay test: identical message log → byte-identical outputs.
- Throughput: hypotheses evaluated per hour (target: 100+ в MVP).
- Quality: % of accepted hypotheses that survive CPCV vs. manual selection rate.

**Risk budget + stop rules:**
- MVP: 3 дня для 3-agent mesh. Если replay test fails → fix determinism before adding agents.
- Full: 3 недели. Если throughput < 10 hypotheses/hour → архитектурный redesign.

**Expected payoff profile:**
- HEURISTIC: 5-10x research velocity vs. manual hypothesis testing. Quality gate (CPCV) prevents quantity-over-quality trap. Calibration: compare 1 week manual vs. 1 week agent-assisted research output.

---

## 4. AI AGENT SYSTEM BLUEPRINT

### Архитектура: Agent Mesh v1

```
┌─────────────────────────────────────────────────────────────────┐
│                     MESSAGE BUS (append-only log)               │
│  [JSON messages, ordered by timestamp, immutable after write]   │
└───────┬───────┬───────┬───────┬───────┬───────┬───────┬────────┘
        │       │       │       │       │       │       │
   ┌────▼──┐┌──▼───┐┌──▼───┐┌──▼───┐┌──▼───┐┌──▼───┐┌──▼────┐
   │Resear-││Leaka-││Micro-││ WFO  ││ Risk ││Evide-││Red-   │
   │cher   ││ge    ││struct││Orch- ││Gover-││nce   ││Team   │
   │Agent  ││Senti-││Calib-││stra- ││nor   ││Packa-││Agent  │
   │       ││nel   ││rator ││tor   ││Agent ││ger   ││       │
   └───────┘└──────┘└──────┘└──────┘└──────┘└──────┘└───────┘
```

### Agents: имена, ответственности, контракты

#### 1. Researcher Agent
- **Ответственность**: Генерация и ранжирование hypothesis candidates.
- **Input contract**: `{type: "RESEARCH_REQUEST", feature_matrix_ref: string, config: ResearchConfig}`
- **Output contract**: `{type: "HYPOTHESIS_BATCH", hypotheses: [{id, description, feature_spec, prior_confidence, ic_estimate}]}`
- **Determinism**: Seed в ResearchConfig. Transformation catalog immutable.
- **Forbidden**: Network access. Unlogged computations. Infinite loops (max_hypotheses capped).

#### 2. Leakage Sentinel Agent
- **Ответственность**: Проверка каждой hypothesis и pipeline на data leakage.
- **Input contract**: `{type: "LEAKAGE_CHECK_REQUEST", hypothesis_id: string, pipeline_config_ref: string}`
- **Output contract**: `{type: "LEAKAGE_VERDICT", hypothesis_id: string, verdict: "CLEAN" | "LEAKAGE_DETECTED", tests: [{name, pass, detail}]}`
- **Determinism**: Fixed fixtures. Positive/negative controls mandatory.
- **Forbidden**: Skipping controls. Marking CLEAN without running all tests.

#### 3. Microstructure Calibrator Agent
- **Ответственность**: Калибровка sim model по shadow data.
- **Input contract**: `{type: "CALIBRATE_REQUEST", shadow_fills_ref: string, current_sim_config_ref: string}`
- **Output contract**: `{type: "CALIBRATION_RESULT", new_config: SimConfig, gap_score: number, calibration_manifest_ref: string}`
- **Determinism**: Calibration = offline batch. Fixed dataset.
- **Forbidden**: Online calibration without explicit flag. Calibrating on <100 samples.

#### 4. WFO Orchestrator Agent
- **Ответственность**: Координация walk-forward optimization runs.
- **Input contract**: `{type: "WFO_REQUEST", strategy_ref: string, window_defs: WindowDef[], seeds: number[], purge: number, embargo: number}`
- **Output contract**: `{type: "WFO_RESULT", report: WFOReport, pbo: number, oos_sharpe_distribution: number[]}`
- **Determinism**: Each (strategy, window, seed) tuple independently deterministic. Merge sorted by tuple.
- **Forbidden**: Modifying window definitions after start. Skipping purge/embargo.

#### 5. Risk Governor Agent
- **Ответственность**: Real-time FSM management + kill-switch enforcement.
- **Input contract**: `{type: "RISK_UPDATE", portfolio_state: PortfolioState, market_data: MarketSnapshot, gap_score: number}`
- **Output contract**: `{type: "RISK_ACTION", fsm_state: RiskState, actions: [{type: "REDUCE" | "CLOSE" | "HALT", detail}]}`
- **Determinism**: FSM = deterministic state machine. Same input sequence → same output sequence.
- **Forbidden**: Bypassing HALTED state. Ignoring kill-switch triggers. Placing orders.

#### 6. Evidence Packager Agent
- **Ответственность**: Сборка и валидация evidence artifacts.
- **Input contract**: `{type: "PACK_REQUEST", epoch: string, gate_outputs_ref: string[]}`
- **Output contract**: `{type: "EVIDENCE_PACK", manifest: EvidenceManifest, completeness: "COMPLETE" | "INCOMPLETE", missing: string[]}`
- **Determinism**: Packaging = deterministic. SHA256 checksums.
- **Forbidden**: Generating evidence without source data. Marking COMPLETE with missing files.

#### 7. Red-Team Agent
- **Ответственность**: Adversarial testing стратегий и инфраструктуры.
- **Input contract**: `{type: "REDTEAM_REQUEST", strategy_ref: string, scenarios: AdversarialScenario[]}`
- **Output contract**: `{type: "REDTEAM_REPORT", vulnerabilities: [{scenario, severity, description, recommendation}], verdict: "PASS" | "VULNERABLE"}`
- **Determinism**: Scenarios = deterministic (seed + manifest).
- **Forbidden**: Creating scenarios that require live market access. Modifying strategy code.

### Communication contracts
```json
{
  "message_schema": "1.0.0",
  "message_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "sender": "agent_name",
  "recipient": "agent_name | BROADCAST",
  "type": "REQUEST | RESPONSE | EVENT | ERROR",
  "payload": {},
  "parent_message_id": "uuid-v4 | null",
  "deterministic_fingerprint": "sha256_hex"
}
```

### Guardrails (Запреты для всех agents)
1. **NO NETWORK**: Agents работают offline по умолчанию. `ENABLE_NETWORK_TESTS=1` required.
2. **NO LIVE ORDERS**: Message bus не может содержать order placement messages.
3. **NO SECRETS**: Ни один agent не хранит credentials.
4. **DETERMINISTIC REPLAY**: Replay из message log MUST reproduce identical outputs.
5. **BOUNDED COMPUTE**: Каждый agent имеет timeout (configurable per agent type).
6. **IMMUTABLE MESSAGES**: After write, message cannot be modified или deleted.
7. **AUDIT TRAIL**: Every agent action logged with timestamp, input hash, output hash.

### Promotion rules (когда agent output принимается)
1. Hypothesis → accepted ТОЛЬКО если: Leakage Sentinel CLEAN + WFO OOS Sharpe > threshold + PBO < threshold + Red-Team PASS.
2. Calibration → applied ТОЛЬКО если: gap_score improvement > 10% + Evidence Pack COMPLETE.
3. Risk action → executed ТОЛЬКО если: FSM transition valid + trigger log complete.

### Интеграция с существующими gates
- `verify:specs` → Governance Agent validates spec compliance.
- `verify:wall` → Evidence Packager validates evidence completeness.
- Epoch gates (`verify:epoch31`..`verify:epoch40`) → WFO Orchestrator + Leakage Sentinel provide inputs.
- `clean-clone` (E40) → Full replay of agent mesh from message log on fresh environment.

---

## 5. "NEXT 10 DAYS" ACTION PLAN

### Day 1-3: Высшая информационная отдача (3 эксперимента)

**Experiment 1: Microstructure Reality Check (Day 1)**
- Цель: Измерить реальный gap между текущим sim и market reality.
- Действия: Запустить текущий `core/sim/engine.mjs` на 1000 bars с 3 режимами (optimistic/base/hostile). Записать все fills. Сравнить с historical fills (если доступны) или с theoretical model fills.
- Acceptance: Sim fills documented. Gap size quantified. If gap > 10 bps median → WOW-03 приоритет 1.
- Stop: Если нет historical fill data → fallback to synthetic comparison.

**Experiment 2: Overfit Detector на существующих стратегиях (Day 2)**
- Цель: Есть ли overfit в текущих стратегиях.
- Действия: Implement simplified CPCV (6-fold) на `core/sim/base_signal.mjs`. Compute PBO.
- Acceptance: PBO < 0.3 → strategies likely genuine. PBO > 0.5 → overfit alarm.
- Stop: Если feature matrix insufficient (< 200 bars) → expand dataset first.

**Experiment 3: Regime Detection Proof-of-Concept (Day 3)**
- Цель: Proof-of-concept: 3-state HMM на BTCUSDT 5m data.
- Действия: Fit HMM на 500 bars. Validate on next 200 bars. Measure vol prediction accuracy.
- Acceptance: Regime prediction correct >55% of time (better than random 33%). If not → deprioritize HMM.
- Stop: Если HMM не converges в 100 iterations → simplify to 2-state.

### Day 4-7: Имплементация E31-E33 features

**Day 4: E31 — Point-in-Time Feature Pipeline MVP**
- Implement WOW-01 (temporal join engine).
- Gate: `verify:epoch31` — lookahead sentinel passing.
- Acceptance: Feature fingerprint stable across 2 runs. Leakage sentinel positive control FAILS (correct).

**Day 5: E31 extension — Regime Features + Multi-Symbol Correlation**
- Add WOW-07 regime probabilities as features в FeatureFrame.
- Add WOW-13 pairwise correlations.
- Gate: Feature manifest includes new fields. Fingerprint stable.

**Day 6: E32 — Microstructure Simulator MVP**
- Implement WOW-03 parametric model (spread + fee + latency).
- Implement WOW-04 partial fill buckets.
- Gate: `verify:epoch32` — no fantasy fills. Non-zero slippage. Partial fills respected.

**Day 7: E33 — Strategy Registry + Ensemble Skeleton**
- Implement StrategyManifest contract.
- Scaffold WOW-18 multi-horizon ensemble (2 horizons, static weights).
- Gate: `verify:epoch33` — immutable manifest, semver enforcement.

### Day 8-10: Усиление gates + robustness

**Day 8: Anti-Overfit Gates (E37 foundation)**
- Implement WOW-14 CPCV (MVP: 6-fold).
- Implement WOW-15 DSR.
- Gate: PBO computation verified on synthetic data.

**Day 9: Anti-Blowup Shield (E36 foundation)**
- Implement WOW-22 drawdown-conditional sizing.
- Implement WOW-24 multi-level hard stops.
- Gate: Monte Carlo verification (1000 paths). Blowup probability measured.

**Day 10: Agent Mesh MVP + Evidence Pipeline**
- Implement WOW-35 MVP (3 agents: Researcher + Leakage Sentinel + Evidence Packager).
- Message bus + replay test.
- Gate: Replay produces byte-identical output.

### Acceptance Metrics Summary

| Day | Deliverable | Metric | Pass threshold | Stop condition |
|-----|-------------|--------|----------------|----------------|
| 1 | Microstructure gap measurement | Median gap bps | Quantified | No fill data available |
| 2 | CPCV proof-of-concept | PBO on known-overfit | PBO > 0.4 | < 200 bars dataset |
| 3 | Regime HMM PoC | Prediction accuracy | > 55% | Non-convergence |
| 4 | E31 feature pipeline | Fingerprint stability + sentinel | 2-run match + sentinel pass | - |
| 5 | Extended features | Manifest completeness | All new fields present | - |
| 6 | E32 simulator | No fantasy fills | Slippage > 0, partial fills | - |
| 7 | E33 strategy registry | Semver enforcement | Breaking change = MAJOR | - |
| 8 | CPCV + DSR | PBO on synthetic | PBO(noise) ≈ 0.5 | - |
| 9 | Anti-blowup | Monte Carlo blowup prob | < 0.5% | - |
| 10 | Agent mesh replay | Byte-identical | 100% match | - |

---

## 6. SOURCES & CONFIDENCE

### Tier-1 Sources (формируют основу)
1. Lopez de Prado, M. *Advances in Financial Machine Learning* (Wiley, 2018) — CPCV, PBO, purge/embargo, feature importance. [WOW-14, WOW-16, WOW-11]
2. Bailey & Lopez de Prado (2014), "The Deflated Sharpe Ratio" — multiple testing correction. [WOW-15]
3. Bailey et al. (2014), "Probability of Backtest Overfitting" — PBO methodology. [WOW-14]
4. Hasbrouck, J. *Empirical Market Microstructure* — fill/slippage/impact models. [WOW-03, WOW-04, WOW-10]
5. Bouchaud & Potters, *Theory of Financial Risk* — heavy tails, risk sizing, CVaR. [WOW-22, WOW-23]
6. Easley et al., "Flow Toxicity and Liquidity" — VPIN methodology. [WOW-02]
7. Official exchange fee schedules (Binance, OKX) — fee calibration. [WOW-12]
8. Hamilton, J. *Time Series Analysis* — HMM / regime switching models. [WOW-07]
9. Ledoit & Wolf (2004), "Honey, I Shrunk the Sample Covariance Matrix" — robust correlation estimation. [WOW-13, WOW-21]

### Tier-2 Sources (имплементация)
10. Node.js official docs — runtime determinism. [all modules]
11. SQLite docs — local persistence. [data pipeline]

### HEURISTIC Thresholds (требуют калибровки)

| Parameter | Value | Calibration protocol | Used in |
|-----------|-------|---------------------|---------|
| PBO threshold | 0.30 | Ежеквартально на expanding OOS window | WOW-14 |
| DSR critical value | 1.96 (95%) | Standard statistical threshold | WOW-15 |
| Max stress DD | 15% equity | Ежеквартально по historical worst-case | WOW-19 |
| Anti-blowup exponent | 2.0 | Monte Carlo calibration | WOW-22 |
| Anti-blowup floor | 10% | Monte Carlo calibration | WOW-22 |
| Per-trade max loss | 1% equity | Ежеквартально | WOW-24 |
| Per-day max loss | 3% equity | Ежеквартально | WOW-24 |
| Per-week max loss | 5% equity | Ежеквартально | WOW-24 |
| Regime HMM states | 3 | BIC/AIC model selection | WOW-07 |
| Signal staleness threshold | 5s (HFT), 5min (swing) | Per strategy class | WOW-05 |
| Microstructure MAD threshold | 3 bps adequate, 5 bps recalibrate | Quarterly on shadow data | WOW-03 |
| Feature drift Kendall tau | 0.5 (alert), 0.3 (block) | Quarterly | WOW-11 |
| Cost sensitivity breakeven | 1.5x (minimum) | Per strategy at each WFO | WOW-17 |
| CVaR budget (99%) | 2% daily equity | Quarterly + stress augmentation | WOW-23 |

### Open Questions (требуют реальных данных для ответа)

1. **Реальный sim→live gap**: Насколько велик gap между текущим sim и реальным execution? Нужны shadow fills для ответа.
2. **Crypto funding rate alpha decay**: Как быстро decays funding rate alpha в 2025-2026? Нужна свежая data.
3. **L2 data availability**: Доступны ли quality L2 snapshots offline за разумную цену? Определяет feasibility WOW-02.
4. **HMM convergence на 5m bars**: Достаточно ли 500 баров для stable HMM fit на crypto? Эксперимент Day 3.
5. **Partial fill rates on low-cap crypto**: Каков реальный fill rate на инструментах вне top-10 по volume?
6. **Multi-horizon correlation structure**: Насколько коррелированы signals на 5m vs. 1h vs. 4h? Определяет ценность WOW-18.
7. **PBO sensitivity to N_splits**: При N=6 vs. N=10 — насколько стабилен PBO estimate?
8. **Agent mesh overhead**: Какой overhead от message bus + replay logging в production?
9. **Regime switch frequency**: Сколько regime switches в среднем за месяц на crypto? Определяет min_dwell_time параметр.
10. **CVaR estimation stability**: Достаточно ли 300 observations для stable CVaR(99%) estimate на fat-tailed crypto returns?

---

> **Заключение**: Этот документ — не wish list. Это инженерный blueprint с 38 конкретными proposals, каждый с falsifiable test, evidence gates, и red-team critique. Приоритет: начать с экспериментов Day 1-3 для максимальной информационной отдачи, затем имплементировать в порядке epoch dependencies (E31→E33→E36→E37). Anti-blowup shield (WOW-22) деплоится параллельно как safety-critical. Agent mesh строится инкрементально: 3 → 5 → 7 agents.
>
> Не "guaranteed profit". Максимизация risk-adjusted expectancy + минимизация вероятности blowup.
