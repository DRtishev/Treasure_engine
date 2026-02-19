# REASON_CODES.md — Reason Codes Reference
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Canonical list of reason codes used when a hack is blocked, failed, or needs attention. Reason codes are referenced in the hack's `reason_code` field in HACK_REGISTRY.md.

---

## Reason Codes

### Data-Related Codes

| Code | Name | Description |
|------|------|-------------|
| REASON_NO_DATA | No Data Available | Required data source does not exist or has not been acquired |
| REASON_PROXY_ONLY | Proxy Data Only | Real data unavailable; proxy is acceptable substitute |
| REASON_PROXY_POOR_FIT | Proxy Poor Fit | Proxy correlation < 0.4 with real quantity; proxy not acceptable |
| REASON_DATA_QUALITY | Data Quality Failure | Historical data fails quality checks (gaps, anomalies, etc.) |
| REASON_DATA_STALE | Data Staleness | Data source is too stale for reliable hypothesis testing |
| REASON_DATA_SHORT | Insufficient History | Not enough historical data to complete walk-forward protocol |
| REASON_SURVIVORSHIP_BIAS | Survivorship Bias | Historical universe contains only surviving instruments |

### Overfitting Codes

| Code | Name | Description |
|------|------|-------------|
| REASON_OVERFIT_IS_OOS_COLLAPSE | IS-OOS Sharpe Collapse | OOS Sharpe < 50% of IS Sharpe; high overfit probability |
| REASON_OVERFIT_LOW_DOF | Low Degrees of Freedom | Too many parameters relative to trade count |
| REASON_OVERFIT_NEGATIVE_OOS | Negative OOS Sharpe | Strategy loses money on out-of-sample data |
| REASON_OVERFIT_INCONSISTENT_OOS | Inconsistent OOS | OOS performance inconsistent across periods |
| REASON_OVERFIT_NO_TRIALS | No Optimization Trials | Hack promoted without any documented optimization |
| REASON_OVERFIT_PARAM_INSTABLE | Parameter Instability | Optimal parameters shift >50% between IS windows |
| REASON_OVERFIT_HIGH_PBO | High PBO | Probability of Backtest Overfitting > 70% |

### Execution Codes

| Code | Name | Description |
|------|------|-------------|
| REASON_EXEC_NOT_VIABLE | Not Execution-Viable | Strategy unprofitable at baseline execution costs |
| REASON_EXEC_SENSITIVE | High Execution Sensitivity | ESS < 40%; strategy requires nearly zero friction |
| REASON_EXEC_FREQ_TOO_HIGH | Trade Frequency Too High | Fees erode edge; reduce frequency or increase edge |
| REASON_EXEC_LATENCY | Latency-Sensitive | Signal stale before execution in realistic latency conditions |
| REASON_EXEC_LIQUIDITY | Liquidity Constraint | Strategy requires more liquidity than is realistically available |

### Risk Codes

| Code | Name | Description |
|------|------|-------------|
| REASON_RISK_DRAWDOWN | Excessive Drawdown | Max drawdown exceeds acceptable threshold in OOS testing |
| REASON_RISK_CONSISTENCY | P&L Inconsistency | Large variance in returns makes risk management unreliable |
| REASON_RISK_CORRELATED | Portfolio Correlation | Strategy too correlated with existing portfolio for diversification |
| REASON_RISK_LEVERAGE | Implicit Leverage Risk | Strategy's volatility requires excessive leverage to achieve targets |

### Red Team Codes

| Code | Name | Description |
|------|------|-------------|
| REASON_RT_LIQUIDITY_FAIL | Liquidity Crisis Failure | Does not survive 10x slippage + 40% fill rate scenario |
| REASON_RT_DATA_GAP_FAIL | Data Gap Failure | System places trades during data gaps; integrity violation |
| REASON_RT_EXEC_LAG_FAIL | Execution Lag Failure | Signal stale after realistic latency; edge eliminated |
| REASON_RT_VOL_CRUSH_FAIL | Volatility Crush Failure | Excessive drawdown during volatility crush regime |
| REASON_RT_CORR_BREAK_FAIL | Correlation Break Failure | Edge depends on historical correlations that may not persist |
| REASON_RT_REGIME_FAIL | Regime Change Failure | OOS data does not include required regime diversity |

### Infrastructure/Process Codes

| Code | Name | Description |
|------|------|-------------|
| REASON_MISSING_DOC | Missing Documentation | Required documentation (proxy_definition, etc.) not provided |
| REASON_SCHEMA_VIOLATION | Schema Violation | Hack entry does not comply with HACK_SCHEMA.md |
| REASON_HYPOTHESIS_UNFALSIFIABLE | Unfalsifiable Hypothesis | Hypothesis cannot be tested or proven wrong |
| REASON_DUPLICATE | Duplicate Hypothesis | Substantially identical to an existing hack in registry |
| REASON_INCOMPLETE_SPEC | Incomplete Specification | Entry/exit logic not fully specified |

### Operational Codes

| Code | Name | Description |
|------|------|-------------|
| REASON_OPERATOR_BLOCKED | Operator Blocked | Manually blocked by operator pending investigation |
| REASON_REGULATORY | Regulatory Constraint | Strategy prohibited by applicable regulations |
| REASON_DEPRECATED | Deprecated | Strategy superseded by improved version; archived |
| REASON_MARKET_STRUCTURE | Market Structure Change | Edge eliminated by permanent market structure change |

---

## Using Reason Codes

In HACK_REGISTRY.md, assign reason_code when:
1. status == NOT_ELIGIBLE → REQUIRED (must have reason_code)
2. status == NEEDS_DATA → Use REASON_NO_DATA or REASON_DATA_SHORT
3. status == DRAFT with proxy → Use REASON_PROXY_ONLY (informational)
4. OPERATOR_BLOCKED → Use REASON_OPERATOR_BLOCKED

Multiple reason codes can be assigned, separated by comma:
```
reason_code: REASON_OVERFIT_NEGATIVE_OOS, REASON_EXEC_SENSITIVE
```

---

## Reason Code to Action Mapping

| Code Category | Required Action |
|--------------|----------------|
| Data-Related | Update DATASET_CONTRACT.md; acquire data or validate proxy |
| Overfitting | Return to DRAFT; re-examine hypothesis and params |
| Execution | Revise strategy for higher edge or lower trade frequency |
| Risk | Adjust position sizing; add risk filters |
| Red Team | Implement suggested mitigations; re-run red team |
| Infrastructure | Complete missing documentation; fix schema violations |
| Operational | Await operator decision |
