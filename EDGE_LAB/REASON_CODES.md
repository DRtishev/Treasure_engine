# REASON_CODES.md — Reason Codes Reference
version: 2.0.0 | last_updated: 2026-02-20

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

### Court Pipeline Reason Codes (v5.0)

These codes appear in court JSON gates and .md files in `reports/evidence/EDGE_LAB/`.

#### Integrity Gate Codes

| Code | Gate | Meaning |
|------|------|---------|
| `NONE` | Any | Gate passed with no issues |
| `NONDETERMINISM` | DETERMINISM_X2, ANTI_FLAKE_INDEPENDENCE | Evidence files differ between two consecutive edge:all runs |
| `RAW_NONDETERMINISM` | RAW_STABILITY | Raw evidence (before normalization) is not stable |
| `CONTRACT_DRIFT` | CONTRACT_MANIFEST | Required evidence file missing from EVIDENCE_DIR |
| `EXTRA_EVIDENCE` | CONTRACT_MANIFEST | Unexpected file in EVIDENCE_DIR root scope |
| `LEDGER_MISMATCH` | LEDGER_CHECK, SHA256CHECK | SHA256 hash of evidence file doesn't match recorded value |

#### Data/Proof Gate Codes

| Code | Gate | Meaning |
|------|------|---------|
| `NO_PAPER_EVIDENCE` | PAPER_EVIDENCE | artifacts/incoming/paper_evidence.json not found |
| `JSON_PARSE_ERROR` | PAPER_EVIDENCE | paper_evidence.json is malformed JSON |
| `AJV_UNAVAILABLE` | PAPER_EVIDENCE | AJV library not installed (run npm install) |
| `SCHEMA_VALIDATION_FAILED` | PAPER_EVIDENCE | paper_evidence.json doesn't match PAPER_EVIDENCE_SPEC.md schema |
| `DATE_ORDER_INVALID` | PAPER_EVIDENCE | start_date > end_date |
| `UNKNOWN_CANDIDATE_NAMES` | PAPER_EVIDENCE | Candidate names not in PROFIT_CANDIDATES_V1.md |
| `INSUFFICIENT_TRADE_COUNT` | PAPER_EVIDENCE | trade_count < 30 for one or more candidates |

#### Execution Reality Codes

| Code | Gate | Meaning |
|------|------|---------|
| `PROXY_EXPECTANCY_UNVALIDATED` | EXECUTION_REALITY | Expectancy is PROXY; paper evidence required |
| `BREAKPOINT_THRESHOLD_NOT_MET` | EXECUTION_REALITY | MEASURED expectancy fails 2x fee stress threshold |
| `MISSING_POLICY` | EXECUTION_REALITY | EXECUTION_REALITY_POLICY.md not found |
| `POLICY_INCOMPLETE` | EXECUTION_REALITY | Policy missing required sections |

#### Promotion Gate Codes

| Code | Gate | Meaning |
|------|------|---------|
| `AMBIGUOUS_VERDICT` | VERDICT_STRATIFICATION | Core court did not return PASS |
| `UNVERIFIED_PROXY_ASSUMPTION` | PROXY_GUARD | Proxy language without PROXY_VALIDATION.md |
| `PROXY_VALIDATION_INCOMPLETE` | PROXY_GUARD | Proxy validation exists but is incomplete |
| `EXECUTION_DRIFT` | PAPER_COURT | Execution simulation exceeded drift thresholds |
| `SLI_BASELINE_MISSING` | SLI_BASELINE | SLI metrics out of range |
| `META_INTEGRITY_FAIL` | META_AUDIT | Meta-audit integrity check failed |
| `EDGE_LAB_TRUTH_BLOCKED` | FINAL_VERDICT | One or more gates blocked epoch promotion |

#### Profit Candidate Codes

| Code | Gate | Meaning |
|------|------|---------|
| `MISSING_CANDIDATES` | PROFIT_CANDIDATES_COURT | No candidates found in PROFIT_CANDIDATES_V1.md |
| `WRONG_FIELD_ORDER` | PROFIT_CANDIDATES_COURT | Candidate fields not in required order |
| `MISSING_REQUIRED_FIELD` | PROFIT_CANDIDATES_COURT | Required candidate field is absent |
| `NOT_SORTED_ALPHABETICALLY` | PROFIT_CANDIDATES_COURT | Candidates not sorted A→Z by NAME |
| `PROXY_VALIDATION_MISSING` | PROFIT_CANDIDATES_COURT | PROXY: field without PROXY_VALIDATION.md |

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
