# R2 — Profit Truth Core Spec

> Phase: R2 | Priority: P1 | Duration: ~1 week | Status: PLANNED

---

## 1. Objective

Make profitability explainable, verifiable, and comparable: PnL attribution, fill quality, paper↔live parity, real-time reconciliation.

## 2. Requirements

| ID | Requirement | Current State | Target |
|----|------------|--------------|--------|
| REQ-R2.1 | PnL Attribution: 4-component breakdown | Ledger tracks fees + slippage but NOT funding; alpha_attribution doesn't decompose | Ledger tracks fees/slippage/funding/edge per fill |
| REQ-R2.2 | Fill Quality Monitor | No hidden_bps scoring | New `fill_quality.mjs` with execution quality metrics |
| REQ-R2.3 | Paper↔Live Parity Score | Data parity courts exist, no fill-level comparison | New `parity_score.mjs` comparing paper vs live fill metrics |
| REQ-R2.4 | Real-time PnL Reconciliation | Batch-only reconcile_v1, no funding check | Enhanced reconcile with funding + streaming support |

## 3. Mechanism Design

### 3.1 PnL Attribution (REQ-R2.1)

**File**: `core/profit/ledger.mjs`

**Changes**:
- Add `funding` field to per-fill records
- Add `total_funding` to ledger summary
- Add `getAttribution()` method returning:
  ```javascript
  { gross_pnl, fees_cost, slippage_cost, funding_cost, net_pnl, edge_pnl }
  ```
  where `edge_pnl = net_pnl` (residual after costs)

**Integration**: `recordFill()` accepts optional `funding` parameter from cost_model output.

### 3.2 Fill Quality Monitor (REQ-R2.2)

**New file**: `core/edge/fill_quality.mjs`

**Metrics**:
- `hidden_bps`: actual execution cost minus model-predicted cost
- `fill_ratio_accuracy`: actual fill ratio vs predicted
- `price_improvement_bps`: better-than-expected fills
- `latency_impact_bps`: estimated cost of execution latency
- `quality_score`: composite 0-100 score

**Input**: fill record + cost_model prediction for same trade
**Output**: `{ hidden_bps, fill_ratio_accuracy, price_improvement_bps, quality_score }`

### 3.3 Paper↔Live Parity Score (REQ-R2.3)

**New file**: `core/recon/parity_score.mjs`

**Mechanism**: Compare paper simulation fills vs live/dryrun fills for same signals:
- `fee_parity_bps`: |paper_fee - live_fee|
- `slippage_parity_bps`: |paper_slip - live_slip|
- `fill_rate_parity`: |paper_fill_rate - live_fill_rate|
- `pnl_parity_pct`: |paper_pnl - live_pnl| / |live_pnl|
- `composite_parity_score`: weighted composite 0-100

**Thresholds** (from reality_gap_monitor.mjs):
- fee: 10 bps → WARN, 50 bps → FAIL
- slippage: 20 bps → WARN, 100 bps → FAIL
- fill_rate: 5% → WARN, 20% → FAIL

### 3.4 Enhanced Reconciliation (REQ-R2.4)

**File**: `core/recon/reconcile_v1.mjs`

**Additions**:
- Funding reconciliation: compare ledger funding vs exchange funding payments
- Streaming interface: `reconcileIncremental(newFill, ledgerState)` for per-fill checks
- Recovery action codes: `RECON_OK`, `RECON_WARN_DRIFT`, `RECON_HALT_MISMATCH`

## 4. Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|-----------|
| Funding data unavailable | Attribution incomplete | Mark funding as BOUNDS_ESTIMATE (existing funding_model.mjs pattern) |
| Fill quality metric noise | False quality alerts | Rolling window (20+ fills) for stable scoring |
| Parity score instability | Noisy parity signals | Require minimum sample size (10+ paired fills) |
| Recon false positive | Unnecessary halts | Tolerance-based (existing model), WARN before HALT |

## 5. New Gates

### Fast
**RG_PNL_ATTRIBUTION_FAST01**: Contract — ledger `getLedgerSummary()` MUST return `total_funding` and `getAttribution()` MUST exist.

**RG_PARITY_SCORE_FAST01**: Contract — `parity_score.mjs` exports `computeParityScore()`, `fill_quality.mjs` exports `evaluateFillQuality()`.

### Deep
**RG_ATTRIBUTION_E2E01**: Synthetic scenario with known costs → attribution breakdown matches expected values.

**RG_FILL_QUALITY_E2E01**: Known fills + known predictions → quality metrics are deterministic and non-zero.

**RG_PARITY_E2E02**: Paper fills vs dryrun fills → parity score is computable and in range.

**RG_RECON_E2E02**: Ledger + exchange fills with drift → reconciliation detects and reports correctly.

## 6. Evidence Paths

- `reports/evidence/EPOCH-RADLITE-R2/attribution_proof.md`
- `reports/evidence/EPOCH-RADLITE-R2/fill_quality_proof.md`
- `reports/evidence/EPOCH-RADLITE-R2/parity_proof.md`
- `reports/evidence/EPOCH-RADLITE-R2/recon_proof.md`

## 7. Definition of Done

- [ ] Ledger produces 4-component attribution
- [ ] Fill quality scoring is deterministic and meaningful
- [ ] Parity score is computable for paper↔live pairs
- [ ] Reconciliation handles funding + streaming
- [ ] verify:fast x2 PASS (including 2 new gates)
- [ ] verify:deep PASS (including 4 new gates)
- [ ] victory:seal PASS
- [ ] AUDIT_AFTER_R2.md filled with honest verdict
