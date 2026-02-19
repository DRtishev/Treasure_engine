# SOURCES_POLICY.md — Data Sources Policy
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

This document defines the policy for all data sources used in EDGE_LAB. Every data source must be classified, audited, and documented before use in hypothesis testing or live deployment.

---

## Source Classification Tiers

### Tier 1 — TRUE_DATA (Gold Standard)
**Definition:** Exchange-native data fetched directly via official API, verifiable against raw market feed.

| Source | Provider | Data Type | Update Freq | SLA |
|--------|---------|-----------|-------------|-----|
| OHLCV 1m-1d | Binance REST API | Price/Volume | Real-time | 99.9% |
| OHLCV spot | Binance WebSocket | Price/Volume | Real-time | 99.5% |
| Trade tapes | Binance /api/v3/trades | Individual trades | Real-time | 99.5% |
| Klines history | Binance /api/v3/klines | Historical OHLCV | On-demand | 99.9% |

**Validation Requirements:**
- Must validate against 2+ independent sources for initial calibration
- Gap detection: alert if > 3 consecutive missing bars
- Staleness threshold: data older than 2x bar period triggers STALE alert
- Checksums computed on raw API response before parsing

### Tier 2 — PROXY_DATA (Approximation)
**Definition:** Derived or computed data that approximates a real market quantity we cannot directly observe.

| Proxy | Real Quantity Approximated | Construction Method | Known Failure Modes |
|-------|--------------------------|-------------------|-------------------|
| Low-volume bars as liquidity voids | L2 order book gaps | Volume < 10% of 20-bar MA | Time-of-day patterns, thin hours |
| OBV as directional flow | Aggressor-side net volume | Cumulative signed volume by close direction | Doji ambiguity, large vs small orders |
| Price range as volatility proxy | Realized volatility | High-Low / Close | Intraday gaps not captured |

**Proxy Acceptance Criteria:**
- Must document construction method in hack's proxy_definition field
- Must document all known failure modes in hack's proxy_failure_modes field
- Must show correlation > 0.6 with the real quantity where verifiable (e.g., using short test periods with real data)
- Must be reviewed and approved by a second operator before use in TESTING status
- OOS results with proxy must show stability across different market regimes

### Tier 3 — EXTERNAL (Third-Party Sources)
**Definition:** Data from external providers not operated by the Treasure Engine team.

| Source | Data Type | Provider | Reliability | Acquisition Status |
|--------|-----------|---------|------------|-------------------|
| Funding rates | Perpetual swap funding | Binance /fapi/v1/fundingRate | High | NOT ACQUIRED |
| Open interest | OI history | Binance /fapi/v1/openInterestHist | High | NOT ACQUIRED |
| Liquidations | Force orders | Binance /fapi/v1/allForceOrders | Medium | NOT ACQUIRED |
| Fear & Greed | Sentiment index | Alternative.me API | Medium | NOT ACQUIRED |
| On-chain data | Blockchain metrics | Glassnode (paid) | Medium | NOT ACQUIRED |

**External Source Requirements:**
- Must have documented API contract before use
- Must have a fallback or degradation policy if source goes offline
- Must be included in DATASET_CONTRACT.md before hypothesis can exit NEEDS_DATA status
- SLA must be defined: acceptable latency, acceptable data gap duration

---

## Data Quality Standards

### Completeness
- OHLCV data must have < 0.1% missing bars over any 30-day period
- External data must have < 1% missing data points over any 7-day period
- Proxy data inherits completeness requirements of its underlying OHLCV data

### Accuracy
- OHLCV prices must match exchange reference within 0.01%
- Volume figures must match within 0.1% (rounding differences acceptable)
- Timestamps must be within ±1 second of exchange server time

### Consistency
- No look-ahead bias: data timestamps must reflect when data was AVAILABLE, not when events occurred
- Bar close time must equal open time of next bar (no gaps or overlaps)
- Adjustment policy: splits, delistings, and token migrations must be documented

---

## Source Onboarding Process

1. **Propose:** Operator files RESEARCH_INTAKE.md entry with source details
2. **Contract:** Add to DATASET_CONTRACT.md with SLA and schema
3. **Validate:** Run data quality checks (completeness, accuracy, consistency)
4. **Certify:** Mark source as certified in this SOURCES_POLICY.md
5. **Monitor:** Add source to SLO_SLI.md monitoring dashboard

---

## Prohibited Data Practices

1. **No look-ahead bias:** Never use data that would not have been available at the time of the trading signal
2. **No survivorship bias:** Historical universe must include delisted and failed instruments
3. **No adjusted data without disclosure:** Price-adjusted series must be clearly labeled; raw unadjusted data must be retained
4. **No data mining on OOS data:** Out-of-sample periods are reserved; never use OOS data for parameter selection
5. **No undocumented proxies:** All proxy constructions must be documented before use

---

## Source Audit Schedule

| Audit Type | Frequency | Owner |
|-----------|----------|-------|
| OHLCV completeness check | Daily | edge:sources script |
| API contract review | Monthly | Operator |
| Proxy correlation re-validation | Quarterly | Operator |
| External source SLA review | Monthly | Operator |
| Full policy review | Semi-annually | Team |
