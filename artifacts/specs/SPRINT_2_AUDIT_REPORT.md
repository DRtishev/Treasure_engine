# Sprint 2 Audit Report — Backtest + Data

**Date**: 2026-03-04
**Branch**: `claude/resume-chat-session-FLaXt`
**Spec**: `artifacts/specs/SDD_SPRINT_2_BACKTEST_DATA.md`

---

## Executive Summary

Sprint 2 "Backtest + Data" completed successfully. Market impact model integrated
into backtest engine, fill probe implemented, data capsule infrastructure built with
3 locked capsules, profit ledger refresh operational. All gates pass.

Note: Data acquisition (Phase B) used fixture-derived synthetic capsules for offline
verification. Real market data requires network double-key unlock (RESEARCH mode).

---

## Deliverables Completed

### Phase A: Infrastructure

| ID | Deliverable | Status | Files |
|----|-------------|--------|-------|
| A.1 | Market impact model gate | DONE | `scripts/verify/regression_impact01_determinism_x2.mjs` |
| A.2 | Impact model → backtest engine | DONE | `core/backtest/engine.mjs` |
| A.4 | Fill probe implementation | DONE | `core/exec/fill_probe.mjs` |

**A.1**: 6-check gate: determinism x2, concavity (sqrt), zero volume, exec price direction,
aggregate stats. Model already existed at `core/edge/impact_model.mjs`.

**A.2**: `use_impact_model` opt + `impact_coeff` parameter. Backward-compatible — default
behavior unchanged (fixed `slip_bps=2`). Uses `estimateExecPrice()` from impact model.

**A.4**: `FillProbe` class with poll-based fill detection, circuit breaker (3 failures),
slippage calculation, diagnostics. Works with any adapter implementing `getOrderStatus()`.
7-check regression gate.

### Phase B: Data Acquisition

| ID | Deliverable | Status | Files |
|----|-------------|--------|-------|
| B.1-B.3 | Capsule lock infrastructure | DONE | `scripts/data/capsule_lock.mjs` |
| B.4 | Fixture capsule generation | DONE | `scripts/data/generate_fixture_capsules.mjs` |
| B.5 | Data quorum gate | DONE | `scripts/verify/regression_data_quorum01.mjs` |

**Capsules generated** (fixture-derived, offline):
- `fixture_ohlcv_btcusdt_200bar.jsonl` — 200 rows, OHLCV
- `fixture_funding_btcusdt.jsonl` — 17 rows, funding rate
- `fixture_oi_btcusdt.jsonl` — 34 rows, open interest

All 3 capsules SHA256-locked with integrity verification.

**Data quorum gate**: 10 checks — quorum (>=2), integrity (x3), schema (x3), replay x2 (x3), type diversity.

### Phase C: Profit Ledger

| ID | Deliverable | Status | Files |
|----|-------------|--------|-------|
| C.1 | Profit ledger refresh | DONE | `scripts/edge/profit_ledger_refresh.mjs` |

Refresh script runs all 4 strategies (s1, s3, s4, s5) with and without market impact model.
Computes BFM (Breakpoint Fee Multiplier). All deterministic x2.

BFM results (fixture data — expected low for synthetic):
- breakout_atr: BFM=0.135 (HOLD_STRICT)
- liq_vol_fusion: BFM=-0.032 (HOLD_STRICT)
- post_cascade_mr: BFM=0.128 (HOLD_STRICT)
- multi_regime_adaptive: BFM=0.108 (HOLD_STRICT)

**Note**: BFM values are low because fixture data is synthetic. Real market data
(Sprint 3+ with network) is required for meaningful BFM assessment.

---

## New Files Created

| File | Purpose |
|------|---------|
| `core/exec/fill_probe.mjs` | Fill detection probe with circuit breaker |
| `scripts/data/capsule_lock.mjs` | SHA256 capsule lock utility |
| `scripts/data/generate_fixture_capsules.mjs` | Fixture capsule generator |
| `scripts/edge/profit_ledger_refresh.mjs` | Profit ledger refresh with impact model |
| `scripts/verify/regression_impact01_determinism_x2.mjs` | Market impact gate (6 checks) |
| `scripts/verify/regression_fill01_probe_contract.mjs` | Fill probe gate (7 checks) |
| `scripts/verify/regression_data_quorum01.mjs` | Data quorum gate (10 checks) |
| `artifacts/capsules/*.jsonl` | 3 fixture-derived data capsules |
| `artifacts/capsules/*.lock.json` | 3 capsule lock files |

---

## Verification Results

### verify:fast x2 (Determinism)
- **Run 1**: 41/41 PASS
- **Run 2**: 41/41 PASS
- **Determinism**: CONFIRMED

### New Gates Added
| Gate | Checks | Status |
|------|--------|--------|
| RG_IMPACT01_DETERMINISM_X2 | 6/6 | PASS |
| RG_FILL01_PROBE_CONTRACT | 7/7 | PASS |
| RG_DATA_QUORUM01 | 10/10 | PASS |

### ops:life
- **Status**: ALIVE (EC=0)
- **FSM**: CERTIFIED
- **Telemetry**: 6/6 PASS
- **Doctor**: HEALTHY 100/100

### ops:doctor (Standalone)
- **Verdict**: HEALTHY
- **Score**: 100/100
- **Exit Code**: 0
- All 12 axes at maximum

---

## Stop Rules Satisfaction

| Stop Rule | Result |
|-----------|--------|
| verify:fast x2 identical PASS | 41/41 x2 |
| Market impact model x2 PASS | 6/6 checks |
| Data quorum >= 2 feeds locked | 3 feeds (OHLCV, funding, OI) |
| Offline replay x2 | 3/3 PASS |
| Profit ledger refreshed | DONE (4 strategies) |
| BFM documented | DONE (all HOLD_STRICT — fixture data) |
| Fill probe contract gate PASS | 7/7 checks |
| Paper trading harness operational | Pre-existing edge_paper_00_sim.mjs |
| ops:doctor scoreboard >= 70 | 100/100 |

---

## Commits

| Hash | Message |
|------|---------|
| `2dfb7d9` | feat: Sprint 2 Backtest + Data — impact model, fill probe, data quorum |
| (pending) | Sprint 2 audit report |

---

## DoD Checklist

- [x] Market impact model integrated into backtest (use_impact_model opt)
- [x] Impact model regression gate (6 checks, x2 determinism)
- [x] Fill probe implemented with circuit breaker
- [x] Fill probe regression gate (7 checks)
- [x] 3 data capsules locked with SHA256
- [x] Data quorum gate (>= 2 feeds, integrity, diversity)
- [x] Profit ledger refresh with BFM calculation
- [x] verify:fast 41/41 x2 PASS
- [x] ops:life EC=0 ALIVE
- [x] ops:doctor EC=0 HEALTHY 100/100
