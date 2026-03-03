# SDD-003: Sprint 2 -- Backtest + Data Acquisition

> Software Design Document | Version 1.0.0
> Date: 2026-03-03 | Classification: INTERNAL
> Parent: [SDD-000 Master Roadmap](SDD_MASTER_ROADMAP.md)
> Predecessor: [SDD-002 Sprint 1 -- Organism Alive](SDD_SPRINT_1_ORGANISM_ALIVE.md)
> Author: AI Architect (CERT mode) | Approver: DRtishev

---

## 1. Reality Snapshot

### Prerequisites (Sprint 1 DoD)

| Gate | Required State |
|------|---------------|
| verify:fast x2 | PASS (42+ gates, deterministic) |
| ops:life | EC=0 (ALIVE) |
| ops:doctor | EC=0 (HEALTHY, scoreboard >= 70) |
| DeterministicClock | Assert mode (no silent fallback) |
| SAN01 core/ | Scanned with allowlist |
| Backtest x2 | PASS (byte-identical) |
| Courts | Wired into sweep (>= 3 per candidate) |

### Entering State

The organism is alive and deterministic. The nervous system, immune system, and verification layer are operational. Now the organism needs **food** (data) and **muscles** (backtest upgrades) to begin producing value.

| Subsystem | State | Need |
|-----------|-------|------|
| Data Organ | NEEDS_DATA | Only fixture data (200 bars); no real market data |
| Backtest Engine | ALIVE | Missing market impact model |
| Profit Ledger | STALE | Last refresh: Nov 2023 |
| Fill Probe | STUB | Runner not implemented |
| Candidate Pool | 4x NEEDS_DATA | Cannot evaluate without real data |
| Data Lanes | 1/6 TRUTH_READY | Only liq_bybit_ws_v5 at TRUTH level |

### Data Lane Registry

| Lane | Kind | Truth Level | State | Sprint Action |
|------|------|-------------|-------|---------------|
| liq_binance_forceorder_ws | WS | HINT | EXPERIMENTAL | Acquire |
| liq_bybit_ws_v5 | WS | TRUTH | TRUTH_READY | Baseline |
| liq_okx_ws_v5 | WS | HINT | EXPERIMENTAL | Acquire |
| price_offline_fixture | FIXTURE | HINT | EXPERIMENTAL | Upgrade to real |
| price_okx_orderbook_ws | WS | HINT | PREFLIGHT | Activate |
| ohlcv_okx_orderbook_derived | DERIVED | HINT | EXPERIMENTAL | Derive |

---

## 2. Goals

| # | Goal | Measurable Outcome | MINE |
|---|------|--------------------|------|
| G1 | Market impact model | `sqrt(size/ADV) * coeff` implemented and verified x2 | -- |
| G2 | Funding rate data | >= 1 exchange, SHA256 locked, >= 6 months history | MINE-11 |
| G3 | Open interest data | >= 1 exchange, SHA256 locked, >= 6 months history | MINE-11 |
| G4 | Profit ledger refresh | Regenerated from latest capsule, current metrics | MINE-13 |
| G5 | Fill probe alive | Real testnet fill detection operational | MINE-12 |
| G6 | Paper trading harness | >= 1 strategy running paper on testnet | -- |
| G7 | Data quorum | >= 2 independent data feeds acquired and locked | -- |

---

## 3. Non-Goals

- Live trading on mainnet (Sprint 3)
- Multi-exchange normalization (Tier 5)
- Walk-forward optimization (Tier 5)
- Monte Carlo confidence intervals (Tier 5, partially available via bootstrapCI court)
- Regime-aware position sizing (Tier 5)
- Real-time monitoring dashboard (Tier 4)

---

## 4. Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Network: double-key | Data acquisition requires explicit unlock | R3 + R14 |
| Network: one-time | Acquire data, lock, then offline replay | RESEARCH mode |
| Data integrity | All capsules SHA256 locked on acquisition | R11 |
| Determinism | Replay must produce identical results offline | R4 |
| No live trading | Paper/testnet only; mainnet disabled | R11 + TREASURE_NET_KILL |
| Capsule format | OHLCV JSONL with normalized schema | data_capabilities.json |

---

## 5. Design

### 5.1 Square-Root Market Impact Model

**Theory:**

Market impact follows a concave power law. The most widely accepted model (Almgren-Chriss) uses:

```
Impact(bps) = eta * sqrt(Q / ADV) * sigma
```

Where:
- `Q` = order size (USD notional)
- `ADV` = average daily volume (USD)
- `sigma` = daily volatility (bps)
- `eta` = calibration coefficient (exchange-specific)

**Implementation:**

```javascript
// core/sim/market_impact.mjs (NEW FILE)

/**
 * Square-root market impact estimator.
 * Returns estimated impact in basis points.
 *
 * @param {number} sizeUsd    - Order notional in USD
 * @param {number} advUsd     - Average daily volume in USD
 * @param {number} volatility - Daily volatility (decimal, e.g. 0.02 = 2%)
 * @param {object} opts
 * @param {number} opts.eta   - Calibration coefficient (default: 0.1)
 * @returns {number} Impact in basis points
 */
export function estimateImpact(sizeUsd, advUsd, volatility, opts = {}) {
  const eta = opts.eta ?? 0.1;
  if (advUsd <= 0) return Infinity;  // fail-safe: no liquidity = infinite cost
  const participation = sizeUsd / advUsd;
  return eta * Math.sqrt(participation) * volatility * 10000;
}

/**
 * Adjust expected PnL for market impact.
 * @param {number} grossPnlBps  - Raw expected PnL in bps
 * @param {number} impactBps    - Estimated impact in bps (entry + exit)
 * @returns {number} Net PnL in bps
 */
export function adjustForImpact(grossPnlBps, impactBps) {
  return grossPnlBps - 2 * impactBps;  // impact on entry + exit
}
```

**Integration Points:**

| Consumer | Integration | Change |
|----------|-------------|--------|
| core/sim/engine.mjs | `simulateOrder()` | Add impact to spread proxy |
| core/backtest/engine.mjs | `executeFill()` | Adjust fill price by impact |
| Edge Lab pipeline | Step 14 (cost model) | Replace fixed spread with impact model |
| Profit ledger | `computeEdge()` | Include impact in breakpoint fee calc |

**Calibration:**

| Exchange | Symbol | eta (estimated) | ADV (USD) | Source |
|----------|--------|-----------------|-----------|--------|
| Binance | BTCUSDT | 0.05-0.15 | ~$15B | Public volume data |
| Binance | ETHUSDT | 0.08-0.20 | ~$5B | Public volume data |
| Bybit | BTCUSDT | 0.10-0.25 | ~$3B | Public volume data |

eta will be calibrated from acquired data in Phase B.

**Regression Gate:** `regression_impact01_determinism_x2`
- Runs impact model with fixed inputs, twice
- Verifies byte-identical output
- Verifies impact increases with sqrt(size)
- Verifies impact = Infinity when ADV = 0

### 5.2 Data Acquisition Pipeline

**Architecture:**

```
RESEARCH MODE (double-key unlocked)
  |
  +-- Phase A: ACQUIRE
  |     |
  |     +-- Funding Rate Capsule (Binance)
  |     |     +-- API: GET /fapi/v1/fundingRate
  |     |     +-- Range: 6+ months (180+ days)
  |     |     +-- Format: JSONL (ts, symbol, rate, markPrice)
  |     |     +-- Rate limit: 500 req/min
  |     |     +-- SHA256 lock on complete
  |     |
  |     +-- Open Interest Capsule (Binance)
  |     |     +-- API: GET /fapi/v1/openInterestHist
  |     |     +-- Range: 6+ months, 5-minute intervals
  |     |     +-- Format: JSONL (ts, symbol, sumOpenInterest, sumOpenInterestValue)
  |     |     +-- SHA256 lock on complete
  |     |
  |     +-- OHLCV Capsule (Binance/Bybit)
  |           +-- API: GET /fapi/v1/klines
  |           +-- Range: 12+ months, 1h candles
  |           +-- Format: normalized JSONL via e110_capsule_builder
  |           +-- SHA256 lock on complete
  |
  +-- Phase B: LOCK
  |     |
  |     +-- SHA256 fingerprint per capsule
  |     +-- Lock file: artifacts/capsules/<name>.lock.json
  |     +-- Metadata: source, range, row_count, sha256, acquired_at
  |
  +-- Phase C: REPLAY (OFFLINE, CERT mode)
        |
        +-- replay_engine.mjs reads locked capsules
        +-- TREASURE_NET_KILL=1 enforced
        +-- Determinism x2 verification
```

**Capsule Lock Schema:**

```json
{
  "schema_version": "1.0.0",
  "capsule_id": "binance_funding_btcusdt_6m",
  "source": "binance_public_api",
  "symbol": "BTCUSDT",
  "data_type": "funding_rate",
  "range_start": "2025-09-01T00:00:00Z",
  "range_end": "2026-03-01T00:00:00Z",
  "row_count": 26280,
  "sha256": "<hash>",
  "format": "jsonl",
  "status": "LOCKED"
}
```

**Data Quorum Gate:** `regression_data_quorum01`
- Verifies >= 2 independent capsules exist with LOCKED status
- Verifies SHA256 integrity of each capsule
- Verifies offline replay produces identical results
- PASS criteria: >= 2 feeds, all hashes valid

### 5.3 Profit Ledger Refresh

**Current State:** Profit ledger contains data from Nov 2023. Metrics are stale and do not reflect current market conditions.

**Refresh Process:**

```
1. Acquire fresh OHLCV capsule (Phase A)
2. Run backtest on all candidate strategies against new data
3. Regenerate profit ledger:
   - edge_by_strategy: { sharpe, sortino, calmar, win_rate, ... }
   - breakpoint_fee_multiplier: recalculated with market impact
   - candidate_verdicts: fresh court evaluations
4. Lock refreshed ledger with SHA256
```

**Key Metric: Breakpoint Fee Multiplier**

```
BFM = expected_gross_edge / total_cost
    = E[|signal|] / (spread + commission + market_impact + funding_cost)
```

Current: 1.667x (MINE-14: below 2.0x strict threshold)
Target: Recalculate with real data and market impact model

**Verdict Logic:**
- BFM >= 2.0x -> PASS (strict): strategy is profitable after all costs
- BFM >= 1.5x -> PASS (relaxed): marginal, proceed with caution
- BFM < 1.5x -> HOLD_STRICT: insufficient edge, do not trade

### 5.4 Fill Probe Implementation

**Current State:** `core/exec/fill_probe.mjs` is a stub. The `MasterExecutor` has execution flow but no real fill detection.

**Design:**

```javascript
// core/exec/fill_probe.mjs

export class FillProbe {
  constructor(adapter, opts = {}) {
    this._adapter = adapter;
    this._pollInterval = opts.pollInterval ?? 1000;
    this._maxPolls = opts.maxPolls ?? 60;
    this._timeout = opts.timeout ?? 60000;
  }

  /**
   * Poll for fill status until filled, cancelled, or timeout.
   * @param {string} orderId
   * @returns {Promise<FillResult>}
   */
  async probe(orderId) {
    for (let i = 0; i < this._maxPolls; i++) {
      const status = await this._adapter.getOrderStatus(orderId);
      if (status.filled) {
        return {
          status: 'FILLED',
          fill_price: status.avgPrice,
          fill_qty: status.filledQty,
          latency_ms: status.latency,
          slippage_bps: this._computeSlippage(status),
        };
      }
      if (status.cancelled || status.rejected) {
        return { status: 'CANCELLED', reason: status.reason };
      }
      await this._delay(this._pollInterval);
    }
    return { status: 'TIMEOUT', polls: this._maxPolls };
  }
}
```

**Adapter Interface:**

```javascript
// Testnet adapter for paper trading
export class TestnetAdapter {
  constructor(exchange, apiKey, apiSecret) { ... }
  async placeOrder(intent) { ... }
  async getOrderStatus(orderId) { ... }
  async cancelOrder(orderId) { ... }
}
```

**Safety Controls:**
- Paper/testnet only (R11: live unlock via file contract)
- Max order size capped at testnet limits
- Circuit breaker: 3 consecutive failures -> halt
- All fills logged to EventBus with evidence

### 5.5 Paper Trading Harness

**Architecture:**

```
Paper Trading Harness
  |
  +-- DataFeed (live testnet or replay)
  |     +-- WebSocket subscription (testnet)
  |     +-- Bar construction (1m, 5m, 1h)
  |
  +-- Strategy Instance
  |     +-- s1_breakout_atr (initial candidate)
  |     +-- Receives bars via onBar() interface
  |
  +-- Execution Layer
  |     +-- TestnetAdapter -> exchange testnet API
  |     +-- FillProbe -> fill detection
  |     +-- MasterExecutor -> reconciliation
  |
  +-- Evidence Layer
  |     +-- EventBus: all events logged
  |     +-- Metrics: running Sharpe, drawdown, PnL
  |     +-- Daily checkpoint: SHA256 chain
  |
  +-- Safety Layer
        +-- RiskGovernor: position limits, drawdown limits
        +-- Circuit breaker: consecutive losses
        +-- Daily loss limit: 5% of capital
```

**Paper Trading Evidence Schema:**

```json
{
  "schema_version": "1.0.0",
  "session_id": "paper_001",
  "strategy": "s1_breakout_atr",
  "exchange": "binance_testnet",
  "start_date": "2026-03-15",
  "days_running": 0,
  "trades_total": 0,
  "metrics": {
    "realized_pnl": 0,
    "sharpe": null,
    "max_drawdown_pct": 0,
    "win_rate": null
  },
  "status": "RUNNING",
  "daily_checkpoints": []
}
```

**Target:** 30+ days, 100+ trades before Sprint 3 graduation evaluation.

---

## 6. Patch Plan

### Phase A: Infrastructure (Week 1)

```
A.1  Implement market impact model
     File: core/sim/market_impact.mjs (NEW)
     Diff: ~80 lines
     Gate: regression_impact01_determinism_x2

A.2  Integrate impact into backtest engine
     File: core/backtest/engine.mjs
     Diff: ~15 lines
     Gate: regression_bt01_determinism_x2 (existing, must still pass)

A.3  Integrate impact into sim engine
     File: core/sim/engine.mjs
     Diff: ~10 lines
     Gate: verify:fast (existing)

A.4  Implement fill probe
     File: core/exec/fill_probe.mjs
     Diff: ~120 lines (rewrite from stub)
     Gate: regression_fill01_probe_contract
```

### Phase B: Data Acquisition (Week 1-2)

```
B.1  Acquire funding rate history (REQUIRES NETWORK)
     Mode: RESEARCH (double-key unlock)
     Script: scripts/data/acquire_funding_rates.mjs
     Output: artifacts/capsules/binance_funding_*.jsonl
     Lock: artifacts/capsules/binance_funding_*.lock.json

B.2  Acquire open interest history (REQUIRES NETWORK)
     Mode: RESEARCH (double-key unlock)
     Script: scripts/data/acquire_open_interest.mjs
     Output: artifacts/capsules/binance_oi_*.jsonl
     Lock: artifacts/capsules/binance_oi_*.lock.json

B.3  Acquire OHLCV candles (REQUIRES NETWORK)
     Mode: RESEARCH (double-key unlock)
     Script: scripts/data/e110_capsule_builder.mjs (existing)
     Output: data/normalized/binance_public/*/
     Lock: capsule lock with SHA256

B.4  Verify offline replay determinism
     Mode: CERT (offline)
     Command: replay x2 on each capsule
     Gate: regression_data_quorum01
```

### Phase C: Ledger & Paper (Week 2-3)

```
C.1  Refresh profit ledger
     Script: scripts/edge/profit_ledger_refresh.mjs
     Input: new capsules + market impact model
     Output: updated EDGE_PROFIT_00/ with real metrics
     Gate: edge:profit:00 (existing)

C.2  Calibrate market impact (eta)
     Input: OHLCV + OI data
     Method: Historical fill analysis or spread proxy
     Output: specs/market_impact_calibration.json

C.3  Set up paper trading harness
     Script: scripts/edge/edge_paper_00_sim.mjs (existing, enhance)
     Strategy: s1_breakout_atr on testnet
     Output: daily evidence checkpoints

C.4  Generate evidence pack
     Output: reports/evidence/EPOCH-SPRINT2-<RUN_ID>/
```

### Rollback Plan

- Phase A: Pure code changes, revertable via git
- Phase B: Data acquisition is additive (new files only)
- Phase C: Ledger refresh creates new evidence, does not modify source

---

## 7. Verification Runbook

### Gate Execution Sequence

```bash
# Phase A verification:
npm run -s verify:fast                    # x2 PASS (impact model integrated)
npm run -s ops:life                       # EC=0
npm run -s ops:doctor                     # EC=0, scoreboard >= 70

# Phase B verification (after data acquisition):
npm run -s verify:regression:data-quorum01  # PASS (>= 2 feeds locked)
# Offline replay x2:
npm run -s verify:replay:funding:x2       # PASS (deterministic)
npm run -s verify:replay:oi:x2            # PASS (deterministic)
npm run -s verify:replay:ohlcv:x2         # PASS (deterministic)

# Phase C verification:
npm run -s edge:profit:00                 # PASS (real metrics)
npm run -s verify:fast                    # x2 PASS (all gates including new)
```

### New Gates Summary

| Gate ID | Script | Purpose |
|---------|--------|---------|
| RG_IMPACT01 | regression_impact01_determinism_x2.mjs | Market impact model x2 |
| RG_DATA_QUORUM01 | regression_data_quorum01.mjs | >= 2 data feeds locked |
| RG_FILL01 | regression_fill01_probe_contract.mjs | Fill probe contract |
| RG_REPLAY_X2 | regression_replay_determinism_x2.mjs | Capsule replay x2 |

---

## 8. Evidence Requirements

### Artifacts

```
reports/evidence/EPOCH-SPRINT2-<RUN_ID>/
  PREFLIGHT.md
  GATE_PLAN.md
  gates/
    verify_fast_run1.log
    verify_fast_run2.log
    ops_life.log
    ops_doctor.log
    impact_model_x2.json         -- determinism proof
    data_quorum.json             -- capsule inventory
    replay_funding_x2.json       -- replay determinism
    replay_oi_x2.json            -- replay determinism
    replay_ohlcv_x2.json         -- replay determinism
    profit_ledger_refresh.json   -- updated metrics
    fill_probe_contract.json     -- probe test results
  data/
    capsule_manifest.json        -- all acquired capsules
    impact_calibration.json      -- eta values per exchange/symbol
  DIFF.patch
  SHA256SUMS.md
  SUMMARY.md

artifacts/capsules/
  binance_funding_btcusdt_6m.jsonl
  binance_funding_btcusdt_6m.lock.json
  binance_oi_btcusdt_6m.jsonl
  binance_oi_btcusdt_6m.lock.json
  binance_ohlcv_btcusdt_12m.lock.json
```

---

## 9. Stop Rules

### PASS Criteria

- [ ] verify:fast x2: IDENTICAL PASS (42+ gates + 4 new)
- [ ] Market impact model: determinism x2 PASS
- [ ] Data quorum: >= 2 independent feeds acquired and SHA256 locked
- [ ] Offline replay: x2 deterministic for all capsules
- [ ] Profit ledger: refreshed with current data
- [ ] Breakpoint fee multiplier: recalculated (documented, even if < 2.0x)
- [ ] Fill probe: contract gate PASS
- [ ] Paper trading: harness operational (>= 1 strategy running)
- [ ] ops:doctor: scoreboard >= 70 (maintained from Sprint 1)

### FAIL / Rollback Conditions

- Market impact model shows BFM < 1.0x for all strategies -> HOLD_STRICT verdict, stop Sprint 3
- Data acquisition fails (API blocked, rate-limited) -> retry with different exchange
- Replay nondeterminism -> debug data capsule builder; do not proceed to paper
- Fill probe consistently fails on testnet -> investigate exchange testnet stability

---

## 10. Risk Register

| ID | Risk | P | I | Mitigation |
|----|------|---|---|------------|
| R2-01 | Exchange API rate limiting during acquisition | Medium | Medium | Adaptive backoff; multiple exchanges |
| R2-02 | Market impact model invalidates all strategies | Low | Critical | BFM < 1.0x -> HOLD_STRICT; do not force |
| R2-03 | Funding rate data has gaps | Medium | Low | Interpolation or mark gaps as MISSING |
| R2-04 | Testnet API differs from mainnet | Medium | Medium | Document differences; Sprint 3 validates |
| R2-05 | OHLCV capsule too large for memory | Low | Medium | Streaming replay; chunk-based processing |
| R2-06 | Paper trading latency masks real issues | Medium | Medium | Log all latencies; compare to mainnet benchmarks |
| R2-07 | eta calibration overfits to historical data | Medium | High | Use conservative (high) eta; validate out-of-sample |

---

## 11. Acceptance Criteria

### Definition of Done (DoD)

```
Sprint 2 is DONE when:

1. ALL Stop Rules PASS criteria satisfied
2. Market impact model implemented, calibrated, integrated
3. >= 2 independent data feeds acquired with SHA256 integrity
4. Profit ledger refreshed with current metrics
5. Fill probe operational (testnet fill detection)
6. Paper trading harness running >= 1 strategy
7. All replay determinism x2 gates PASS
8. Evidence pack complete with SHA256 chain
9. BFM documented (proceed to Sprint 3 only if BFM >= 1.5x for >= 1 strategy)
```

### Decision Gate: Sprint 3 Eligibility

| Condition | Verdict | Action |
|-----------|---------|--------|
| BFM >= 2.0x for >= 1 strategy | PROCEED (strict) | Sprint 3: full pipeline |
| BFM >= 1.5x, < 2.0x | PROCEED (relaxed) | Sprint 3: with increased monitoring |
| BFM < 1.5x for all strategies | HOLD_STRICT | Do NOT start Sprint 3; research new strategies |
| Data quorum < 2 feeds | BLOCKED | Resolve data acquisition before proceeding |

### Estimated Duration

**1-3 weeks** (data acquisition is the variable; code changes are ~1 week)

### ONE_NEXT_ACTION

```bash
# Implement market impact model
# File: core/sim/market_impact.mjs
```

---

*Generated: 2026-03-03 | Mode: CERT (offline) | Parent: SDD-000 | Predecessor: SDD-002*
