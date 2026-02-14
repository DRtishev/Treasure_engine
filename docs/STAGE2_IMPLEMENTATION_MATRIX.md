<a id="stage2-implementation-matrix"></a>

# STAGE2 Implementation Matrix (Derived)

Source of truth: `specs/wow/WOW_LEDGER.json`.

| ID | Title | Status | Layer | Epochs | Gates | Card |
| --- | --- | --- | --- | --- | --- | --- |
| WOW-01 | Point-in-Time Feature Store с Temporal Join Engine | SHIPPED | DATA | 31 | `verify:epoch31`, `verify:edge` | [card](../specs/wow/items/WOW-01.md) |
| WOW-02 | Order Flow Imbalance Features (OFI) из L2 Snapshots | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-03 | Адаптивная модель микроструктуры с калибровкой по реальным fills (MOONSHOT) | SHIPPED | EXECUTION | 50 | `verify:epoch50`, `verify:treasure` | [card](../specs/wow/items/WOW-03.md) |
| WOW-04 | Partial Fill Simulator с Liquidity Buckets | SHIPPED | EXECUTION | 42 | `verify:epoch42`, `verify:edge` | [card](../specs/wow/items/WOW-04.md) |
| WOW-05 | Latency-Aware Signal Freshness Engine | SHIPPED | EXECUTION | 42 | `verify:epoch42`, `verify:edge` | [card](../specs/wow/items/WOW-05.md) |
| WOW-06 | Cross-Venue Feature Divergence Detector | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-07 | Regime Detection Engine: HMM + Vol Clustering (MOONSHOT) | STAGED | EDGE | - | `verify:specs` | [card](../specs/wow/items/WOW-07.md) |
| WOW-08 | Funding Rate Alpha с Decay-Adjusted Carry | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-09 | Volatility Surface Features (IV Skew + Term Structure) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-10 | Smart Execution Router с TWAP/VWAP Fallback | STAGED | EDGE | - | `verify:specs` | [card](../specs/wow/items/WOW-10.md) |
| WOW-11 | Feature Importance Drift Detector | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-12 | Dynamic Fee Model с Exchange-Specific Calibration | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-13 | Multi-Symbol Correlation Feature Engine | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-14 | CPCV (Combinatorial Purged Cross-Validation) Pipeline (MOONSHOT) | SHIPPED | EDGE | 43 | `verify:epoch43`, `verify:edge` | [card](../specs/wow/items/WOW-14.md) |
| WOW-15 | Deflated Sharpe Ratio (DSR) Gate | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-16 | Walk-Forward Anchored Backtesting (WFAB) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-17 | Transaction Cost Sensitivity Analysis | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-18 | Multi-Horizon Signal Ensemble с Confidence Decay (MOONSHOT) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-19 | Synthetic Stress Scenario Generator | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-20 | Drawdown Speed Monitor с Early Warning | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-21 | Correlation Breakdown Detector для Portfolio Risk | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-22 | Anti-Blowup Shield: Drawdown-Conditional Dynamic Sizing (MOONSHOT) | SHIPPED | RISK | 44 | `verify:epoch44`, `verify:edge` | [card](../specs/wow/items/WOW-22.md) |
| WOW-23 | Tail Risk Budget с Conditional VaR (CVaR) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-24 | Maximum Loss Governor (Hard Stop per-Trade + per-Day + per-Week) | SHIPPED | RISK | 44 | `verify:epoch44`, `verify:edge` | [card](../specs/wow/items/WOW-24.md) |
| WOW-25 | PnL Attribution Engine (Decomposition: Alpha + Beta + Costs + Slippage) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-26 | Hypothesis Generator Agent (Automated Feature Discovery) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-27 | Leakage Sentinel Agent (Automated Leakage Hunting) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-28 | WFO Orchestrator Agent (Parallel Walk-Forward Executor) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-29 | Risk Governor Agent (Automated Risk State Management) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-30 | Leakage Sentinel v3: Automated Fuzzing Pipeline (MOONSHOT) | SHIPPED | CANARY | 38 | `verify:epoch38`, `verify:edge` | [card](../specs/wow/items/WOW-30.md) |
| WOW-31 | Data Provenance Chain Agent | STAGED | EDGE | - | `verify:specs` | [card](../specs/wow/items/WOW-31.md) |
| WOW-32 | Evidence Packager Agent (Automated Gate Report Generation) | SHIPPED | RELEASE | 48 | `evidence:pack:epoch`, `verify:ledger` | [card](../specs/wow/items/WOW-32.md) |
| WOW-33 | Red-Team Agent (Adversarial Strategy Tester) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-34 | Microstructure Calibrator Agent (Sim↔Shadow Alignment) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-35 | AI Research Agent Mesh с детерминистичным воспроизведением (MOONSHOT) | SHIPPED | EDGE | 45 | `verify:epoch45`, `verify:edge` | [card](../specs/wow/items/WOW-35.md) |
| WOW-36 | Anomaly Detection Agent (Market + System Anomalies) | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-37 | Strategy Performance Decay Predictor | PROPOSED | EDGE | - | `verify:specs` | - |
| WOW-38 | Governance Automation Agent (Policy Enforcement) | PROPOSED | EDGE | - | `verify:specs` | - |

Generated deterministically from SSOT; do not edit manually.
