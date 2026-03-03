# BACKTEST ORGAN — АУДИТ + СПЕЦИФИКАЦИЯ ЭВОЛЮЦИИ v2.0

> **Дата:** 2026-03-03
> **Branch:** `claude/backtest-organ-audit-z4H6b`
> **HEAD:** `27d0121`
> **Автор-роль:** Principal Engineer + QA Officer + Release Gatekeeper
> **Режим:** CERT (offline, read-only audit → implementation-grade spec)
> **Предшественник:** v1.0 (`artifacts/BACKTEST_ORGAN_AUDIT_SPEC_v1.0.md`)
> **Дельта:** Независимая верификация v1.0; уточнённые root causes; углублённый SPEC; новые breakthrough ideas

---

## 1) SNAPSHOT

| Параметр | Значение |
|----------|----------|
| branch/HEAD | `claude/backtest-organ-audit-z4H6b` / `27d0121` |
| node version | v22.22.0 |
| npm version | 10.9.4 |
| verify mode | CERT |
| working tree | clean |
| verify:fast #1 | **PASS** (36+ gates green) |
| verify:fast #2 | **PASS** (identical — anti-flake x2 confirmed) |
| verify:e108 | **FAIL** — `determinism_x2` step crashes: `ERR_MODULE_NOT_FOUND: Cannot find package 'ajv'` |

**Выполненные команды (с доказательствами):**
```
npm run -s ops:node:toolchain:bootstrap   # PASS
npm run -s verify:fast                     # run 1 — PASS (36+ gates)
npm run -s verify:fast                     # run 2 — PASS (x2 anti-flake confirmed)
npm run -s verify:e108                     # FAIL at determinism_x2 (ajv missing)
npm run -s verify:e108:contracts           # no_lookahead PASS; determinism_x2 FAIL (same ajv)
```

**КРИТИЧЕСКОЕ НАБЛЮДЕНИЕ:** `e108_backtest_determinism_x2_contract.mjs` импортирует `engine.mjs` → `contracts.mjs` → `ajv` (npm пакет). `ajv` не установлен как project dependency (`npm list ajv` = empty). В `eslint/node_modules/ajv` есть nested copy, но она недоступна для project imports. Это означает **determinism x2 contract не запускается** в текущей среде.

---

## 2) ORGAN MAP (AS-IS)

| # | Component | Status | Evidence (paths) | Risks |
|---|-----------|--------|------------------|-------|
| 1 | **core/backtest/engine** | **ALIVE** | `core/backtest/engine.mjs` (103 LOC) | `backtest_sharpe` использует per-trade формулу, population variance; `truncateTowardZero(6)` |
| 2 | **core/profit/ledger** | **ALIVE** | `core/profit/ledger.mjs` (239 LOC) | **ПОЛНАЯ** SHORT поддержка: overshoot-safe clamping `:58-68` (BUY cover) и `:77-86` (SELL close). Никогда не переворачивает позицию. |
| 3 | **metrics (backtest_sharpe)** | **ALIVE** | `engine.mjs:67-79` | Формула: `(mean / stddev) * sqrt(N)` на `realized_pnl / position_size_usd`; ≥2 trades required; `truncateTowardZero(6)` |
| 4 | **metrics (sim/metrics.mjs)** | **ALIVE** | `core/sim/metrics.mjs` (91 LOC) | Альтернативный metrics модуль для live sim (expectancy, win_rate, slippage P95/P99). **Не используется** backtest engine. Два metrics пути — risk рассогласования. |
| 5 | **fixtures (E108)** | **ALIVE** | `data/fixtures/e108/e108_ohlcv_200bar.json` | BTCUSDT 5m, 200 bars, seed=42108, FIXTURE_GENERATED. **Raw OHLCV only** — no enriched features. |
| 6 | **enrichment pipeline** | **ALIVE** | `core/edge/strategies/strategy_bar_enricher.mjs` (116 LOC) | Proxy: `_liq_pressure`, `_burst_score`, `_regime_flag`, `atr_pct`, `volume_usd`, `spread_bps`, `volatility`. Backward-looking, deterministic, idempotent. |
| 7 | **determinism x2 checks** | **DEGRADED** | `scripts/verify/e108_backtest_determinism_x2_contract.mjs` (68 LOC) | **БЛОКИРОВАН**: `ajv` not found → process crashes. Код correct, dependency chain broken. Тестирует S1/S2 only (не enriched S3/S4/S5). |
| 8 | **no-lookahead contract** | **ALIVE** | `scripts/verify/e108_no_lookahead_contract.mjs` | 6/6 passed. Не зависит от `ajv`. |
| 9 | **candidate_fsm guard (CT01)** | **ALIVE** | `scripts/ops/candidate_fsm.mjs:37-43` | `guard_backtest_pass`: requires `backtest_sharpe > 0`. Pure function, no FS. |
| 10 | **strategy_sweep → CT01 wiring** | **ALIVE** | `scripts/edge/strategy_sweep.mjs` (166 LOC) | enrichBars → backtest x2 → hash comparison → CT01. S3/S4/S5 автоматически. Пишет в `EPOCH-SWEEP-73/`. |
| 11 | **candidate_registry** | **ALIVE** | `scripts/ops/candidate_registry.mjs` (415 LOC) | Schema v2.0.0; EventBus; explicit `--promote` only; fsm_state defaults AC-14. |
| 12 | **CandidateFSM (class)** | **ALIVE** | `scripts/ops/candidate_fsm.mjs` (226 LOC) | 8 states, 10 transitions, 10 guards. History capped at 50. Full forbidden_transitions. |
| 13 | **MetaAgent** | **ALIVE** | `scripts/ops/metaagent.mjs` (279 LOC) | Fleet consciousness: auto-quarantine, graduation court, rebalancing, exploration trigger. |
| 14 | **GraduationCourt (Thymus)** | **ALIVE** | `scripts/ops/graduation_court.mjs` (184 LOC) | 5 EXAMs: evidence_completeness, performance_threshold, reality_gap, risk_assessment, behavioral_audit. Requires backtest+paper+canary sharpe. |
| 15 | **Edge Lab courts (7)** | **ALIVE** | `core/edge_lab/courts/{dataset,execution,execution_sensitivity,overfit,red_team,risk,sre_reliability}_court.mjs` | Deflated Sharpe (Bailey & Lopez de Prado), bootstrap CI, CPCV concepts. **НЕ wired** в backtest/sweep pipeline. |
| 16 | **WFO engine** | **ALIVE** | `core/wfo/walk_forward.mjs` (166 LOC) | Grid search, N-fold rolling, OOS validation. Deterministic. |
| 17 | **WFO overfit court** | **ALIVE** | `core/wfo/overfit_court.mjs` (115 LOC) | 5 checks: min_folds, IS/OOS ratio, param_count, fold_stability, OOS positive. |
| 18 | **WFO run script** | **ALIVE** | `scripts/wfo/e108_wfo_run.mjs` (65 LOC) | Standalone — runs WFO + overfit court. **НЕ пишет** в candidate registry, **НЕ вызывает** Edge Lab courts. |
| 19 | **cost model** | **ALIVE** | `engine.mjs:21-22` | Parametric: `fee_bps=4`, `slip_bps=2` default. Square root law NOT implemented. |
| 20 | **e108 run orchestrator** | **ALIVE** | `scripts/verify/e108_run.mjs` (98 LOC) | Chains: E107 → no_lookahead → determinism_x2 → evidence. **determinism_x2 currently crashes**. |
| 21 | **strategies S1/S2** | **ALIVE** | `core/edge/strategies/s1_breakout_atr.mjs`, `s2_mean_revert_rsi.mjs` | Raw OHLCV only, no enrichment needed. |
| 22 | **strategies S3/S4/S5** | **ALIVE** | `core/edge/strategies/s3_liq_vol_fusion.mjs`, `s4_post_cascade_mr.mjs`, `s5_multi_regime.mjs` | Require enriched bars (`_liq_pressure`, etc.). |
| 23 | **parity courts** | **ALIVE** | `core/courts/e117_parity_court.mjs`, `e118_*`, `e119_*` | Separate domain courts (parity, not backtest). |
| 24 | **Data Organ Controller** | **ALIVE** | `core/data/data_organ_controller.mjs` | Nested FSM: DORMANT→ACQUIRING→ENRICHING→NOURISHING. |

---

## 3) ROOT CAUSES (TOP 3)

### RC-01: `ajv` dependency missing → determinism x2 contract CRASHES

**Суть:** Import chain: `e108_backtest_determinism_x2_contract.mjs` → `engine.mjs` → `contracts.mjs` → `import Ajv from 'ajv'`. Пакет `ajv` **не установлен** в project root. `npm list ajv` = empty. Nested copy в `eslint/node_modules/ajv` недоступна для project ESM imports.

**Доказательство (live):**
```
$ npm run -s verify:e108:contracts
e108_no_lookahead_contract: 6/6 passed
e108_no_lookahead_contract PASSED
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'ajv' imported from
  /home/user/Treasure_engine/core/edge/contracts.mjs
```

**Импакт:** E108 determinism x2 — **единственный** автоматический gate для backtest reproducibility — **мёртв**. Это означает что backtest может сломаться без обнаружения. `verify:fast` не содержит backtest-specific gates, поэтому деградация остаётся невидимой.

**Решение:** `engine.mjs` импортирует из `contracts.mjs` только `truncateTowardZero`. Эта функция не использует `ajv`. Варианты:
- (A) Установить `ajv` как project dependency
- (B) Вынести `truncateTowardZero` в отдельный модуль без `ajv` зависимости
- (C) Lazy-import `ajv` только в функциях, которые его используют

Рекомендация: **(B)** — minimal diff, zero new dependencies.

### RC-02: Edge Lab courts НЕ встроены в sweep/backtest pipeline

**Суть:** 7 Edge Lab courts (`core/edge_lab/courts/`) — мощная система (deflated Sharpe, bootstrap CI, execution sensitivity, red team). Но:
1. `strategy_sweep.mjs` делает enrichBars → backtest x2 → CT01, **без** court validation
2. `e108_wfo_run.mjs` вызывает `core/wfo/overfit_court.mjs` (простая версия), **НЕ** Edge Lab overfit court
3. GraduationCourt вызывается только при CT04 (CANARY_DEPLOYED → GRADUATED), т.е. **намного позже** в lifecycle
4. Нет оркестратора, который связывает: backtest results → Edge Lab courts → candidate evidence

**Доказательство:**
- `scripts/edge/strategy_sweep.mjs:103` — вызывает `fsm.transition('CT01_DRAFT_TO_BACKTESTED')`, без court calls
- `scripts/wfo/e108_wfo_run.mjs` — standalone, не обновляет candidate registry
- Edge Lab courts принимают `edge` объект с полями `execution`, `risk`, `overfit`, `dataset` etc. — структура **не совпадает** с `runBacktest()` output

**Импакт:** Кандидат получает BACKTESTED без строгих court checks. Overfit, execution reality, risk assessment — всё откладывается на graduation stage.

### RC-03: Два параллельных metrics модуля с разными контрактами

**Суть:** Есть два metrics пути:
1. `core/backtest/engine.mjs:81-100` — встроенный в backtest, вычисляет `backtest_sharpe`, `max_drawdown`, `return_pct` etc.
2. `core/sim/metrics.mjs:4-84` — `calculateMetrics(trades)` — ожидает другую структуру input (`trades[].filled`, `trades[].pnl`, `trades[].fill_ratio`, `trades[].slippage_bps`, `trades[].latency_ms`)

**Доказательство:**
- `engine.mjs` не импортирует и не использует `sim/metrics.mjs`
- `sim/metrics.mjs` ожидает `trades[].filled: boolean` — backtest fills не имеют этого поля
- `candidate_registry.mjs:69-80` определяет `makeCandidate().metrics` с полями из обоих путей (`backtest_sharpe` от engine + `profit_factor`, `win_rate` от sim)

**Импакт:** При переходе backtest → paper → canary метрики могут рассогласоваться, т.к. pipeline стыки не типизированы.

---

## 4) BEST-IN-CLASS RESEARCH

### 4.1 Event-Driven Backtest Architectures

**Лучшие практики (Zipline / QuantConnect / Qlib pattern):** Bar-by-bar loop, strict no-lookahead, strategy receives only `bars[0..i]`.

**Наш статус:** Реализовано корректно (`engine.mjs:29-33`). `history = bars.slice(0, i + 1)` — no lookahead. Подтверждено `e108_no_lookahead_contract` (6/6 PASS).

**Рекомендация:** Для upgrade: event queue с limit/stop orders; multi-symbol bar alignment. Текущая архитектура solid для MVP.

**Источники:**
- [Qlib (Microsoft) — unified quant ML pipeline](https://joshuaberkowitz.us/blog/github-repos-8/qlib-open-source-ai-for-quant-research-762)
- [IBKR: Reproducible Quantitative Research](https://www.interactivebrokers.com/campus/ibkr-quant-news/reproducible-quantitative-research-beyond-pure-mcp-workflows/)

### 4.2 Realistic Execution Modeling (TCA)

**Лучшие практики:** Transaction Cost Analysis decomposes: spread + market impact (Almgren & Chriss 2001 square-root law: `impact ∝ (σ * √(V/ADV))`) + timing cost + opportunity cost. Slippage ≠ fixed bps.

**Наш статус:** Простая модель (`slip_bps=2`, `fee_bps=4` uniform). `execution_court.mjs` проверяет `reality_gap`, `slippage_p99_bps`, `fill_rate` — но backtest engine не генерирует эти метрики (sim/metrics.mjs ожидает другой формат).

**Рекомендация:**
- **MVV (Week 1):** `slip = base_bps * sqrt(order_size / ADV)`. Для fixture: `ADV = mean(volume) * bars_per_day`.
- **Upgrade (Week 2-4):** Full TCA с permanent/temporary impact split; venue-specific profiles из `e112_cost_calibration.mjs`.

### 4.3 Walk-Forward / CPCV / Overfit Defense

**Лучшие практики:** Combinatorial Purged Cross-Validation (de Prado, 2018). Deflated Sharpe Ratio (Bailey & Lopez de Prado, 2014): `DSR = Pr(SR* > 0 | N_trials, skewness, kurtosis)`. Bootstrap confidence intervals.

**Наш статус:**
- WFO: реализован (`core/wfo/walk_forward.mjs`) — grid search, N-fold rolling, stability metric
- Overfit court (simple): `core/wfo/overfit_court.mjs` — IS/OOS ratio, param count, fold stability
- Overfit court (advanced): `core/edge_lab/courts/overfit_court.mjs` — deflated Sharpe, bootstrap CI, regime stability
- **Gap:** advanced court не wired в pipeline

**Рекомендация:** Wire `edge_lab/courts/overfit_court.mjs` в sweep pipeline. CPCV — upgrade path.

**Источники:**
- [Cross Validation in Finance: Purging, Embargoing, Combinatorial](https://blog.quantinsti.com/cross-validation-embargo-purging-combinatorial/)
- [Purged Cross-Validation (Wikipedia)](https://en.wikipedia.org/wiki/Purged_cross-validation)

### 4.4 Determinism Engineering

**Лучшие практики:** Bit-exact reproducibility: stable sort, truncation (not rounding), seeded RNG, no wall-clock in computation, SHA256 hash x2 comparison, canonical serialization.

**Наш статус:** **Excellent framework**, но execution broken:
- `truncateTowardZero(6)` для sharpe ✓
- `stableSortByKey(fills, 'trade_id')` для ledger ✓
- SHA256 x2 в E108 contract ✓ (но contract не запускается из-за ajv)
- `canonicalStringify` в contracts.mjs — industrial-grade canonical JSON
- `serializeLedger` — deterministic JSON output

**Рекомендация:** Fix ajv dependency chain (RC-01). Add S3/S4/S5 to determinism x2.

### 4.5 Point-in-Time Correctness / Feature Pipeline Reproducibility

**Лучшие практики:** Feature stores (Feast, Hopsworks) обеспечивают point-in-time correctness: features computed BEFORE prediction time, never after. Pre-split sequence generation in time series prevents temporal leakage (Dec 2025 arxiv study showed >20% RMSE bias from leakage).

**Наш статус:** `enrichBars()` — pure function, backward-looking (bar[i] uses bars[0..i-1] only). Idempotent. Deterministic. **Excellent** for reproducibility.

**Рекомендация:** When DataOrganController reaches NOURISHING, its enriched bars should be cached with SHA256 fingerprint for exact replay in backtest.

**Источники:**
- [Point-in-Time Correctness for Feature Data](https://apxml.com/courses/feature-stores-for-ml/chapter-3-data-consistency-quality/point-in-time-correctness)
- [Hidden Leaks in Time Series Forecasting (Dec 2025)](https://arxiv.org/html/2512.06932v1)
- [Preventing Data Leakage in Feature Engineering](https://dotdata.com/blog/preventing-data-leakage-in-feature-engineering-strategies-and-solutions/)

---

## 5) SPEC: BACKTEST ORGAN EVOLUTION v2.0

### Goals

| ID | Goal | Falsifiable Criterion |
|----|------|-----------------------|
| G-01 | determinism x2 contract **runnable** | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` exits 0, не crashes |
| G-02 | `backtest_sharpe` present and finite для S1-S5 | All 5 strategies return `typeof backtest_sharpe === 'number' && isFinite(backtest_sharpe)` |
| G-03 | SHORT полностью функционален и protectable | Regression: SELL from FLAT → `pos.qty < 0`; BUY cover → `realized_pnl = (entry-exit)*qty-fee`; overshoot → no flip |
| G-04 | verify:fast содержит backtest health gate | New gate в verify:fast цепочке; < 5s; catches sharpe absence |
| G-05 | courts получают валидный вход ИЛИ честный NEEDS_DATA | Courts callable с backtest metrics; missing data → NEEDS_DATA (not crash, not silent PASS) |
| G-06 | Замкнутый pipeline: data → enrich → backtest → metrics → candidate → evidence | Один `npm run` команда проводит кандидата через enrichment + backtest + determinism proof + CT01 |

### Non-Goals (Explicit Scope Boundaries)

- Annualized Sharpe (per-trade sharpe — project standard, compatible with CandidateFSM guards)
- Real exchange liquidation data (proxy enricher — current contract)
- Multi-asset simultaneous backtest (single-symbol scope)
- Live TCA integration (backtest-only scope)
- CPCV implementation (upgrade path, not MVV)
- Paper trading / canary infrastructure (separate organs)

### Contracts

#### C-01: BacktestResult Schema
```javascript
// Return value of runBacktest(strategy, bars, opts)
{
  ledger: Ledger,          // core/profit/ledger.mjs output
  signals: Signal[],       // { index: number, ts: number|string, signal: string, price: number }
  metrics: {
    strategy: string,      // strategy.meta().name
    params: Object,        // merged: default_params + opts.params
    bars: number,          // total bars processed
    buys: number,          // BUY signals count
    sells: number,         // SELL signals count
    fills: number,         // actual fills in ledger
    initial_capital: number, // default 10000
    equity: number,        // final equity
    realized_pnl: number,
    unrealized_pnl: number,
    total_pnl: number,
    return_pct: number,    // percentage
    total_fees: number,
    total_slippage: number,
    max_drawdown: number,  // [0..1] fraction
    anomalies: number,     // anomaly count
    backtest_sharpe: number, // truncateTowardZero(6); per-trade; ≥2 trades; 0 if insufficient
    trade_count: number,   // trades with non-zero realized_pnl
  },
  strategy_name: string,
}
```

#### C-02: Ledger Position Invariants
```
INVARIANT-L01: position.qty === 0 after full cover/close
INVARIANT-L02: BUY from SHORT covers min(order_qty, abs(pos.qty)) — never flips to LONG
INVARIANT-L03: SELL from LONG closes min(order_qty, pos.qty) — never flips to SHORT
INVARIANT-L04: SELL from FLAT (qty===0) opens SHORT (qty < 0)
INVARIANT-L05: realized_pnl computed BEFORE fee deduction for entry price logic
INVARIANT-L06: SHORT realized_pnl = (avg_entry - exit_price) * cover_qty - fee
INVARIANT-L07: LONG realized_pnl = (exit_price - avg_entry) * close_qty - fee
```

#### C-03: enrichBars Invariant
```
INVARIANT-E01: enrichBars(bars) === enrichBars(bars) (byte-exact determinism)
INVARIANT-E02: bar[i]._liq_pressure computed from bars[0..i-1] only (no lookahead)
INVARIANT-E03: bars with existing _liq_pressure pass through unchanged (idempotent)
INVARIANT-E04: _liq_pressure ∈ [0, 1], _burst_score ∈ [0, ∞), _regime_flag ∈ {NEUTRAL, BULL_LIQ, BEAR_LIQ, BULL_LIQ_BURST, BEAR_LIQ_BURST}
INVARIANT-E05: All numeric outputs truncated via truncateTowardZero(6)
```

### Behavior Semantics

#### SHORT Trading Lifecycle (Ledger)
```
FLAT (qty=0) --[SELL]--> SHORT
  pos.qty = -qty
  pos.avg_price = exec_price
  entry.realized_pnl = 0

SHORT (qty<0) --[SELL]--> SHORT deeper
  prevNotional = |pos.qty| * pos.avg_price
  addNotional = qty * exec_price
  pos.qty -= qty    (more negative)
  pos.avg_price = (prevNotional + addNotional) / |pos.qty|

SHORT (qty<0) --[BUY]--> Cover
  coverQty = min(qty, |pos.qty|)    // OVERSHOOT-SAFE
  realized_pnl = (pos.avg_price - exec_price) * coverQty - fee
  pos.qty += coverQty
  if pos.qty >= 0: pos.qty = 0; pos.avg_price = 0  // FLAT, NEVER LONG
```

#### LONG Trading Lifecycle (Ledger)
```
FLAT (qty=0) --[BUY]--> LONG
  pos.qty = qty
  pos.avg_price = exec_price

LONG (qty>0) --[BUY]--> LONG deeper
  newQty = pos.qty + qty
  pos.avg_price = (pos.avg_price * pos.qty + exec_price * qty) / newQty

LONG (qty>0) --[SELL]--> Close
  sellQty = min(qty, pos.qty)    // OVERSHOOT-SAFE
  realized_pnl = (exec_price - pos.avg_price) * sellQty - fee
  pos.qty -= sellQty
  if pos.qty <= 0: pos.qty = 0; pos.avg_price = 0  // FLAT, NEVER SHORT
```

### Metrics Definitions

#### backtest_sharpe (Строгая формула — SSOT)
```
Source: core/backtest/engine.mjs:67-79

Inputs:
  fills = ledger.fills.filter(f => f.realized_pnl !== 0)
  returns[i] = fills[i].realized_pnl / position_size_usd

Precondition:
  returns.length >= 2  (else backtest_sharpe = 0)

Computation:
  mean = Σ(returns) / N
  variance = Σ((returns[i] - mean)²) / N     // POPULATION variance (divides by N, not N-1)
  stddev = √variance

  if stddev > 0:
    raw = (mean / stddev) * √N               // Scaled by √N (per-trade, not annualized)
    backtest_sharpe = truncateTowardZero(raw, 6)
  else:
    backtest_sharpe = 0

Properties:
  - Per-trade (NOT annualized — deliberate design choice)
  - Population variance (NOT sample variance)
  - Truncated toward zero to 6 decimal places (deterministic rounding)
  - N = count of trades with non-zero realized_pnl
  - 0 if < 2 trades (insufficient data, not error)
```

### Determinism Rules

| ID | Rule | Check | Evidence |
|----|------|-------|----------|
| D-01 | Ledger x2 | `SHA256(serializeLedger(run1)) === SHA256(serializeLedger(run2))` | Hash match proof |
| D-02 | Signals x2 | `SHA256(JSON.stringify(run1.signals)) === SHA256(JSON.stringify(run2.signals))` | Hash match proof |
| D-03 | Report x2 | `SHA256(backtestToMarkdown(run1)) === SHA256(backtestToMarkdown(run2))` | Hash match proof |
| D-04 | enrichBars x2 | `SHA256(JSON.stringify(enrichBars(bars))) x2` | Hash match proof |
| D-05 | No wall-clock | All timestamps from `bar.ts_open`; `created_at` fixed at creation | Code inspection |
| D-06 | Sorted output | `stableSortByKey(fills, 'trade_id')`; position keys sorted | `serializeLedger()` |
| D-07 | Truncated floats | `truncateTowardZero(6)` for sharpe; `stableFormatNumber()` for display | Code inspection |

### Evidence Outputs

| Artifact | Path | Format |
|----------|------|--------|
| Backtest fixture run | `reports/evidence/E108/BACKTEST_FIXTURE_RUN.md` | md |
| Determinism x2 proof | `reports/evidence/E108/DETERMINISM_X2.md` | md |
| WFO report | `reports/evidence/E108/WFO_REPORT.md` | md |
| Overfit court | `reports/evidence/E108/OVERFIT_COURT.md` | md |
| Strategy sweep report | `reports/evidence/EPOCH-SWEEP-73/gates/manual/epoch_sweep_report.json` | json (deterministic) |
| Per-candidate evidence | `reports/evidence/EPOCH-SWEEP-73/<config_id>/candidate.json` | json (deterministic) |
| Backtest organ health gate | stdout (gate receipt in verify:fast) | text |

### Gate Semantics

| Verdict | Meaning | Action |
|---------|---------|--------|
| **PASS** | All checks green; evidence present and valid | Proceed |
| **BLOCKED** | Known issue prevents evaluation (e.g., missing dependency) | Fix blocker, re-run |
| **NEEDS_DATA** | Insufficient input to evaluate (e.g., < 2 trades for sharpe) | Acquire data, re-run |
| **FAIL** | Evidence evaluated, criteria not met | Investigate root cause, patch, re-run |

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ajv dependency breaks determinism contract | **CONFIRMED** | CRITICAL | RC-01: extract `truncateTowardZero` or install ajv |
| Enrichment drift (proxy vs real liquidation) | MEDIUM | HIGH | Document as PROXY; validate range [0,1]; watchdog |
| Sharpe gaming via over-optimization | MEDIUM | HIGH | WFO + overfit court + deflated Sharpe |
| Short position overshoot | LOW | HIGH | Overshoot clamping **already implemented** in ledger |
| Non-determinism from float rounding | LOW | MEDIUM | `truncateTowardZero(6)` + SHA256 x2 |
| E108 fixture too simple (200 bars) | MEDIUM | MEDIUM | Add larger fixtures; multi-regime; real data replay |
| Two metrics modules diverge silently | MEDIUM | MEDIUM | Unify or document contract boundary |
| Edge Lab courts never called on candidates | **CONFIRMED** | HIGH | Wire into pipeline or create explicit gap gate |

---

## 6) PATCH PLAN (MINIMAL DIFF)

### P-01: FIX — Extract `truncateTowardZero` to dependency-free module

**File:** NEW `core/edge/deterministic_math.mjs`
**What:** Move `truncateTowardZero()` from `contracts.mjs` to a new file with ZERO external dependencies. Update `engine.mjs` to import from new location. Re-export from `contracts.mjs` for backward compat.
**Why safe:** Pure function move; no behavior change; no new deps; existing callers unaffected via re-export.
**Outcome:** `e108_backtest_determinism_x2_contract.mjs` will run without ajv.

### P-02: NEW — `scripts/verify/regression_backtest01_organ_health.mjs`

**File:** NEW
**What:** Lightweight backtest organ health gate for verify:fast. Imports engine + enricher + S1. Runs one backtest. Verifies: (1) `backtest_sharpe` is number, (2) `isFinite`, (3) determinism x2 hash match. < 5 seconds.
**Why safe:** Read-only computation; no FS writes; no network; uses existing E108 fixture.

### P-03: MODIFIED — `package.json` (scripts section)

**What:** Add `"verify:regression:backtest01-organ-health"` script. Wire into verify:fast chain.
**Why safe:** Additive; existing scripts unchanged.

### P-04: MODIFIED — `specs/reason_code_taxonomy.json`

**What:** Add tokens:
- `BACKTEST_ORGAN_HEALTH_PASS`
- `BACKTEST_ORGAN_HEALTH_FAIL`
- `BACKTEST_ORGAN_SHARPE_MISSING`
- `BACKTEST_ORGAN_DETERMINISM_FAIL`
- `BACKTEST_ORGAN_COURT_NEEDS_DATA`

**Why safe:** Additive tokens; matches existing `^BACKTEST_` pattern; no existing token changes.

### P-05: MODIFIED — `scripts/verify/e108_backtest_determinism_x2_contract.mjs`

**What:** Update import of `truncateTowardZero` to use new module. Add S3 with enrichBars to determinism x2 tests.
**Why safe:** Import path change (function identical); additive test for S3.

### P-06: OPTIONAL — `scripts/edge/backtest_organ_pipeline.mjs`

**What:** Orchestrator: enrichBars → backtest x2 → Edge Lab courts (minimal) → candidate evidence → CT01.
**Why safe:** Orchestrator only; calls existing functions; no new logic.

---

## 7) REGRESSION GATES (REQUIRED)

### RG-BT01: backtest_sharpe_presence_and_value

| Field | Value |
|-------|-------|
| **ID** | RG-BT01 |
| **Purpose** | Verify `backtest_sharpe` is computed, finite, numeric for fixture strategies |
| **Inputs** | E108 fixture + S1 (raw bars) + enrichBars + S3 (enriched bars) |
| **Checks** | `typeof backtest_sharpe === 'number'`; `Number.isFinite(backtest_sharpe)`; `backtest_sharpe > 0` for profitable; `backtest_sharpe === 0` if < 2 trades |
| **Evidence** | stdout gate receipt |
| **Expected** | PASS |

### RG-BT02: backtest_determinism_x2

| Field | Value |
|-------|-------|
| **ID** | RG-BT02 |
| **Purpose** | SHA256 hash match for ledger + signals + report across 2 identical runs |
| **Inputs** | E108 fixture + S1/S2 (raw) + S3 (enriched) |
| **Checks** | `hash(run1.ledger) === hash(run2.ledger)` for each strategy; `hash(run1.signals) === hash(run2.signals)` |
| **Evidence** | stdout gate receipt; E108/DETERMINISM_X2.md (when UPDATE_E108_EVIDENCE=1) |
| **Expected** | PASS |

### RG-BT03: ledger_short_support

| Field | Value |
|-------|-------|
| **ID** | RG-BT03 |
| **Purpose** | Verify SHORT lifecycle: open, add-to, cover, overshoot protection |
| **Inputs** | Synthetic fill sequence (programmatic, no fixture needed) |
| **Checks** | SELL from FLAT → `pos.qty < 0`; `realized_pnl = (entry-exit)*qty - fee` on cover; full cover → `pos.qty === 0` (not positive); overshoot BUY (qty > pos) → clamped to cover only |
| **Evidence** | stdout gate receipt |
| **Expected** | PASS |

### RG-BT04: candidatefsm_ct01_backtested_path

| Field | Value |
|-------|-------|
| **ID** | RG-BT04 |
| **Purpose** | End-to-end: build candidate with `backtest_sharpe > 0`, transition CT01 |
| **Inputs** | Synthetic candidate data + kernel + policy |
| **Checks** | `fsm.transition('CT01_DRAFT_TO_BACKTESTED').success === true`; `fsm.state === 'BACKTESTED'`; synthetic with `backtest_sharpe=null` → `success === false` |
| **Evidence** | stdout gate receipt |
| **Expected** | PASS |

### RG-BT05: courts_adapter_structural_validity

| Field | Value |
|-------|-------|
| **ID** | RG-BT05 |
| **Purpose** | Verify Edge Lab courts importable and return valid structure |
| **Inputs** | Import 7 courts; call with empty/minimal edge object |
| **Checks** | All return `{ verdict, reason_codes, evidence }` or equivalent; NEEDS_DATA on missing input (not crash) |
| **Evidence** | stdout gate receipt |
| **Expected** | PASS (NEEDS_DATA verdicts acceptable — honest answer) |

---

## 8) GATE MATRIX + DoD

### Gate Matrix

| Gate | Expected | reason_code | surface |
|------|----------|-------------|---------|
| RG-BT01 sharpe_presence | PASS | BACKTEST_ORGAN_HEALTH_PASS | PROFIT |
| RG-BT02 determinism_x2 | PASS | BACKTEST_DETERMINISM_MATCH | PROFIT |
| RG-BT03 ledger_short | PASS | NONE | PROFIT |
| RG-BT04 ct01_path | PASS | CANDIDATE_FSM_TRANSITION | PROFIT |
| RG-BT05 courts_adapter | PASS (or NEEDS_DATA) | NONE / BACKTEST_ORGAN_COURT_NEEDS_DATA | PROFIT |
| verify:fast (existing) | PASS x2 | NONE | ALL |

### Definition of Done (DoD) — Falsifiable

- [ ] `npm run -s verify:fast` passes x2 (no regression from patches)
- [ ] `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` exits 0 (no longer crashes on ajv)
- [ ] RG-BT01: `backtest_sharpe` is `number` > 0 for S1 on E108 fixture
- [ ] RG-BT01: `backtest_sharpe` is `number` for S3 on enriched E108 fixture
- [ ] RG-BT02: SHA256 x2 hash match for S1/S2/S3 (6 checks)
- [ ] RG-BT03: SELL from FLAT → `pos.qty < 0`; BUY cover → correct PnL; no overshoot flip
- [ ] RG-BT04: synthetic candidate `{backtest_sharpe: 1.5}` → CT01 PASS → state === BACKTESTED
- [ ] RG-BT04: synthetic candidate `{backtest_sharpe: null}` → CT01 FAIL → state === DRAFT
- [ ] RG-BT05: all 7 Edge Lab courts importable; return valid verdict structure
- [ ] No new reason_codes used outside taxonomy
- [ ] All new gates < 5s execution time (verify:fast budget)
- [ ] verify:fast contains backtest organ health gate

---

## 9) RUN ORDER

```bash
# Step 0: Baseline (ALREADY CONFIRMED)
npm run -s verify:fast                      # run 1 — PASS ✓
npm run -s verify:fast                      # run 2 — PASS ✓ (x2)

# Step 1: Implement P-01 (extract truncateTowardZero)
# Step 2: Implement P-02 (regression_backtest01_organ_health.mjs)
# Step 3: Implement P-03, P-04, P-05

# Step 4: Verify determinism x2 contract is fixed
node scripts/verify/e108_backtest_determinism_x2_contract.mjs     # run 1 (must not crash)
node scripts/verify/e108_backtest_determinism_x2_contract.mjs     # run 2 (x2 anti-flake)

# Step 5: Verify new backtest organ health gate
node scripts/verify/regression_backtest01_organ_health.mjs        # run 1
node scripts/verify/regression_backtest01_organ_health.mjs        # run 2 (x2)

# Step 6: Verify no regression
npm run -s verify:fast                      # run 1 post-patch
npm run -s verify:fast                      # run 2 post-patch (x2)

# Step 7: Full E108 chain (optional — confirms full pipeline)
npm run -s verify:e108:contracts            # should now PASS all

# Step 8: Evidence collection (if UPDATE mode)
UPDATE_E108_EVIDENCE=1 npm run -s verify:e108:update

# Step 9: Final verification
npm run -s verify:fast                      # final x2 run 1
npm run -s verify:fast                      # final x2 run 2
```

---

## 10) ONE_NEXT_ACTION

```bash
node scripts/verify/e108_backtest_determinism_x2_contract.mjs
```

(Если crashes на ajv → implement P-01 first)

---

## 11) BREAKTHROUGH IDEAS

### IDEA-01: Monte Carlo Stress Worlds (Статистическая робастность)

**Идея:** Генерировать N (100-1000) "стресс-миров" через bootstrap resampling bars с replacement. Для каждого мира — полный backtest. Строить distribution: returns, sharpe, drawdown, ruin probability.

**Зачем:** Один backtest — один sample path. Monte Carlo даёт P(ruin), VaR(95%), CVaR(99%). Институциональный стандарт portfolio risk.

**Риск/ограничение:** Computation cost N * backtest_time. Resampling нарушает temporal structure (autocorrelation).

**MVV:**
```javascript
export function monteCarloBacktest(strategy, bars, opts, N = 100, seed = 42) {
  const rng = createSeededRNG(seed); // deterministic
  const results = [];
  for (let w = 0; w < N; w++) {
    const shuffled = bootstrapResample(bars, rng);
    results.push(runBacktest(strategy, shuffled, opts).metrics);
  }
  return computeDistribution(results); // { sharpe_dist, dd_dist, pRuin, VaR95 }
}
```

**Fail-closed:** Seeded RNG → deterministic. SHA256 x2 proof. P(ruin) > 5% → BLOCKED.

---

### IDEA-02: Regime-Segmented Backtest (Стратегия-на-все-сезоны)

**Идея:** Разрезать bars по `_regime_flag` (уже есть в enricher). Запускать backtest per-regime. Требовать positive expectancy в ≥2 regimes. Стратегия только для тренда = "fair-weather friend".

**Зачем:** Большинство стратегий profitable только в одном режиме. Regime decomposition выявляет fragility.

**Риск:** Мало bars per regime на 200-bar fixture (need 500+).

**MVV:** Split enriched bars by `_regime_flag`; run backtest on each segment; compute per-regime sharpe. Flag if profitable in < 2 regimes.

**Fail-closed:** Regime count < 2 → NEEDS_DATA. Negative in >50% regimes → FAIL.

---

### IDEA-03: Slippage Sensitivity Cascade (Хрупкость edge)

**Идея:** 5 backtests с escalating slippage: 2, 5, 10, 20, 50 bps. Строить "sensitivity curve". Стратегия с equity→0 при 20bps = хрупкая.

**Зачем:** Наш `slip_bps=2` — оптимистичный. В liquidation cascades = 50-100bps. Sensitivity curve = "сколько edge реально есть".

**Риск:** Минимальный — чистая parameterization.

**MVV:**
```javascript
export function slippageSensitivity(strategy, bars, baseOpts) {
  const levels = [2, 5, 10, 20, 50];
  return levels.map(slip => ({
    slip_bps: slip,
    metrics: runBacktest(strategy, bars, { ...baseOpts, slip_bps: slip }).metrics
  }));
}
// Gate: sharpe < 0 at slip=10bps → WARNING. At slip=5bps → FAIL.
```

**Fail-closed:** Sharpe < 0 при slip=5bps → FAIL (edge too thin для реальной торговли).

---

### IDEA-04: Profit Attribution Decomposition (Альфа vs удача)

**Идея:** `alpha = strategy_return - benchmark_return (buy & hold)`. Стратегия с alpha < 0 — живёт на luck + timing.

**Зачем:** Институциональный стандарт (Brinson attribution). Отделяет skill от market beta.

**Риск:** Benchmark definition (buy-and-hold для directional strategies).

**MVV:** Simple: compute buy-and-hold return on same bars. `alpha = strategy_return_pct - bh_return_pct`. Alpha < 0 → WARNING. Alpha < -1% → FAIL.

**Fail-closed:** Alpha metric added to BacktestResult. Negative alpha → reason_code WARNING.

---

### IDEA-05: Deterministic Replay Journal (Debug paradise)

**Идея:** Каждый backtest записывает full decision trace: `bar → signal decision → fill → position update → equity`. Journal = hashable, diffable между runs.

**Зачем:** Когда sharpe меняется после code change, diff journal показывает exactly where и why. Essential для confident evolution.

**Риск:** Storage ~10KB per run. Negligible.

**MVV:** Extend `runBacktest` return: `journal: [{ bar_index, signal, fill, pos_after, equity_after }]`. SHA256 journal для regression.

**Fail-closed:** journal_hash x2 match → deterministic proof. Mismatch → FAIL with diff indication.

---

### IDEA-06: Temporal Coherence Validator (Signal health)

**Идея:** Проверять inter-trade intervals. Overtrading (100 trades в 10 bars) или underfitting (1 trade) = подозрительно.

**Зачем:** Safety net. Стратегия может иметь хороший sharpe но торговать нереалистично.

**Риск:** Ложные срабатывания для HFT-like strategies.

**MVV:** Compute inter-trade intervals. Flag: P99 < 1 bar (overtrading), trades < 5 (underfitting).

**Fail-closed:** Median inter-trade < 1 bar → BLOCKED. Trades < 5 → NEEDS_DATA.

---

### IDEA-07: Dynamic Position Sizing (Kelly criterion)

**Идея:** Current engine uses fixed `position_size_usd=500`. Add fractional Kelly sizing: `f = (p*b - q) / b` where p=win_rate, b=avg_win/avg_loss, q=1-p.

**Зачем:** Fixed sizing → linear equity curve. Kelly → geometric growth/destruction. Shows true capacity.

**Риск:** Full Kelly too aggressive; use 0.25-0.5 fractional.

**MVV:** Add `sizing_mode: 'fixed' | 'fractional_kelly'` to opts. Default 'fixed'.

**Fail-closed:** Kelly fraction < 0 → don't trade (auto-detected negative expectancy). Kelly > 1.0 → cap at 0.5.

---

### IDEA-08: Cross-Strategy Correlation Detector (Fleet diversification)

**Идея:** Compute signal correlation между стратегиями в fleet. |r| > 0.8 = not diversifying.

**Зачем:** Diversification — единственный free lunch. High correlation fleet = one strategy with extra steps.

**Риск:** Requires multi-strategy backtest on same bars.

**MVV:** Pearson correlation of signal arrays. Flag |r| > 0.7 → WARNING. |r| > 0.9 → BLOCKED (redundant).

**Fail-closed:** Correlation matrix in sweep report evidence.

---

### IDEA-09: Adaptive Fee Model (E112 integration)

**Идея:** Auto-pull venue fee profile from `e112_cost_calibration.mjs`. Maker vs taker = 1 vs 6 bps = 5bps per trade difference. 100 trades = 500bps = potential flip profitable→unprofitable.

**Зачем:** Current uniform fee_bps=4 masks maker/taker reality.

**Риск:** Minimal — pure parameterization.

**MVV:** `runBacktest(strategy, bars, { venue: 'bybit_linear' })` → auto-lookup profile.

**Fail-closed:** Unknown venue → default 'fixture' profile (backward compat).

---

### IDEA-10: Enrichment Watchdog (Silent degradation prevention)

**Идея:** Validate enricher output distribution: `std(_liq_pressure) > 0.01`, `unique(_regime_flag) >= 2`, `mean(_burst_score) > 0`. Degenerate → NEEDS_DATA.

**Зачем:** Silent degradation: enricher returns all zeros → strategy sees "no signal" → trades randomly → PASS with garbage.

**Риск:** Threshold calibration needed.

**MVV:** Post-enrichment checks; degenerate → NEEDS_DATA (not silent PASS).

**Fail-closed:** Degenerate enrichment = honest failure, not hidden garbage.

---

### IDEA-11: Evidence Chain Cryptographic Seal (Tamper-proof)

**Идея:** Chain SHA256 seals: `seal_n = SHA256(content_n + seal_{n-1})`. Any modification → broken chain → FAIL.

**Зачем:** Tamper-proof evidence. Bug or post-hoc edit → detected.

**Риск:** Chain storage overhead (negligible).

**MVV:** Extend sweep report: `evidence_chain: [{step, hash, prev_hash}]`. Chain break → FAIL.

**Fail-closed:** Missing link → BLOCKED. Broken chain → FAIL.

---

### IDEA-12: Backtest Organ Consciousness (Dashboard)

**Идея:** Add `backtestOrganScan()` to `ops:cockpit`. Shows: last run, strategies tested, sharpe range, court coverage, pipeline health (DRAFT→BACKTESTED→...counts).

**Зачем:** Visibility. Operator sees organ health at a glance.

**Риск:** Dashboard complexity.

**MVV:** `backtestOrganScan()` → `{ status: 'ALIVE'|'DEGRADED'|'MISSING', strategies_tested, sharpe_range, pipeline_counts }`. No evidence → MISSING. Stale → DEGRADED.

**Fail-closed:** Status reflects real evidence freshness.

---

## 12) "КАК СТАРЫЙ ДРУГ"

Я перечитал каждый файл этого органа заново. Что меня приятно удивило: SHORT реально работает правильно — overshoot-safe clamping на месте, avg_price пересчитывается при add-to-position, unrealized PnL считается корректно для обоих направлений. CandidateFSM с 10 guards — это серьёзная инженерия, не "дипломный проект". WFO + overfit court — есть, и даже в двух версиях (простая + Edge Lab с deflated Sharpe).

Что огорчило: единственный gate, который должен ловить поломку backtest reproducibility, мёртв из-за отсутствия npm-пакета `ajv` в зависимостях. Это классический "the smoke detector has dead batteries" moment. Одна строка в `package.json` или один re-export — и целый protection layer оживает.

Три патча = живой орган. Один `truncateTowardZero` вынос, один regression gate в verify:fast, и одна строка в package.json scripts. Всё остальное — upgrade path. Дерзай.

---

*End of BACKTEST ORGAN AUDIT + SPEC v2.0*
