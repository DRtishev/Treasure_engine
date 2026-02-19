# RESEARCH_INTAKE.md — Research Intake Template
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

This document is the entry point for proposing new edge hypotheses or new data sources into the EDGE_LAB system. Every new hack begins here.

---

## Part A: New Hypothesis Intake Form

Use this form to propose a new edge hypothesis. Copy the template, fill it out, and submit for review.

```
## INTAKE: [PROPOSED_HACK_ID]

### Submitter Information
- Submitter: [name / handle]
- Submission Date: [YYYY-MM-DD]
- Priority: [HIGH / MEDIUM / LOW]

### Hypothesis Summary
- Name: [Human-readable name]
- One-line claim: [If X then Y with edge Z, measured by W]
- Inspiration source: [academic paper / observation / practitioner report / other]
- Literature reference: [URL or citation if applicable]

### Falsifiability Criteria
- What would prove this hypothesis WRONG?
- What backtest result would lead you to reject it?

### Data Requirements
- dependency_class: [OHLCV / MTF / EXTERNAL]
- truth_tag: [TRUE_DATA / PROXY_DATA / UNAVAILABLE]
- Data sources needed: [list all]
- Are all required data sources currently available? [YES / NO]
- If NO, what is the acquisition plan?

### Preliminary Assessment
- Have you searched for prior research on this? [YES / NO]
- Summary of prior research findings: [summary or N/A]
- Expected edge magnitude: [rough Sharpe estimate]
- Expected edge frequency: [trades per month estimate]
- Key risks / failure modes: [list]

### Next Steps
- Proposed initial params: [key params with initial values]
- Suggested timeframes: [list]
- Suggested instruments: [list]
- Operator assignment: [who will run first trials]
```

---

## Part B: New Data Source Intake Form

Use this form to propose a new external data source.

```
## DATA SOURCE INTAKE: [SOURCE_NAME]

### Submitter Information
- Submitter: [name / handle]
- Submission Date: [YYYY-MM-DD]

### Source Details
- Provider: [company / API name]
- Data Type: [funding rate / OI / liquidations / sentiment / on-chain / other]
- Coverage: [instruments, date range, frequency]
- API Documentation URL: [URL]
- Cost: [free / paid, if paid: pricing tier]

### Quality Assessment
- Historical data availability: [from date to present]
- Update frequency: [real-time / daily / weekly]
- Documented SLA from provider: [uptime guarantee if any]
- Data format: [JSON / CSV / WebSocket / other]
- Authentication required: [API key / OAuth / none]

### Integration Plan
- Estimated integration effort: [hours]
- Which hacks will this unblock: [list hack_ids]
- Who will implement: [operator name]
- Target completion date: [YYYY-MM-DD]

### Risk Assessment
- What happens if this source goes offline? [degradation plan]
- Is there a backup source? [YES / NO, if YES: which?]
- Licensing / terms of service restrictions: [summary]
```

---

## Intake Log

| Date | Type | ID | Submitter | Status | Outcome |
|------|------|----|-----------|--------|---------|
| 2026-01-15 | HYPOTHESIS | H_ATR_SQUEEZE_BREAKOUT | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-01-15 | HYPOTHESIS | H_BB_SQUEEZE | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-01-20 | HYPOTHESIS | H_VWAP_REVERSAL | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-01-22 | HYPOTHESIS | H_VOLUME_SPIKE | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-01-25 | HYPOTHESIS | H_VOLUME_CLIMAX | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-01-28 | HYPOTHESIS | H_MM_TRAP_FALSE_BREAK | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-01 | HYPOTHESIS | H_LIQUIDITY_VOID_PROXY | EDGE_LAB_SYSTEM | ACCEPTED | Added with PROXY_DATA tag |
| 2026-02-03 | HYPOTHESIS | H_OBV_DIVERGENCE | EDGE_LAB_SYSTEM | ACCEPTED | Added with PROXY_DATA tag |
| 2026-02-05 | HYPOTHESIS | H_EQUITY_CURVE_THROTTLE | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-08 | HYPOTHESIS | H_FUNDING_TIMING | EDGE_LAB_SYSTEM | ACCEPTED | NEEDS_DATA; funding feed required |
| 2026-02-10 | HYPOTHESIS | H_RSI_DIVERGENCE | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-10 | HYPOTHESIS | H_MACD_CROSS | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-11 | HYPOTHESIS | H_RANGE_COMPRESSION | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-11 | HYPOTHESIS | H_TREND_CONTINUATION | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-12 | HYPOTHESIS | H_MEAN_REVERSION | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-12 | HYPOTHESIS | H_GAP_FILL | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-13 | HYPOTHESIS | H_BREAKOUT_RETEST | EDGE_LAB_SYSTEM | ACCEPTED | Added to HACK_REGISTRY.md |
| 2026-02-14 | HYPOTHESIS | H_OPEN_INTEREST_SURGE | EDGE_LAB_SYSTEM | ACCEPTED | NEEDS_DATA; OI feed required |
| 2026-02-14 | HYPOTHESIS | H_LIQUIDATION_CASCADE | EDGE_LAB_SYSTEM | ACCEPTED | NEEDS_DATA; liquidation feed required |
| 2026-02-14 | HYPOTHESIS | H_SENTIMENT_EXTREME | EDGE_LAB_SYSTEM | ACCEPTED | NEEDS_DATA; Fear & Greed feed required |

---

## Review Criteria

A hypothesis intake is accepted if:
1. The hypothesis is falsifiable (can be proven wrong by data)
2. The entry and exit logic are fully specified (no ambiguity)
3. The required data sources are identified
4. The timeframes and instruments are specified
5. No duplicate of an existing hypothesis in the registry

A hypothesis intake is rejected if:
1. It duplicates an existing hack without meaningful differentiation
2. The hypothesis is not falsifiable ("price goes up when conditions are favorable")
3. Required data cannot be acquired in any form (not even as proxy)
4. The submitter has not identified at least two instruments for testing
