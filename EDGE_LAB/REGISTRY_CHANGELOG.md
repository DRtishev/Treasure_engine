# REGISTRY_CHANGELOG.md — Edge Hypothesis Registry Changelog
version: 1.0.0

All notable changes to the HACK_REGISTRY are documented here.
Format: [DATE] [ACTION] [hack_id] — [description] — [operator]

---

## Changelog

### 2026-02-19 — Initial Registry Population

**Action: CREATED** — Initial registry established with 20 hacks

| # | hack_id | Action | Prior Status | New Status | Notes |
|---|---------|--------|-------------|-----------|-------|
| 1 | H_ATR_SQUEEZE_BREAKOUT | CREATED | — | TESTING | 47 trials completed; 2 OOS periods validated |
| 2 | H_BB_SQUEEZE | CREATED | — | TESTING | 38 trials completed; 2 OOS periods validated |
| 3 | H_VWAP_REVERSAL | CREATED | — | TESTING | 52 trials completed; OOS Q3+Q4 2024 validated |
| 4 | H_VOLUME_SPIKE | CREATED | — | TESTING | 41 trials completed; H1+H2 2024 validated |
| 5 | H_VOLUME_CLIMAX | CREATED | — | DRAFT | No trials yet; hypothesis documented |
| 6 | H_MM_TRAP_FALSE_BREAK | CREATED | — | DRAFT | No trials yet; hypothesis documented |
| 7 | H_LIQUIDITY_VOID_PROXY | CREATED | — | DRAFT | PROXY_DATA: L2 orderbook unavailable; proxy constructed |
| 8 | H_OBV_DIVERGENCE | CREATED | — | DRAFT | PROXY_DATA: aggressor-side volume unavailable |
| 9 | H_EQUITY_CURVE_THROTTLE | CREATED | — | DRAFT | Meta-strategy filter; depends on base strategy |
| 10 | H_FUNDING_TIMING | CREATED | — | NEEDS_DATA | EXTERNAL: perpetual funding rate feed not yet acquired |
| 11 | H_RSI_DIVERGENCE | CREATED | — | DRAFT | Classic RSI divergence; no trials yet |
| 12 | H_MACD_CROSS | CREATED | — | DRAFT | MACD cross with volume filter; no trials yet |
| 13 | H_RANGE_COMPRESSION | CREATED | — | DRAFT | Daily range compression breakout; no trials yet |
| 14 | H_TREND_CONTINUATION | CREATED | — | DRAFT | EMA pullback entry; no trials yet |
| 15 | H_MEAN_REVERSION | CREATED | — | DRAFT | Z-score mean reversion; no trials yet |
| 16 | H_GAP_FILL | CREATED | — | DRAFT | Gap fill reversion; no trials yet |
| 17 | H_BREAKOUT_RETEST | CREATED | — | DRAFT | Breakout retest entry; no trials yet |
| 18 | H_OPEN_INTEREST_SURGE | CREATED | — | NEEDS_DATA | EXTERNAL: OI feed not yet acquired |
| 19 | H_LIQUIDATION_CASCADE | CREATED | — | NEEDS_DATA | EXTERNAL: liquidation feed not yet acquired |
| 20 | H_SENTIMENT_EXTREME | CREATED | — | NEEDS_DATA | EXTERNAL: Fear & Greed feed not yet acquired |

**Operator:** EDGE_LAB_SYSTEM
**Schema Version:** 1.0.0

---

## Changelog Format Reference

Each entry must include:
- **Date:** ISO date (YYYY-MM-DD)
- **Action:** CREATED / STATUS_CHANGE / PARAM_UPDATE / ARCHIVED / REASON_ADDED
- **hack_id:** The affected hack
- **Prior Status:** Previous status (— if new)
- **New Status:** Updated status
- **Notes:** Brief explanation
- **Operator:** Person or system making the change

## Allowed Actions
- `CREATED`: New hack added to registry
- `STATUS_CHANGE`: Status transition (must follow valid transitions from HACK_SCHEMA.md)
- `PARAM_UPDATE`: Parameter values modified
- `HYPOTHESIS_REVISION`: Core hypothesis changed (resets trials_count to 0)
- `ARCHIVED`: Hack removed from active consideration
- `REASON_ADDED`: reason_code assigned to blocked/failed hack
- `OOS_ADDED`: New out-of-sample period tested
- `TRIALS_UPDATE`: trials_count updated after optimization run
