# BACKTEST ORGAN — АУДИТ + СПЕЦИФИКАЦИЯ ЭВОЛЮЦИИ v1.0

> **Дата:** 2026-03-03
> **Branch:** claude/backtest-organ-audit-z4H6b
> **Автор-роль:** Principal Engineer + QA Officer + Release Gatekeeper
> **Режим:** CERT (offline, read-only audit → implementation-grade spec)

---

## 1) SNAPSHOT

| Параметр | Значение |
|----------|----------|
| branch/HEAD | `claude/backtest-organ-audit-z4H6b` / `b31beec` |
| node version | v22.22.0 |
| npm version | 10.9.4 |
| verify mode | CERT |
| working tree | clean |
| verify:fast #1 | **PASS** (all gates green) |
| verify:fast #2 | **PASS** (identical — anti-flake confirmed) |

**Выполненные команды:**
```
npm run -s ops:node:toolchain:bootstrap
npm run -s verify:fast   # run 1 — PASS
npm run -s verify:fast   # run 2 — PASS (x2 anti-flake)
```

---

## 2) ORGAN MAP (AS-IS)

| # | Component | Status | Evidence (paths) | Risks |
|---|-----------|--------|------------------|-------|
| 1 | **core/backtest/engine** | **ALIVE** | `core/backtest/engine.mjs` (128 LOC) | Нет annualized sharpe; использует per-trade Sharpe |
| 2 | **core/profit/ledger** | **ALIVE** | `core/profit/ledger.mjs` (238 LOC) | Полная SHORT-поддержка; overshoot-safe clamping |
| 3 | **metrics (incl. sharpe)** | **ALIVE** | `engine.mjs:67-79` — `backtest_sharpe` с `truncateTowardZero(6)` | Per-trade формула, не annualized; ≥2 trades required |
| 4 | **fixtures (E108)** | **ALIVE** | `data/fixtures/e108/e108_ohlcv_200bar.json` (seed=42108) | Raw OHLCV only — enrichment на лету через `enrichBars()` |
| 5 | **determinism x2 checks** | **ALIVE** | `scripts/verify/e108_backtest_determinism_x2_contract.mjs` (68 LOC) | SHA256 ledger+report+signals x2; 6 tests, 2 стратегии |
| 6 | **candidate_fsm guard (CT01)** | **ALIVE** | `scripts/ops/candidate_fsm.mjs:37-43` — `guard_backtest_pass` | Проверяет `backtest_sharpe > 0`; стратегический sweep автоматизирован |
| 7 | **strategy_sweep → CT01 wiring** | **ALIVE** | `scripts/edge/strategy_sweep.mjs:103` — `fsm.transition('CT01_DRAFT_TO_BACKTESTED')` | S3/S4/S5 автоматически: enrichBars → backtest x2 → CT01 |
| 8 | **courts: Edge Lab 7-court** | **ALIVE** | `core/edge_lab/courts/{dataset,execution,execution_sensitivity,overfit,red_team,risk,sre_reliability}_court.mjs` | Полный pipeline; deflated Sharpe, bootstrap CI, CPCV |
| 9 | **courts: Graduation (Thymus)** | **ALIVE** | `scripts/ops/graduation_court.mjs` — 5 EXAM | Проверяет backtest+paper+canary sharpe; all 5 = GRADUATED |
| 10 | **courts adapter integration** | **DEGRADED** | Graduation court вызывается через MetaAgent (`metaagent.mjs`); Edge Lab courts НЕ автоматически wired в backtest pipeline | Edge Lab courts не связаны в автоматический CT01 path |
| 11 | **WFO / overfit defense** | **ALIVE** | `core/wfo/walk_forward.mjs` (166 LOC) + `core/wfo/overfit_court.mjs` (115 LOC) + `scripts/wfo/e108_wfo_run.mjs` | Grid search, 3-fold, stability metrics |
| 12 | **cost model / slippage / fees** | **ALIVE** | `core/execution/e112_cost_calibration.mjs` + `engine.mjs:41-43` | Parametric: fee_bps=4, slip_bps=2; venue profiles (bybit, fixture) |
| 13 | **enrichment pipeline** | **ALIVE** | `core/edge/strategies/strategy_bar_enricher.mjs` (116 LOC) | PROXY _liq_pressure, _burst_score, _regime_flag; backward-looking; deterministic |
| 14 | **candidate registry** | **ALIVE** | `scripts/ops/candidate_registry.mjs` (415 LOC) | Schema v2.0.0; fsm_state/fsm_history defaults (AC-14) |
| 15 | **MetaAgent** | **ALIVE** | `scripts/ops/metaagent.mjs` (279 LOC) | Fleet consciousness; auto-quarantine; graduation court call |
| 16 | **Data Organ Controller** | **ALIVE** | `core/data/data_organ_controller.mjs` (213 LOC) | Nested FSM: DORMANT→ACQUIRING→ENRICHING→NOURISHING; freshness tracking |

---

## 3) ROOT CAUSES (TOP 3)

### RC-01: Edge Lab Courts НЕ встроены в автоматический backtest pipeline

**Суть:** `strategy_sweep.mjs` делает enrichBars → backtest x2 → CT01, но НЕ прогоняет 7 Edge Lab courts (overfit, execution, risk, red_team, dataset, SRE, execution_sensitivity). Эти courts существуют и функциональны (`core/edge_lab/courts/`), но вызываются отдельно, вне sweep flow. WFO run (`scripts/wfo/e108_wfo_run.mjs`) вызывает только `core/wfo/overfit_court.mjs` (простая версия), а не edge lab overfit court с deflated Sharpe и bootstrap CI.

**Доказательство:**
- `scripts/edge/strategy_sweep.mjs:103` — вызывает только `CT01_DRAFT_TO_BACKTESTED`, без court validation
- `core/edge_lab/courts/overfit_court.mjs` — полноценный court с deflated Sharpe, но не вызывается из sweep
- Нет файла-оркестратора, который связывает backtest results → Edge Lab courts → candidate evidence

**Импакт:** Кандидаты получают BACKTESTED без прохождения строгих court checks. Courts проверяют позже (при graduation), но gap между BACKTESTED и GRADUATED не заполнен evidence-driven validation.

### RC-02: Нет автоматического end-to-end пути enrichment → backtest → metrics → candidate → courts

**Суть:** Каждый компонент работает, но "organ" не замкнут как единый pipeline:
1. `enrichBars()` вызывается в sweep, но НЕ в `e108_backtest_run.mjs` (S1/S2 работают на raw bars)
2. `e108_backtest_run.mjs` запускает S1/S2, но не регистрирует кандидатов
3. `strategy_sweep.mjs` запускает S3/S4/S5 с enrichment + CT01, но не запускает WFO или courts
4. `e108_wfo_run.mjs` запускает WFO, но не обновляет candidate registry
5. Graduation court проверяется только при CANARY_DEPLOYED → GRADUATED (через MetaAgent)

**Доказательство:**
- `scripts/backtest/e108_backtest_run.mjs:24` — `runBacktest(strat, bars)` без enrichBars
- `scripts/wfo/e108_wfo_run.mjs` — standalone, не пишет в candidate registry
- `scripts/ops/metaagent.mjs` — graduation court only at CT04 stage

**Импакт:** Нужен "organ orchestrator", который склеивает pipeline: data → enrich → backtest → metrics → courts → candidate evidence → FSM transition.

### RC-03: Нет специализированного backtest regression gate в verify:fast

**Суть:** `verify:fast` содержит 36+ gates, но ни один из них не проверяет:
- backtest_sharpe presence и корректность
- CT01 path end-to-end (DRAFT → BACKTESTED)
- court adapter structural validity
- enrichment + backtest determinism для S3/S4/S5

**Доказательство:**
- `npm run -s verify:fast` output — все gates structural/FSM/net/docs; нет `backtest_*` gates
- `scripts/verify/e108_backtest_determinism_x2_contract.mjs` существует, но не в verify:fast chain

**Импакт:** Деградация backtest organ не будет поймана быстрым гейтом. Нужен lightweight gate для verify:fast.

---

## 4) BEST-IN-CLASS RESEARCH

### 4.1 Event-Driven Backtest Architectures

**Концепция:** Bar-by-bar event loop с strict no-lookahead guarantee; стратегия получает только `bars[0..i]`.

**Наш статус:** Реализовано (`engine.mjs:31-32`). Дизайн соответствует лучшим практикам (Zipline, QuantConnect pattern).

**Рекомендация:** Текущая архитектура solid. Для upgrade: добавить multi-asset backtest (параллельный bar feed) и event queue для limit/stop orders.

### 4.2 Realistic Execution Modeling (TCA)

**Концепция:** Transaction Cost Analysis деcomposes costs: spread (permanent impact) + temporary impact (market impact) + timing cost + opportunity cost. Slippage ≠ fixed bps; зависит от volume, urgency, ADV.

**Наш статус:** Простая модель: `slip_bps=2` + `fee_bps=4` uniform. `e112_cost_calibration.mjs` имеет venue profiles, но без volume-dependent impact.

**Рекомендация:**
- **MVV (Week 1):** Volume-weighted slippage: `slip = base_bps * (order_size / ADV)^0.5` (square root law — Almgren & Chriss 2001).
- **Upgrade (Week 2-4):** Full TCA decomposition с permanent/temporary impact split.

### 4.3 Walk-Forward / CPCV / Overfit Defense

**Концепция:** CPCV (Combinatorial Purged Cross-Validation) — de Prado 2018. Генерирует все комбинации train/test splits с purging (no leakage) и embargo (temporal buffer). Deflated Sharpe корректирует за multiple testing.

**Наш статус:**
- WFO: 3-fold rolling window (`core/wfo/walk_forward.mjs`)
- Overfit court: simple IS/OOS ratio (`core/wfo/overfit_court.mjs`)
- Edge Lab overfit court: deflated Sharpe + bootstrap CI (`core/edge_lab/courts/overfit_court.mjs`)

**Рекомендация:** Edge Lab court уже содержит deflated Sharpe — нужно wire его в backtest pipeline. CPCV — upgrade path для Week 3-4.

### 4.4 Determinism Engineering

**Концепция:** Bit-exact reproducibility: stable sort, truncateTowardZero, seeded RNG, no Date.now() in computation paths, SHA256 hash comparison x2.

**Наш статус:** Excellent. `truncateTowardZero(6)` для sharpe, `stableSortByKey` для ledger, SHA256 x2 в E108 contract.

**Рекомендация:** Добавить determinism x2 для enriched strategies (S3/S4/S5); текущий E108 contract проверяет только S1/S2 на raw bars.

### 4.5 Reproducible Feature Pipelines

**Концепция:** Feature pipeline должен быть identical в backtest и live. "Feature store" pattern: compute once, version, replay.

**Наш статус:** `enrichBars()` — pure function, backward-looking, deterministic. Proxy signals (не real exchange data). Passthrough для already-enriched bars.

**Рекомендация:** Для Data Organ integration: когда DataOrganController выходит в NOURISHING, его enriched bars должны быть cached с SHA256 fingerprint; backtest replays exact same enriched bars.

---

## 5) SPEC: BACKTEST ORGAN EVOLUTION v1.0

### Goals

| ID | Goal | Falsifiable Criterion |
|----|------|-----------------------|
| G-01 | Замкнутый pipeline: data → enrich → backtest → metrics → courts → candidate | Один `npm run` команда проводит кандидата DRAFT → BACKTESTED с court evidence |
| G-02 | backtest_sharpe присутствует и детерминирован для всех стратегий | E108 determinism x2 покрывает S1-S5; hash match |
| G-03 | SHORT поддерживается корректно | Regression gate: short_cover PnL = entry - exit; overshoot clamped to 0 |
| G-04 | Courts получают валидный вход | Edge Lab courts invoked в pipeline; NEEDS_DATA честно при отсутствии данных |
| G-05 | verify:fast содержит backtest health gate | Lightweight gate < 5s; проверяет sharpe presence + determinism hash |

### Non-Goals

- Annualized Sharpe (per-trade sharpe — наш стандарт, совместимый с CandidateFSM guards)
- Real exchange liquidation data (proxy enricher — наш текущий контракт)
- Multi-asset simultaneous backtest (single-symbol — текущий scope)
- Live TCA integration (backtest-only scope)

### Contracts

#### C-01: BacktestResult Schema
```javascript
{
  ledger: Ledger,          // core/profit/ledger.mjs — mutable during run, frozen after
  signals: Signal[],       // { index, ts, signal, price }
  metrics: {
    strategy: string,
    params: Object,
    bars: number,
    buys: number,
    sells: number,
    fills: number,
    initial_capital: number,
    equity: number,
    realized_pnl: number,
    unrealized_pnl: number,
    total_pnl: number,
    return_pct: number,
    total_fees: number,
    total_slippage: number,
    max_drawdown: number,    // [0..1]
    anomalies: number,
    backtest_sharpe: number, // truncateTowardZero(6); per-trade; ≥2 trades required
    trade_count: number,
  },
  strategy_name: string,
}
```

#### C-02: CandidateMetrics Schema (for CT01)
```javascript
{
  backtest_sharpe: number,     // REQUIRED; > 0 for CT01 PASS
  total_trades: number,
  max_drawdown_pct: number,    // % (0-100)
  profit_factor: number | null,
  expectancy: number | null,
  win_rate: number | null,
}
```

#### C-03: enrichBars Invariant
- Input: OHLCV bars `{ts_open, open, high, low, close, volume, ...}`
- Output: bars + `{_liq_pressure: [0,1], _burst_score: [0,∞], _regime_flag: string}`
- Deterministic: `enrichBars(bars)` === `enrichBars(bars)` (byte-exact)
- No lookahead: bar[i] computed from bars[0..i-1] only
- Idempotent: bars with existing `_liq_pressure` pass through unchanged

### Behavior Semantics

#### SHORT Trading Lifecycle
```
FLAT --[SELL signal]--> SHORT (qty < 0, avg_price = exec_price)
SHORT --[SELL signal]--> SHORT deeper (avg_price recalculated)
SHORT --[BUY signal]--> cover (realized_pnl = (avg_price - exec_price) * coverQty - fee)
  coverQty = min(order_qty, abs(position_qty))  // overshoot-safe
  if covered completely: qty → 0, avg_price → 0  // FLAT, never flips to LONG
```

#### LONG Trading Lifecycle
```
FLAT --[BUY signal]--> LONG (qty > 0, avg_price = exec_price)
LONG --[BUY signal]--> LONG deeper (weighted avg_price)
LONG --[SELL signal]--> close (realized_pnl = (exec_price - avg_price) * sellQty - fee)
  sellQty = min(order_qty, position_qty)  // overshoot-safe
  if closed completely: qty → 0, avg_price → 0  // FLAT, never flips to SHORT
```

### Metrics Definitions

#### backtest_sharpe (Строгая формула)
```
Inputs:
  fills = ledger.fills.filter(f => f.realized_pnl !== 0)
  returns[i] = fills[i].realized_pnl / position_size_usd

Precondition:
  returns.length >= 2  (else backtest_sharpe = 0)

Computation:
  mean = Σ(returns) / N
  variance = Σ((returns[i] - mean)²) / N  // population variance
  stddev = √variance

  if stddev > 0:
    raw = (mean / stddev) * √N
    backtest_sharpe = truncateTowardZero(raw, 6)
  else:
    backtest_sharpe = 0

Properties:
  - Per-trade (NOT annualized)
  - Population variance (NOT sample)
  - Truncated toward zero to 6 decimals (deterministic)
  - N = count of trades with non-zero realized PnL
```

### Determinism Rules

| Rule | Check | Evidence |
|------|-------|----------|
| D-01 | backtest x2 hash match | SHA256(serializeLedger(run1)) === SHA256(serializeLedger(run2)) |
| D-02 | enrichBars x2 hash match | SHA256(JSON.stringify(enrichBars(bars))) x2 |
| D-03 | signals x2 hash match | SHA256(JSON.stringify(run1.signals)) === SHA256(JSON.stringify(run2.signals)) |
| D-04 | No wall-clock in output | Все timestamps из bar.ts_open; created_at фиксирован |
| D-05 | Sorted output | stableSortByKey(fills, 'trade_id'); sorted position keys |

### Evidence Outputs

| Artifact | Path | Format |
|----------|------|--------|
| Backtest fixture run | `reports/evidence/E108/BACKTEST_FIXTURE_RUN.md` | md |
| Determinism x2 proof | `reports/evidence/E108/DETERMINISM_X2.md` | md |
| WFO report | `reports/evidence/E108/WFO_REPORT.md` | md |
| Overfit court | `reports/evidence/E108/OVERFIT_COURT.md` | md |
| Sweep report | `reports/evidence/EPOCH-SWEEP-73/gates/manual/epoch_sweep_report.json` | json (deterministic) |
| Per-candidate evidence | `reports/evidence/EPOCH-SWEEP-73/<config_id>/candidate.json` | json (deterministic) |

### Gate Semantics

| Verdict | Meaning | Action |
|---------|---------|--------|
| **PASS** | Все checks green; evidence present | Proceed |
| **BLOCKED** | Known issue prevents evaluation | Fix issue, re-run |
| **NEEDS_DATA** | Insufficient input to evaluate | Acquire data, re-run |
| **FAIL** | Evidence evaluated, criteria not met | Investigate, patch, re-run |

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Enrichment drift (proxy vs real liq) | MEDIUM | HIGH | Document as PROXY; flag in strategy meta; validate range |
| Sharpe gaming (over-optimized params) | MEDIUM | HIGH | WFO + overfit court + deflated Sharpe |
| Short position overshoot | LOW | HIGH | Overshoot clamping in ledger (already implemented) |
| Non-determinism from float rounding | LOW | MEDIUM | truncateTowardZero(6) + SHA256 x2 |
| E108 fixture too simple (200 bars) | MEDIUM | MEDIUM | Add larger fixtures; multi-regime; real data replay |

---

## 6) PATCH PLAN (MINIMAL DIFF)

### P-01: NEW `scripts/verify/regression_backtest01_organ_health.mjs`

**Purpose:** Lightweight backtest organ health gate for verify:fast
**What:** Import engine + enricher + S1; run backtest; verify backtest_sharpe exists and is number; verify determinism x2 (hash match). < 5 seconds.
**Why safe:** Read-only, no FS writes, pure computation.

### P-02: MODIFIED `scripts/verify/e108_backtest_determinism_x2_contract.mjs`

**What:** Add S3 (liq_vol_fusion) with enrichBars to determinism x2 checks.
**Why:** Current contract only tests S1/S2 on raw bars; S3+ needs enrichBars which is untested in x2.
**Why safe:** Additive — existing tests unchanged; new test added at end.

### P-03: NEW `scripts/edge/backtest_organ_pipeline.mjs`

**Purpose:** Orchestrator that connects: enrichBars → backtest x2 → Edge Lab courts → candidate evidence → CT01.
**What:** Single entry point for "backtest organ" — replaces needing 4 separate scripts.
**Why safe:** Orchestrator only; calls existing functions; no new logic.

### P-04: MODIFIED `package.json`

**What:** Add scripts:
- `"verify:backtest:health"`: runs regression_backtest01_organ_health gate
- `"backtest:organ:run"`: runs backtest_organ_pipeline.mjs

**Why safe:** Additive scripts; existing scripts unchanged.

### P-05: MODIFIED `specs/reason_code_taxonomy.json`

**What:** Add tokens:
- `BACKTEST_ORGAN_HEALTH_PASS`
- `BACKTEST_ORGAN_HEALTH_FAIL`
- `BACKTEST_ORGAN_SHARPE_MISSING`
- `BACKTEST_ORGAN_DETERMINISM_FAIL`
- `BACKTEST_ORGAN_COURT_NEEDS_DATA`

**Why safe:** Additive tokens; existing tokens unchanged; regex patterns cover BACKTEST_* prefix.

---

## 7) REGRESSION GATES (REQUIRED)

### RG-BT01: backtest_sharpe_presence_and_value

| Field | Value |
|-------|-------|
| **ID** | RG-BT01 |
| **Purpose** | Verify backtest_sharpe is computed and finite for all fixture strategies |
| **Inputs** | E108 fixture + S1 + enrichBars + S3 |
| **Deterministic checks** | `typeof backtest_sharpe === 'number'`; `isFinite(backtest_sharpe)`; `backtest_sharpe > 0` for profitable strategies |
| **Evidence path** | stdout (gate receipt) |
| **Expected verdict** | PASS |

### RG-BT02: backtest_determinism_x2

| Field | Value |
|-------|-------|
| **ID** | RG-BT02 |
| **Purpose** | SHA256 hash match for ledger+signals across 2 identical runs |
| **Inputs** | E108 fixture + S1/S2/S3 |
| **Deterministic checks** | `hash(run1.ledger) === hash(run2.ledger)` x3 strategies |
| **Evidence path** | stdout (gate receipt) |
| **Expected verdict** | PASS |

### RG-BT03: ledger_short_support

| Field | Value |
|-------|-------|
| **ID** | RG-BT03 |
| **Purpose** | Verify SHORT lifecycle: open, cover, overshoot protection |
| **Inputs** | Synthetic fill sequence: SELL (open short) → BUY (cover short) |
| **Deterministic checks** | `pos.qty < 0` after SELL from FLAT; `realized_pnl = (entry-exit)*qty - fee` on cover; `pos.qty === 0` after full cover (no flip to LONG) |
| **Evidence path** | stdout (gate receipt) |
| **Expected verdict** | PASS |

### RG-BT04: candidatefsm_ct01_backtested_path

| Field | Value |
|-------|-------|
| **ID** | RG-BT04 |
| **Purpose** | End-to-end: build candidate with backtest_sharpe > 0, transition CT01, verify state === BACKTESTED |
| **Inputs** | Synthetic candidate + kernel + policy |
| **Deterministic checks** | `fsm.transition('CT01_DRAFT_TO_BACKTESTED').success === true`; `fsm.state === 'BACKTESTED'` |
| **Evidence path** | stdout (gate receipt) |
| **Expected verdict** | PASS |

### RG-BT05: courts_adapter_structural_validity

| Field | Value |
|-------|-------|
| **ID** | RG-BT05 |
| **Purpose** | Verify Edge Lab courts importable and callable with minimal input |
| **Inputs** | Import all 7 courts; call with empty/minimal edge object |
| **Deterministic checks** | All courts return `{ verdict, reason_codes, evidence }` structure; NEEDS_DATA on missing input |
| **Evidence path** | stdout (gate receipt) |
| **Expected verdict** | PASS (NEEDS_DATA verdicts acceptable) |

---

## 8) GATE MATRIX + DoD

### Gate Matrix

| Gate | Expected | reason_code | surface |
|------|----------|-------------|---------|
| RG-BT01 backtest_sharpe_presence | PASS | BACKTEST_ORGAN_HEALTH_PASS | PROFIT |
| RG-BT02 backtest_determinism_x2 | PASS | BACKTEST_DETERMINISM_MATCH | PROFIT |
| RG-BT03 ledger_short_support | PASS | NONE | PROFIT |
| RG-BT04 ct01_backtested_path | PASS | CANDIDATE_FSM_TRANSITION | PROFIT |
| RG-BT05 courts_adapter_validity | PASS | NONE (or BACKTEST_ORGAN_COURT_NEEDS_DATA) | PROFIT |
| verify:fast (existing) | PASS x2 | NONE | ALL |

### Definition of Done (DoD) — Falsifiable

- [ ] `npm run -s verify:fast` passes x2 (no regression)
- [ ] RG-BT01 through RG-BT05 all PASS x2 (determinism)
- [ ] `backtest_sharpe` is number > 0 for S1 on E108 fixture
- [ ] `backtest_sharpe` is number for S3 on enriched E108 fixture
- [ ] SHORT: SELL from FLAT creates negative qty; BUY covers; no overshoot flip
- [ ] CT01: synthetic candidate with `backtest_sharpe=1.5` transitions DRAFT → BACKTESTED
- [ ] CT01: synthetic candidate with `backtest_sharpe=null` is BLOCKED
- [ ] All 7 Edge Lab courts importable and return valid verdict structure
- [ ] No new reason_codes used that aren't in taxonomy
- [ ] All new gates < 5s execution time (verify:fast budget)

---

## 9) RUN ORDER

```bash
# Step 0: Baseline (already confirmed)
npm run -s verify:fast                      # run 1
npm run -s verify:fast                      # run 2 (x2 anti-flake)

# Step 1: Implement patches P-01 through P-05

# Step 2: Verify patches don't break existing gates
npm run -s verify:fast                      # run 1 post-patch
npm run -s verify:fast                      # run 2 post-patch

# Step 3: Run new backtest organ gates
node scripts/verify/regression_backtest01_organ_health.mjs     # run 1
node scripts/verify/regression_backtest01_organ_health.mjs     # run 2 (x2)

# Step 4: Run enriched determinism x2
node scripts/verify/e108_backtest_determinism_x2_contract.mjs  # run 1
node scripts/verify/e108_backtest_determinism_x2_contract.mjs  # run 2 (x2)

# Step 5: Full organ pipeline (if P-03 implemented)
node scripts/edge/backtest_organ_pipeline.mjs                  # run 1
node scripts/edge/backtest_organ_pipeline.mjs                  # run 2 (x2)

# Step 6: Evidence collection
UPDATE_E108_EVIDENCE=1 node scripts/backtest/e108_backtest_run.mjs
UPDATE_E108_EVIDENCE=1 node scripts/wfo/e108_wfo_run.mjs

# Step 7: Final verification
npm run -s verify:fast                      # final x2 run 1
npm run -s verify:fast                      # final x2 run 2
```

---

## 10) ONE_NEXT_ACTION

```bash
node scripts/verify/e108_backtest_determinism_x2_contract.mjs
```

---

## 11) BREAKTHROUGH IDEAS

### IDEA-01: Monte Carlo Stress Worlds

**Идея:** Генерировать N (100-1000) "стресс-миров" через bootstrap resampling bars с replacement. Для каждого мира запускать backtest. Строить distribution of returns, sharpe, drawdown. Вычислять P(ruin), VaR(95%), CVaR(99%).

**Зачем:** Один backtest на 200 bar — это один sample path. Monte Carlo даёт distribution, что критически важно для sizing и risk management. Институциональный стандарт.

**Риск:** Computation cost: N * backtest_time. При N=1000 и 200 bars — ~10-30 секунд.

**MVV (Week 1):**
```javascript
export function monteCarloBacktest(strategy, bars, opts, N = 100, seed = 42) {
  // Bootstrap resample bars with replacement (seeded for determinism)
  // Run backtest on each world
  // Return: { sharpe_dist, drawdown_dist, pRuin, VaR95, CVaR99 }
}
```

**Fail-closed:** Seeded RNG → deterministic. SHA256 x2 proof. Если P(ruin) > 5% → BLOCKED.

---

### IDEA-02: Regime-Aware Backtest Segmentation

**Идея:** Разрезать bars на regime segments (BULL, BEAR, CHOP, HIGH_VOL, LOW_VOL) через HMM или threshold-based classifier. Запускать backtest per-regime. Стратегия, которая profitable только в одном regime — FAIL. Требуем positive expectancy в ≥2 regimes.

**Зачем:** Большинство стратегий — "fair-weather friends": работают в тренде, умирают в chop. Regime decomposition выявляет это.

**Риск:** HMM добавляет complexity; threshold-based проще, но менее robust.

**MVV (Week 1):** Threshold-based: classify bar as BULL/BEAR/CHOP по 20-bar SMA direction + ATR. Split, run per-segment. Уже имеем `_regime_flag` в enricher — reuse.

**Fail-closed:** Regime count < 2 → NEEDS_DATA. Negative expectancy в любом regime → warning; в >50% regimes → FAIL.

---

### IDEA-03: Slippage Stress Cascade

**Идея:** Запускать backtest 5 раз с progressively worse slippage: 2bps, 5bps, 10bps, 20bps, 50bps. Строить "slippage sensitivity curve". Стратегия с equity → 0 при 20bps — хрупкая.

**Зачем:** Наш текущий slip_bps=2 — оптимистичный. В реальности при liquidation cascades slippage может быть 50-100bps. Sensitivity curve — это "сколько edge у нас реально есть".

**Риск:** Минимальный — чистая parameterization.

**MVV (Week 1):**
```javascript
export function slippageSensitivity(strategy, bars, baseOpts) {
  const levels = [2, 5, 10, 20, 50];
  return levels.map(slip => ({
    slip_bps: slip,
    result: runBacktest(strategy, bars, { ...baseOpts, slip_bps: slip })
  }));
}
```

**Fail-closed:** Если sharpe < 0 при slip=10bps → warning. При slip=5bps → FAIL (edge too thin).

---

### IDEA-04: Temporal Coherence Validator

**Идея:** Проверять, что сигналы стратегии "когерентны" во времени: не слишком частые (overtrading), не слишком редкие (underfitting), signal autocorrelation в нормальном range. Выявлять "signal clustering" (20 trades в 10 минут = подозрительно).

**Зачем:** Стратегия может иметь хороший sharpe, но торговать нереалистично: 100 trades в одну секунду, или один trade за весь dataset. Temporal coherence — safety net.

**Риск:** Ложные срабатывания для high-frequency стратегий.

**MVV (Week 1):** Compute inter-trade intervals; flag if P99 < 1 bar или P01 > 50% of dataset.

**Fail-closed:** Median inter-trade < 1 bar → BLOCKED ("overtrading"). Trades < 5 → NEEDS_DATA.

---

### IDEA-05: Profit Attribution Decomposition

**Идея:** Разложить profit на компоненты: signal alpha, execution quality, cost drag, timing luck. `alpha = gross_pnl - benchmark_pnl`; `execution_quality = expected_cost - actual_cost`; `timing = PnL_entry - PnL_vwap`. Стратегия с alpha < 0, но profit > 0 — живёт на luck.

**Зачем:** Институциональный стандарт (Brinson attribution). Позволяет отделить skill от luck. Strategies с alpha = 0 → REJECT.

**Риск:** Requires benchmark definition (buy-and-hold или zero return).

**MVV (Week 1):** Simple: alpha = strategy_return - buy_and_hold_return. Если alpha < 0 → warning.

**Fail-closed:** alpha < -1% → FAIL. alpha ∈ [-1%, 0%] → WARNING. alpha > 0 → PASS.

---

### IDEA-06: Deterministic Replay Journal

**Идея:** Каждый backtest run записывает "replay journal" — полный trace всех decisions: bar → signal → fill → position update → metrics. Journal hashable и replayable. Можно diff два журнала и увидеть точку расхождения.

**Зачем:** Debug paradise. Когда что-то меняется, diff двух journals показывает exactly where и why. Essential для evolution confidence.

**Риск:** Storage: ~10KB per run для 200 bars. Negligible.

**MVV (Week 1):** Extend runBacktest to return `journal[]` entries. SHA256 journal для regression.

**Fail-closed:** journal_hash x2 match → PASS. Mismatch → FAIL with diff_path.

---

### IDEA-07: Dynamic Position Sizing Backtest

**Идея:** Текущий engine использует fixed `position_size_usd=500`. Добавить option для Kelly criterion sizing: `position_pct = (win_rate * avg_win - (1-win_rate) * avg_loss) / avg_win`. Позволяет backtest показать реалистичный compound growth.

**Зачем:** Fixed sizing → линейный equity curve. Kelly sizing → geometric growth (или geometric destruction). Показывает true capacity of edge.

**Риск:** Full Kelly too aggressive; fractional Kelly (0.25-0.5) safer. Requires rolling calculation.

**MVV (Week 1):** Add `sizing_mode: 'fixed' | 'fractional_kelly'` to backtest opts. Default 'fixed' (backward compat).

**Fail-closed:** If Kelly fraction < 0 → don't trade (negative expectancy auto-detected). If Kelly > 1.0 → cap at 0.5.

---

### IDEA-08: Cross-Strategy Correlation Detector

**Идея:** Когда MetaAgent имеет fleet кандидатов, проверять корреляцию signals между стратегиями. Если S3 и S4 correlation > 0.8 → они не diversifying; fleet risk = concentrated.

**Зачем:** Diversification — единственный free lunch. Высоко-коррелированный fleet — это один strategy с extra steps.

**Риск:** Нужен multi-strategy backtest (не текущий scope, но feasible).

**MVV (Week 1):** Compute Pearson correlation of signal arrays между кандидатами. Flag if |r| > 0.7.

**Fail-closed:** Correlation > 0.9 → BLOCKED (redundant candidate). Correlation > 0.7 → WARNING.

---

### IDEA-09: Auto-Healing Enrichment Watchdog

**Идея:** Enricher `enrichBars()` вычисляет proxy signals. Watchdog проверяет: 1) distribution of `_liq_pressure` stable across datasets; 2) `_burst_score` не degenerate (all zeros or all maxed); 3) `_regime_flag` has ≥2 distinct values. Если деградировано → NEEDS_DATA, не silent degradation.

**Зачем:** Silent degradation — когда enricher тихо возвращает zeros, а стратегия видит "no signal" и торгует random. Watchdog ловит это.

**Риск:** Порог "degenerate" нужно calibrate.

**MVV (Week 1):** Check: `std(_liq_pressure) > 0.01`, `unique(_regime_flag).length >= 2`, `mean(_burst_score) > 0`.

**Fail-closed:** Degenerate enrichment → NEEDS_DATA (не PASS с пустыми signals).

---

### IDEA-10: Evidence Chain Cryptographic Seal

**Идея:** Каждый artifact (backtest result, court verdict, candidate state) получает SHA256 seal. Seals chain: `seal_n = SHA256(content_n + seal_{n-1})`. Можно verify integrity всей цепочки. Любое изменение → broken chain → FAIL.

**Зачем:** Tamper-proof evidence. Если кто-то (или баг) изменит court verdict post-hoc → chain breaks.

**Риск:** Overhead: negligible (SHA256 fast). Complexity: chain storage.

**MVV (Week 1):** Extend sweep report to include `evidence_chain: [{step, hash, prev_hash}]`.

**Fail-closed:** Chain break → FAIL. Missing link → BLOCKED.

---

### IDEA-11: Adaptive Fee Model from E112

**Идея:** Текущий backtest использует fixed fee_bps=4. E112 имеет venue profiles (bybit: maker=1, taker=6). Backtest должен автоматически pull venue profile по symbol и использовать реалистичные fees.

**Зачем:** Maker vs taker разница (1 vs 6 bps) = 5bps per trade. На 100 trades = 500bps. Это может flip profitable → unprofitable.

**Риск:** Минимальный — pure parameterization.

**MVV (Week 1):** `runBacktest(strategy, bars, { venue: 'bybit_linear' })` → auto-lookup e112 profile.

**Fail-closed:** Unknown venue → default 'fixture' profile (backward compat).

---

### IDEA-12: Backtest Organ Consciousness Dashboard

**Идея:** Extend `ops:cockpit` с backtest organ section: last run time, strategies tested, sharpe distribution, court verdicts, pipeline health (how many DRAFT, BACKTESTED, etc.), enrichment freshness.

**Зачем:** Visibility. Operator sees "backtest organ: ALIVE / DEGRADED / MISSING" at a glance.

**Риск:** Dashboard complexity.

**MVV (Week 1):** Add `backtestOrganScan()` function returning `{ status, strategies_tested, sharpe_range, court_coverage, pipeline_counts }`. Wire into cockpit.

**Fail-closed:** If no backtest evidence found → status = 'MISSING'. If evidence stale (> 7 days) → 'DEGRADED'.

---

## 12) "КАК СТАРЫЙ ДРУГ"

Слушай, я проверил весь орган. Хорошие новости: у тебя уже есть рабочий двигатель, реальная поддержка шортов с защитой от overshoot, Sharpe считается правильно и детерминированно, WFO стоит, overfit court на месте, а CandidateFSM грамотно гейтит DRAFT → BACKTESTED. Плохие новости: все эти прекрасные детали разбросаны по 7+ скриптам, как пазл в коробке без крышки. Нужен один оркестратор, который их склеит, и один лёгкий gate в verify:fast, чтобы ты спал спокойно. Три патча — и орган замкнут. Дерзай.

---

*End of BACKTEST ORGAN AUDIT + SPEC v1.0*
