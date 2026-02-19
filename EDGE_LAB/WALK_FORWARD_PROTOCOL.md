# WALK_FORWARD_PROTOCOL.md — Walk-Forward Testing Protocol
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Defines the mandatory walk-forward testing protocol for advancing hacks from TESTING to ELIGIBLE status. Walk-forward testing is the primary defense against overfitting.

---

## Protocol Overview

Walk-forward testing divides historical data into sequential in-sample (IS) and out-of-sample (OOS) windows. Parameters are optimized on IS data and evaluated on OOS data. The process is repeated across multiple windows (anchored or rolling).

**Fundamental Rule:** OOS data must NEVER be used for parameter selection. Any violation immediately invalidates results.

---

## Minimum Requirements for ELIGIBLE Status

| Requirement | Threshold | Notes |
|-------------|-----------|-------|
| Minimum OOS periods | 2 | At least 2 non-overlapping OOS windows |
| Minimum OOS duration | 3 months | Each OOS window must be >= 3 months |
| Minimum IS:OOS ratio | 3:1 | IS window must be >= 3x OOS window |
| Minimum OOS Sharpe | 0.5 | Each OOS window |
| OOS consistency | Both periods positive | No negative Sharpe OOS windows allowed |
| OOS Sharpe vs IS Sharpe | OOS >= 0.5 * IS | Degradation limit of 50% |
| Minimum trials | 10 | At least 10 optimization trials |
| Parameter stability | ESS >= 60% | From EXECUTION_SENSITIVITY_SPEC.md |

---

## Walk-Forward Window Types

### Type A: Anchored (Expanding Window)
- IS start: fixed at beginning of data
- IS end: moves forward
- OOS: always the period immediately after IS end
- OOS length: fixed (e.g., 6 months)

```
IS_1: [2022-01 to 2023-12] → OOS_1: [2024-01 to 2024-06]
IS_2: [2022-01 to 2024-06] → OOS_2: [2024-07 to 2024-12]
```

### Type B: Rolling Window
- IS: fixed length window rolling forward
- OOS: fixed length window immediately after IS end

```
IS_1: [2022-01 to 2023-06] → OOS_1: [2023-07 to 2023-12]
IS_2: [2022-07 to 2023-12] → OOS_2: [2024-01 to 2024-06]
IS_3: [2023-01 to 2024-06] → OOS_3: [2024-07 to 2024-12]
```

**Recommended:** Type B (Rolling) for most hacks; Type A if insufficient history.

---

## Recommended Window Sizes by Timeframe

| Primary Timeframe | IS Window | OOS Window | Min OOS Count |
|------------------|-----------|-----------|--------------|
| 1m - 15m | 6 months | 2 months | 3 |
| 30m - 1h | 12 months | 3 months | 2 |
| 4h | 18 months | 6 months | 2 |
| 1d | 24 months | 6 months | 2 |
| 1w | 36 months | 12 months | 2 |

---

## Optimization Protocol (IS Phase)

### Step 1: Define Parameter Grid
- List all tunable parameters with ranges and step sizes
- Document in TRIALS_LEDGER.md before running

### Step 2: Primary Optimization
Run Bayesian optimization (preferred) or grid search on IS data.
- Primary metric: Sharpe ratio
- Secondary metrics: Max drawdown, Win rate, Profit factor, Calmar ratio
- Minimum trials: 10 (Bayesian) or full grid (grid search)

### Step 3: Parameter Selection
Select the parameter set with:
1. Highest IS Sharpe (primary)
2. Subject to: IS max drawdown < 25%
3. Subject to: IS win rate > 35%
4. Robustness check: top-5 parameter sets must all be within 20% of optimal Sharpe

### Step 4: OOS Evaluation (Lock-box)
Apply selected parameters to OOS data WITHOUT modification.
- Record OOS Sharpe, drawdown, win rate
- Do NOT re-optimize after seeing OOS results

---

## Regime Coverage Requirements

The combined OOS periods must cover at least:
- **1 trending up regime** (sustained >15% price increase over OOS period)
- **1 trending down regime** (sustained >15% price decrease over OOS period)
- **1 ranging/sideways regime** (< 15% total move over OOS period)

If regime coverage is incomplete, the hack is flagged with `NEEDS_REGIME_COVERAGE` and additional OOS periods must be tested.

---

## Data Integrity Checks (Pre Walk-Forward)

Before beginning walk-forward, verify:
1. No data gaps > 3 consecutive bars in IS or OOS periods
2. No look-ahead bias in feature calculations (all indicators use only past data)
3. Entry/exit timestamps are correctly modeled (next-bar execution)
4. Fees and slippage are applied as defined in EXECUTION_MODEL.md
5. Bar data has been validated against raw exchange data

---

## Walk-Forward Failure Modes

| Failure Mode | Description | Action |
|-------------|-------------|--------|
| IS_OOS_SHARPE_COLLAPSE | OOS Sharpe < 0.5 * IS Sharpe | Flag as HIGH overfit risk; return to DRAFT |
| NEGATIVE_OOS_SHARPE | Any OOS window shows Sharpe < 0 | Fail immediately; NOT_ELIGIBLE |
| PARAMETER_INSTABILITY | Optimal params shift >50% between IS windows | Investigate; likely spurious |
| REGIME_FAILURE | Hack profitable in some regimes but not others | Document regime dependency |
| DATA_LEAKAGE | Evidence of look-ahead in feature construction | Invalidate; rebuild from scratch |

---

## Documentation Requirements

After completing walk-forward, document in TRIALS_LEDGER.md:
1. Window type used (Type A or B)
2. IS and OOS date ranges
3. IS and OOS Sharpe, drawdown, win rate per window
4. Best parameter set
5. Regime coverage achieved
6. Any failure modes encountered

---

## Walk-Forward Status Tracking

| hack_id | WF_Type | IS_Windows | OOS_Windows | OOS_Sharpe_Range | WF_Status |
|---------|---------|-----------|------------|-----------------|----------|
| H_ATR_SQUEEZE_BREAKOUT | B | 2 | 2 | [1.4, 1.6] | PASS |
| H_BB_SQUEEZE | B | 2 | 2 | [1.3, 1.5] | PASS |
| H_VWAP_REVERSAL | B | 2 | 2 | [1.5, 1.7] | PASS |
| H_VOLUME_SPIKE | B | 2 | 2 | [1.4, 1.6] | PASS |
| All DRAFT hacks | — | 0 | 0 | — | NOT_STARTED |
| All NEEDS_DATA hacks | — | 0 | 0 | — | BLOCKED |
