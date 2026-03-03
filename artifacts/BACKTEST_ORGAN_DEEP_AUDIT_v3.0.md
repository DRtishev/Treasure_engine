# BACKTEST ORGAN — ГЛУБОКИЙ АУДИТ + РАДИКАЛЬНЫЕ РЕШЕНИЯ v3.0

> **Дата:** 2026-03-03
> **Branch:** `claude/backtest-organ-audit-z4H6b`
> **HEAD:** `41099ea`
> **Режим:** DEEP AUDIT — все 158 модулей, 4 параллельных агента, web research

---

## I. АРХИТЕКТУРНЫЙ РЕНТГЕН

### 1.1 Три Sharpe — Три Правды (КРИТИЧЕСКАЯ ПРОБЛЕМА)

Система содержит **три разных реализации Sharpe**, которые **не совместимы друг с другом**:

| Модуль | Формула | Тип | Проблема |
|--------|---------|-----|----------|
| `backtest/engine.mjs:67-78` | `(mean/std) * sqrt(N)` per-trade | Population variance, не annualized | Sharpe=2.0 здесь ≠ Sharpe=2.0 в академии |
| `sim/metrics.mjs:36-44` | Equity curve multiplicative | `equity *= (1+pnl)` | Может дать equity < 0 → DD > 100% |
| `edge/overfit_defense.mjs:7-13` | Returns array, `mean/sqrt(max(var,1e-12))` | Custom DSR penalty (не Bailey-LdP) | Не сравним с published DSR values |

**Импакт:** Стратегия с backtest_sharpe=1.5 получит ДРУГОЙ sharpe в WFO, ДРУГОЙ в overfit defense, ДРУГОЙ в sim. CandidateFSM guard (`backtest_sharpe > 0`) пропустит кандидата, а graduation court (`sharpe >= 0.5`) может отклонить — на РАЗНЫХ шкалах.

### 1.2 Edge Lab — Красивый Сирота (КРИТИЧЕСКАЯ ПРОБЛЕМА)

7 courts реализованы качественно. Но **НИ ОДИН** не интегрирован в операционный pipeline:

```
strategy_sweep.mjs  → backtest x2 → CT01 (FSM)  ← НЕ вызывает Edge Lab
candidate_fsm.mjs   → guards: backtest_sharpe    ← НЕ проверяет verdicts
graduation_court.mjs → 5 EXAM'ов                 ← СВОИ пороги, не из Edge Lab
fsm_guards.mjs      → инфраструктура             ← НЕ знает о courts

Edge Lab Pipeline → orphaned → verdicts никто не читает
```

**Импакт:** Система CLAIMS "fail-closed, evidence-driven" но OPERATES "permit-by-default". Кандидат проходит DRAFT → BACKTESTED → GRADUATED без единой court validation.

### 1.3 Sigmoid Ловушка (Enricher)

`strategy_bar_enricher.mjs` использует sigmoid для маппинга z-score → [0,1]:
- `z = 0` (средний impulse) → `_liq_pressure = 0.5`
- Пороги стратегий: S3=0.55, S4 cascade=0.60, S4 decay=0.45

**Проблема:** Sigmoid mid-point (0.5) очень близко к порогам. Шум в impulse ±0.5σ = разница между NEUTRAL и BULL_LIQ. **Enricher усиливает noise вблизи центра distribution.**

### 1.4 Fixture Голод

200 bars × 5m = ~17 часов. Один symbol. Один vol regime (HIGH).

| Потребность | Нужно | Есть | Дефицит |
|-------------|-------|------|---------|
| WFO (3 folds) | 500+ bars | 200 | **-60%** |
| Regime diversity | 4 режима | 1 | **-75%** |
| S4 cascade + decay | Real cascade | 0 signals | **-100%** |
| Meaningful sharpe | 200+ trades | ~10-25 | **-90%** |

---

## II. ТОЧЕЧНЫЕ БАГИ

| # | Файл | Строка | Баг | Серьёзность |
|---|------|--------|-----|-------------|
| B01 | `profit/ledger.mjs` | 108-111 | Max drawdown — float accumulation, не из equity curve array | HIGH |
| B02 | `profit/ledger.mjs` | 62,80 | Fee назначается только closing trade, не пропорционально | MEDIUM |
| B03 | `sim/metrics.mjs` | 86-90 | Percentile off-by-one: `Math.floor` вместо `Math.ceil-1` | MEDIUM |
| B04 | `sim/metrics.mjs` | 36-44 | Equity может уйти < 0 → DD > 100% | HIGH |
| B05 | `wfo/walk_forward.mjs` | 15-39 | Float step accumulation в grid: `v += step` | MEDIUM |
| B06 | `bar_validator.mjs` | gap detect | `>` вместо `>=` → пропускает exact-aligned gaps | LOW |
| B07 | `s3_liq_vol_fusion.mjs` | meta() | Default burst_threshold=1.4 < min range=1.5 | LOW |
| B08 | `s5_multi_regime.mjs` | quality | quality_gate=0.0 (disabled) → no filtering | MEDIUM |
| B09 | `backtest/engine.mjs` | 40 | `qty = size/bar.close` не `size/exec_price` | LOW |
| B10 | `overfit_defense.mjs` | 120-151 | DSR formula custom, не Bailey & Lopez de Prado | MEDIUM |

---

## III. GRADING

| Компонент | Оценка | Обоснование |
|-----------|--------|-------------|
| **Backtest Engine** | C+ | Correct no-lookahead, broken Sharpe semantics, no equity curve tracking |
| **Profit Ledger** | B- | SHORT support solid, DD precision issue, fee allocation wrong |
| **WFO** | C | Grid explosion risk, float step bug, no stability-weighted selection |
| **Overfit Defense** | B- | CPCV good, DSR custom, PBO crude |
| **Edge Lab Courts** | A- | Well-designed but orphaned |
| **Strategies S1-S5** | B | Economically sound, proxy dependency, S1 LONG-only |
| **Data Pipeline** | B+ | Clean FSM, good validation, weak fixture |
| **Enricher** | C+ | Deterministic but sigmoid noise amplification |
| **Integration** | D | Courts ≠ FSM ≠ Graduation ≠ Sweep — four separate validation paths |

---

## IV. CUTTING-EDGE RESEARCH

### 4.1 Что делает мир (2025-2026)

| Направление | Ключевой Paper/Tool | Наш статус | Gap |
|-------------|---------------------|------------|-----|
| **Synthetic data (diffusion)** | TRADES (arXiv Feb 2025) — transformer diffusion для LOB | 200-bar fixture | CRITICAL |
| **Causal inference** | CausalQuant — DAGs + do-calculus | Нет | HIGH |
| **HMM regime detection** | Hamilton Switching + ComSIA 2026 hybrid | Simple vol thresholds | HIGH |
| **Adversarial validation** | Train/test classifier → distribution shift | RedTeam court (basic) | MEDIUM |
| **Bayesian Sharpe** | P(SR>0\|data) вместо point estimate | Point estimate only | HIGH |
| **Queue-reactive LOB** | RL Queue-Reactive (arXiv Nov 2025) | slip_bps=2 fixed | HIGH |
| **Multi-objective optim** | NSGA-II/MOBO Pareto frontier | Single Sharpe max | MEDIUM |
| **Incremental learning** | DoubleAdapt (KDD), IFF-DRL (2025) | Static params | MEDIUM |
| **SHAP explainability** | Permutation importance для features | Нет | MEDIUM |
| **Anti-overfit beyond CPCV** | MinBTL, noise injection, adversarial validation | CPCV basic | HIGH |

### 4.2 Open-Source Benchmark

| Feature | VectorBT | Qlib | FreqTrade | **Treasure** |
|---------|----------|------|-----------|-------------|
| Monte Carlo | ✓ | — | ✓ | ✗ |
| Benchmark comparison | ✓ | ✓ | — | ✗ |
| Vectorized speed | ✓ (100x) | ✓ | — | ✗ |
| ML pipeline | — | ✓ | — | ✗ |
| Bayesian optim | — | — | ✓ (Hyperopt) | ✗ |
| Meta-learning | — | ✓ | — | ✗ |
| Multi-asset | ✓ | ✓ | ✓ | ✗ |
| Equity curve tracking | ✓ | ✓ | ✓ | ✗ (implicit) |
| Tearsheet generation | ✓ (pyfolio) | ✓ | ✓ | ✗ |
| **Deterministic gates** | ✗ | ✗ | ✗ | **✓** |
| **7-court validation** | ✗ | ✗ | ✗ | **✓** |
| **Candidate FSM** | ✗ | ✗ | ✗ | **✓** |
| **Truth hierarchy** | ✗ | ✗ | ✗ | **✓** |

**Наше УНИКАЛЬНОЕ преимущество:** Governance. Никто из конкурентов не имеет deterministic FSM + 7-court pipeline + truth hierarchy + safety-first architecture. Нам нужно **починить integration** и **добить metrics**, чтобы превратить это преимущество в реальную систему.

---

## V. GENIUS FEATURES — 7 РАДИКАЛЬНЫХ ИДЕЙ

### IDEA-01: PROBABILITY MACHINE (Bayesian Backtest)

**Суть:** Заменить `backtest_sharpe = 1.5` на `P(sharpe > 0) = 0.93, 95% CI: [0.8, 2.1]`.

**Почему гениально:** Каждый quant fund использует point estimates и потом удивляется, когда стратегия ломается. Posterior distribution ЧЕСТНО показывает uncertainty. Strategy с Sharpe 2.0 ± 3.0 — это МУСОР. Strategy с Sharpe 1.0 ± 0.2 — это GOLD.

**MVV:**
```javascript
export function bayesianSharpe(returns, prior_mean = 0, prior_var = 1) {
  const n = returns.length;
  const sample_mean = mean(returns);
  const sample_var = variance(returns);
  // Conjugate normal-normal posterior
  const post_var = 1 / (n / sample_var + 1 / prior_var);
  const post_mean = post_var * (n * sample_mean / sample_var + prior_mean / prior_var);
  const post_std = Math.sqrt(post_var);
  // P(sharpe > 0)
  const z = post_mean / post_std;
  const p_positive = 0.5 * (1 + erf(z / Math.sqrt(2)));
  return { posterior_mean: post_mean, posterior_std: post_std, p_positive, ci_95: [post_mean - 1.96*post_std, post_mean + 1.96*post_std] };
}
```

**Gate:** `P(sharpe > 0) < 0.85` → BLOCKED. CI width > 2.0 → NEEDS_DATA.

---

### IDEA-02: EQUITY CURVE SURGERY (Frame-by-Frame Tracking)

**Суть:** Explicit equity curve array вместо implicit computation from fills.

**Почему гениально:** Сейчас equity вычисляется "по требованию" из fills. Это теряет: max drawdown timing, underwater duration, recovery factor, equity curve shape. Frame-by-frame tracking = полная "МРТ" стратегии.

**MVV:**
```javascript
// В runBacktest(), после каждого бара:
equityCurve.push({
  bar_index: i,
  ts: bar.ts_open,
  equity: getEquity(ledger, { [symbol]: bar.close }),
  drawdown: (hwm - equity) / hwm,
  position_qty: pos.qty,
  unrealized_pnl: getUnrealizedPnL(ledger, { [symbol]: bar.close })
});
```

**Новые метрики из equity curve:**
- `max_drawdown_duration_bars` — сколько баров под водой
- `recovery_factor` — total_return / max_drawdown
- `calmar_ratio` — annualized_return / max_drawdown
- `sortino_ratio` — return / downside_deviation
- `ulcer_index` — sqrt(mean(dd²))
- `pain_ratio` — return / ulcer_index

---

### IDEA-03: STRESS WORLD GENERATOR (Monte Carlo)

**Суть:** N = 1000 "параллельных вселенных" через bootstrap resampling bars.

**Почему гениально:** Один backtest = один sample path. Monte Carlo даёт DISTRIBUTION. P(ruin) = 3% — это конкретная цифра, не "кажется надёжной".

**MVV:**
```javascript
export function monteCarloBacktest(strategy, bars, opts, N = 500, seed = 42) {
  const rng = createSeededRNG(seed);
  const results = Array(N);
  for (let w = 0; w < N; w++) {
    // Block bootstrap (preserve autocorrelation)
    const blockSize = Math.max(5, Math.floor(Math.sqrt(bars.length)));
    const resampled = blockBootstrap(bars, blockSize, rng);
    results[w] = runBacktest(strategy, resampled, opts).metrics;
  }
  return {
    sharpe_dist: percentiles(results.map(r => r.backtest_sharpe), [5,25,50,75,95]),
    dd_dist: percentiles(results.map(r => r.max_drawdown), [5,25,50,75,95]),
    p_ruin: results.filter(r => r.max_drawdown > 0.5).length / N,
    p_positive: results.filter(r => r.backtest_sharpe > 0).length / N,
    VaR_95: quantile(results.map(r => r.total_pnl), 0.05),
    CVaR_95: conditionalVaR(results.map(r => r.total_pnl), 0.05),
  };
}
```

**Gate:** `p_ruin > 5%` → BLOCKED. `p_positive < 80%` → FAIL.

---

### IDEA-04: ADVERSARIAL VALIDATION COURT (Overfitting Killer)

**Суть:** Train classifier (XGBoost/Random Forest) to distinguish train bars from test bars. If accuracy > 60%, data isn't i.i.d. → backtest is lying.

**Почему гениально:** CPCV ловит overfitting к параметрам. Adversarial validation ловит overfitting к DATA DISTRIBUTION. Если train и test — разные distributions, WFO бесполезен.

**MVV:**
```javascript
export function adversarialValidation(trainBars, testBars) {
  // Feature extraction
  const trainFeatures = trainBars.map(featureExtract);
  const testFeatures = testBars.map(featureExtract);
  // Labels: 0 = train, 1 = test
  const X = [...trainFeatures, ...testFeatures];
  const y = [...Array(trainFeatures.length).fill(0), ...Array(testFeatures.length).fill(1)];
  // Simple decision stump ensemble (no ML deps needed)
  const accuracy = crossValidatedAccuracy(X, y, { folds: 5 });
  return {
    accuracy,
    verdict: accuracy > 0.65 ? 'FAIL' : accuracy > 0.55 ? 'WARN' : 'PASS',
    reason: accuracy > 0.65 ? 'Distribution shift detected' : 'Data appears i.i.d.'
  };
}
```

---

### IDEA-05: PIPELINE SURGEON (Integration Fix)

**Суть:** Один orchestrator связывает backtest → Edge Lab → CandidateFSM → evidence.

**Почему гениально:** Сейчас 4 параллельных validation пути (sweep, FSM guards, graduation court, Edge Lab) не связаны. Pipeline Surgeon создаёт ЕДИНЫЙ путь: backtest → courts → FSM → evidence chain.

**MVV:**
```javascript
export async function runCandidatePipeline(strategy, bars, opts) {
  // Phase 1: Backtest x2 (determinism)
  const r1 = runBacktest(strategy, bars, opts);
  const r2 = runBacktest(strategy, bars, opts);
  if (sha256(serialize(r1)) !== sha256(serialize(r2))) return { verdict: 'BLOCKED', reason: 'DETERMINISM_FAIL' };

  // Phase 2: Edge Lab courts (7 courts)
  const edge = backtestToEdgeFormat(r1); // ADAPTER: converts backtest output to court input
  const pipelineResult = runEdgeLabPipeline(edge);
  if (pipelineResult.verdict === 'BLOCKED' || pipelineResult.verdict === 'NOT_ELIGIBLE')
    return pipelineResult;

  // Phase 3: CandidateFSM transition CT01
  const candidate = makeCandidate(r1, pipelineResult);
  const fsm = new CandidateFSM(candidate);
  const transition = fsm.transition('CT01_DRAFT_TO_BACKTESTED');

  // Phase 4: Evidence chain
  return { verdict: 'PASS', candidate, pipeline: pipelineResult, transition, evidence_hash: sha256(...) };
}
```

---

### IDEA-06: REGIME NEURAL (HMM Detector)

**Суть:** Заменить vol_regime_detector (простые пороги) на Hidden Markov Model с 4 скрытыми состояниями.

**Почему гениально:** Текущий детектор использует фиксированные пороги (1.5%, 3.5%, 7%). HMM ОБУЧАЕТСЯ на данных и находит natural regime boundaries. Плюс: предсказывает P(regime_change) — early warning.

**MVV:**
```javascript
export function fitHMMRegimes(returns, n_states = 4, max_iter = 100) {
  // Baum-Welch algorithm (EM for HMM)
  // States: LOW_VOL, NORMAL, HIGH_VOL, CRISIS
  // Observations: log returns
  // Output: state probabilities per bar, transition matrix

  const { states, transition_matrix, state_probs } = baumWelch(returns, n_states, max_iter);
  return {
    regime_per_bar: states,
    transition_matrix,
    p_regime_change: states.map((s, i) => i > 0 ? 1 - transition_matrix[states[i-1]][s] : 0),
    regime_duration: computeAvgDuration(states),
  };
}
```

**Gate:** `profitable_regimes < 2` → FAIL. `p_regime_change > 0.3` → WARNING.

---

### IDEA-07: ALPHA AUTOPSY (Profit Attribution)

**Суть:** Разложить return стратегии на компоненты: market beta, momentum, mean-reversion, timing, execution cost, residual alpha.

**Почему гениально:** "Эта стратегия заработала 15%" — бесполезная информация. "Эта стратегия: 8% market beta + 5% momentum + 3% timing - 1% execution = 15% total, из которых 7% alpha" — ЭТО информация.

**MVV:**
```javascript
export function attributeAlpha(result, bars) {
  const strategyReturn = result.metrics.return_pct;
  const buyHoldReturn = ((bars.at(-1).close - bars[0].close) / bars[0].close) * 100;

  // Decomposition
  const beta = buyHoldReturn;  // market exposure
  const timing = computeTimingAlpha(result.signals, bars);  // entry/exit vs random
  const execution = -(result.metrics.total_fees + result.metrics.total_slippage);
  const alpha = strategyReturn - beta;

  return {
    total_return: strategyReturn,
    market_beta: beta,
    timing_alpha: timing,
    execution_cost: execution,
    pure_alpha: alpha,
    alpha_ratio: alpha / Math.abs(strategyReturn),  // what % of return is skill
    verdict: alpha > 0 ? 'ALPHA_POSITIVE' : 'BETA_ONLY'
  };
}
```

**Gate:** `alpha_ratio < 0` → WARNING (стратегия хуже buy-and-hold). `alpha_ratio < -0.5` → FAIL.

---

## VI. ROADMAP (ПРИОРИТЕТЫ)

### WAVE 1: Fix Foundation (1-2 дня)

| # | Задача | Файлы | Импакт |
|---|--------|-------|--------|
| W1.1 | Unified Sharpe (одна формула для всех) | engine.mjs, metrics.mjs, overfit_defense.mjs | CRITICAL |
| W1.2 | Equity curve array в backtest | engine.mjs, ledger.mjs | HIGH |
| W1.3 | Fix float step в WFO grid | walk_forward.mjs | MEDIUM |
| W1.4 | Fix max DD precision | ledger.mjs | HIGH |

### WAVE 2: Integration (2-3 дня)

| # | Задача | Файлы | Импакт |
|---|--------|-------|--------|
| W2.1 | Backtest → Edge Lab adapter | NEW edge_adapter.mjs | CRITICAL |
| W2.2 | Wire courts into CT02 guard | candidate_fsm.mjs, fsm_guards.mjs | CRITICAL |
| W2.3 | Court thresholds → SSOT | ssot.json, all courts | HIGH |
| W2.4 | Unified metrics contract | NEW metrics_contract.mjs | HIGH |

### WAVE 3: Genius Features (3-5 дней)

| # | Задача | Файлы | Импакт |
|---|--------|-------|--------|
| W3.1 | Bayesian Sharpe (IDEA-01) | NEW bayesian_sharpe.mjs | HIGH |
| W3.2 | Monte Carlo stress worlds (IDEA-03) | NEW monte_carlo.mjs | HIGH |
| W3.3 | Alpha autopsy (IDEA-07) | NEW alpha_attribution.mjs | HIGH |
| W3.4 | Adversarial validation court (IDEA-04) | NEW adversarial_court.mjs | MEDIUM |

### WAVE 4: Next-Gen (5-10 дней)

| # | Задача | Файлы | Импакт |
|---|--------|-------|--------|
| W4.1 | HMM regime detector (IDEA-06) | NEW hmm_regime.mjs | HIGH |
| W4.2 | Square-root slippage model | engine.mjs, NEW impact_model.mjs | HIGH |
| W4.3 | Longer fixtures (1000+ bars, multi-regime) | fixtures/ | HIGH |
| W4.4 | Pipeline Surgeon (IDEA-05) | NEW candidate_pipeline.mjs | CRITICAL |

---

## VII. ONE_NEXT_ACTION

```bash
npm run -s verify:fast
```

Потом: Wave 1.1 — Unified Sharpe.

---

*End of DEEP AUDIT + RADICAL SOLUTIONS v3.0*
