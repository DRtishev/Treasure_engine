# EXECUTION_SENSITIVITY_SPEC.md — Execution Sensitivity Grid Specification
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Defines the parameter grid used in execution sensitivity analysis. Each hack must demonstrate positive expectancy across all grid cells (or at minimum, the conservative region) to achieve ELIGIBLE status.

---

## Grid Definition

### Dimension 1: Fee Rate (per side)

| Level | Fee Rate | Description |
|-------|----------|-------------|
| FEE_L0 | 0.02% (0.0002) | Best-case: maker order, BNB discount |
| FEE_L1 | 0.05% (0.0005) | Typical futures taker |
| FEE_L2 | 0.075% (0.00075) | BNB spot taker |
| FEE_L3 | 0.10% (0.001) | Standard spot taker (BASELINE) |
| FEE_L4 | 0.15% (0.0015) | Elevated: 1.5x baseline |
| FEE_L5 | 0.20% (0.002) | Stress: 2x baseline |

### Dimension 2: Slippage (per side, in ticks)

| Level | Slippage (ticks) | Approx % (BTCUSDT) | Description |
|-------|-----------------|-------------------|-------------|
| SLIP_L0 | 0 ticks | 0.00% | Theoretical no-slip |
| SLIP_L1 | 1 tick | ~0.01% | Minimal realistic slippage |
| SLIP_L2 | 2 ticks | ~0.02% | Light slippage (BASELINE) |
| SLIP_L3 | 5 ticks | ~0.05% | Moderate slippage |
| SLIP_L4 | 10 ticks | ~0.10% | Heavy slippage |
| SLIP_L5 | 20 ticks | ~0.20% | Stress: extreme slippage |

**Note:** 1 tick = $1 for BTCUSDT at ~$50,000 price level → 0.002% per tick

### Dimension 3: Latency Impact (bar-close signal execution)

| Level | Execution Point | Description |
|-------|----------------|-------------|
| LAT_L0 | Exact bar close | Theoretical (look-ahead risk) |
| LAT_L1 | Next bar open | Standard (BASELINE) |
| LAT_L2 | Next bar open + 10% bar | Slight delay |
| LAT_L3 | Next bar + 1 full bar | Significant delay |

---

## Full Grid Matrix

For each hack, the sensitivity analysis runs all combinations of:
- Fee levels: FEE_L0 through FEE_L5 (6 levels)
- Slippage levels: SLIP_L0 through SLIP_L5 (6 levels)
- Total cells: 36 per latency level

**Primary grid (LAT_L1 = baseline latency):** 36 cells

### Cell Notation
`[FEE_Lx][SLIP_Ly]` — e.g., `[FEE_L3][SLIP_L2]` = baseline

### Primary Grid (Sharpe Ratio expected per cell)

```
         SLIP_L0  SLIP_L1  SLIP_L2  SLIP_L3  SLIP_L4  SLIP_L5
FEE_L0   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]
FEE_L1   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]
FEE_L2   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]
FEE_L3   [A][B]   [A][B]   [*][*]   [A][B]   [A][B]   [A][B]
FEE_L4   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]
FEE_L5   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]   [A][B]
[*] = baseline cell
[A] = IS Sharpe, [B] = OOS Sharpe
```

---

## Pass/Fail Criteria

### Hard Requirements
1. **Baseline cell [FEE_L3][SLIP_L2] must show OOS Sharpe > 0.5**
2. **Conservative region ([FEE_L3-L4][SLIP_L2-L3]) must all show OOS Sharpe > 0.3**
3. **Less than 20% of cells must show negative OOS Sharpe**

### Soft Requirements (advisory, not blocking)
4. **2x stress region ([FEE_L5][SLIP_L4-L5]) may show degraded but positive OOS Sharpe**
5. **Sharpe degradation from baseline to 2x stress must be < 50%**

---

## Execution Sensitivity Score

Each hack receives an Execution Sensitivity Score (ESS):

```
ESS = (cells_with_positive_oos_sharpe / total_cells) * 100

Interpretation:
  ESS >= 80: LOW execution sensitivity (robust)
  ESS 60-79: MEDIUM execution sensitivity (acceptable)
  ESS 40-59: HIGH execution sensitivity (flag for review)
  ESS < 40:  CRITICAL execution sensitivity (likely NOT_ELIGIBLE)
```

---

## Round-Trip Cost Grid (% of trade value)

Baseline: fee=0.10% each side, slippage=0.02% each side

| FEE_Level | SLIP_Level | Total Round-Trip % | ESS_Zone |
|-----------|-----------|-------------------|---------|
| FEE_L0 (0.02%) | SLIP_L0 (0%) | 0.04% | Ideal |
| FEE_L2 (0.075%) | SLIP_L1 (0.01%) | 0.17% | Low cost |
| FEE_L3 (0.10%) | SLIP_L2 (0.02%) | 0.24% | BASELINE |
| FEE_L3 (0.10%) | SLIP_L3 (0.05%) | 0.30% | Conservative |
| FEE_L4 (0.15%) | SLIP_L3 (0.05%) | 0.40% | Elevated |
| FEE_L5 (0.20%) | SLIP_L4 (0.10%) | 0.60% | Stress |
| FEE_L5 (0.20%) | SLIP_L5 (0.20%) | 0.80% | Extreme stress |

---

## Synthetic Sensitivity Grid Results (Illustrative)

The edge:execution:grid script runs a synthetic simulation across the above grid.
Results for a hypothetical hack with baseline Sharpe=1.5:

| Fee Level | Slip=0 ticks | Slip=1 tick | Slip=2 ticks | Slip=5 ticks | Slip=10 ticks | Slip=20 ticks |
|-----------|-------------|------------|-------------|-------------|--------------|--------------|
| 0.02% | 2.10 | 2.05 | 2.00 | 1.85 | 1.60 | 1.20 |
| 0.05% | 1.90 | 1.85 | 1.80 | 1.65 | 1.40 | 1.00 |
| 0.075% | 1.75 | 1.70 | 1.65 | 1.50 | 1.25 | 0.85 |
| 0.10% | 1.60 | 1.55 | 1.50 | 1.35 | 1.10 | 0.70 |
| 0.15% | 1.35 | 1.30 | 1.25 | 1.10 | 0.85 | 0.45 |
| 0.20% | 1.10 | 1.05 | 1.00 | 0.85 | 0.60 | 0.20 |

*Note: Real results populated by edge:execution:grid script using HACK_REGISTRY.md parameters*

---

## Frequency Sensitivity

Additionally, execution cost sensitivity scales with trade frequency:

| Trades/Month | Break-Even Round-Trip % | Notes |
|-------------|------------------------|-------|
| 5 | 2.00% | Very infrequent; high cost tolerance |
| 20 | 0.50% | Monthly active |
| 50 | 0.20% | Daily signals |
| 200 | 0.05% | High frequency |
| 500+ | 0.02% | Very high frequency |

For high-frequency hacks, even 0.10% round-trip may be too costly. Verify against trade frequency from TRIALS_LEDGER.md.
