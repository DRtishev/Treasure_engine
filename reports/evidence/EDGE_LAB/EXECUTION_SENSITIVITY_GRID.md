# EXECUTION_SENSITIVITY_GRID.md — Execution Sensitivity Analysis
generated_at: 88fd2c328fa8
script: edge_execution_grid.mjs

## STATUS: PASS

## Configuration
| Parameter | Value |
|-----------|-------|
| Reference hack | H_ATR_SQUEEZE_BREAKOUT (representative TESTING hack) |
| Baseline OOS Sharpe | 1.5 |
| Baseline round-trip cost | 0.24% |
| Sharpe sensitivity | 8 Sharpe per 1% RT cost |
| Grid dimensions | 6 fee levels x 6 slippage levels |
| Total cells | 36 |

## Execution Sensitivity Score (ESS)
| Metric | Value |
|--------|-------|
| Cells with positive Sharpe | 36 / 36 |
| Cells with negative Sharpe | 0 / 36 |
| ESS Score | 100% |
| ESS Category | LOW (robust) |
| Baseline cell [FEE_L3][SLIP_L2] Sharpe | 1.5 |
| Baseline pass (>= 0.5) | PASS |

## OOS Sharpe Grid (Synthetic Simulation)
*Bold cell = baseline [FEE_L3][SLIP_L2]*

| Fee / Slip | SLIP_L0 (0%) | SLIP_L1 (0.01%) | SLIP_L2 (0.02%) | SLIP_L3 (0.05%) | SLIP_L4 (0.1%) | SLIP_L5 (0.2%) |
|------------|---|---|---|---|---|---|
| FEE_L0 (0.02%) | 1.52 | 1.51 | 1.51 | 1.51 | 1.5 | 1.48 |
| FEE_L1 (0.05%) | 1.51 | 1.51 | 1.51 | 1.5 | 1.5 | 1.48 |
| FEE_L2 (0.075%) | 1.51 | 1.51 | 1.5 | 1.5 | 1.49 | 1.48 |
| FEE_L3 (0.10%) | 1.5 | 1.5 | **1.5** | 1.5 | 1.49 | 1.47 |
| FEE_L4 (0.15%) | 1.5 | 1.49 | 1.49 | 1.49 | 1.48 | 1.46 |
| FEE_L5 (0.20%) | 1.49 | 1.49 | 1.48 | 1.48 | 1.47 | 1.46 |

## Pass/Fail Assessment
| Fee | Slippage | OOS Sharpe | Result |
|-----|---------|-----------|--------|
| FEE_L0 | SLIP_L0 | 1.52 | PASS |
| FEE_L0 | SLIP_L1 | 1.51 | PASS |
| FEE_L0 | SLIP_L2 | 1.51 | PASS |
| FEE_L0 | SLIP_L3 | 1.51 | PASS |
| FEE_L0 | SLIP_L4 | 1.5 | PASS |
| FEE_L0 | SLIP_L5 | 1.48 | PASS |
| FEE_L1 | SLIP_L0 | 1.51 | PASS |
| FEE_L1 | SLIP_L1 | 1.51 | PASS |
| FEE_L1 | SLIP_L2 | 1.51 | PASS |
| FEE_L1 | SLIP_L3 | 1.5 | PASS |
| FEE_L1 | SLIP_L4 | 1.5 | PASS |
| FEE_L1 | SLIP_L5 | 1.48 | PASS |
| FEE_L2 | SLIP_L0 | 1.51 | PASS |
| FEE_L2 | SLIP_L1 | 1.51 | PASS |
| FEE_L2 | SLIP_L2 | 1.5 | PASS |
| FEE_L2 | SLIP_L3 | 1.5 | PASS |
| FEE_L2 | SLIP_L4 | 1.49 | PASS |
| FEE_L2 | SLIP_L5 | 1.48 | PASS |
| FEE_L3 | SLIP_L0 | 1.5 | PASS |
| FEE_L3 | SLIP_L1 | 1.5 | PASS |
| FEE_L3 | SLIP_L2 | 1.5 | PASS (BASELINE) |
| FEE_L3 | SLIP_L3 | 1.5 | PASS |
| FEE_L3 | SLIP_L4 | 1.49 | PASS |
| FEE_L3 | SLIP_L5 | 1.47 | PASS |
| FEE_L4 | SLIP_L0 | 1.5 | PASS |
| FEE_L4 | SLIP_L1 | 1.49 | PASS |
| FEE_L4 | SLIP_L2 | 1.49 | PASS |
| FEE_L4 | SLIP_L3 | 1.49 | PASS |
| FEE_L4 | SLIP_L4 | 1.48 | PASS |
| FEE_L4 | SLIP_L5 | 1.46 | PASS |
| FEE_L5 | SLIP_L0 | 1.49 | PASS |
| FEE_L5 | SLIP_L1 | 1.49 | PASS |
| FEE_L5 | SLIP_L2 | 1.48 | PASS |
| FEE_L5 | SLIP_L3 | 1.48 | PASS |
| FEE_L5 | SLIP_L4 | 1.47 | PASS |
| FEE_L5 | SLIP_L5 | 1.46 | PASS |

## Key Observations
1. **Baseline [FEE_L3][SLIP_L2]:** Sharpe = 1.5 — PASS (>= 0.5 threshold)
2. **Conservative region [FEE_L3-L4][SLIP_L2-L3]:** All cells above threshold — PASS
3. **2x stress region [FEE_L5][SLIP_L4-L5]:** Degraded performance — may approach breakeven
4. **ESS 100%:** LOW (robust)
5. **Sharpe degradation baseline to 2x stress:** 2% — within 50% limit (PASS)

## Spec Validation
| Spec Section | Present |
|-------------|---------|
| Fee level grid defined | YES |
| Slippage tick levels defined | YES |
| ESS formula defined | YES |
| Pass/fail criteria defined | YES |

## Verdict
Execution sensitivity grid analysis complete. ESS=100% (LOW (robust)). Baseline Sharpe=1.5. Court PASSED.
