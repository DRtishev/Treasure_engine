# EXECUTION_REALITY_POLICY.md — Execution Reality Court Policy

epoch: PROFIT_CANDIDATES_EXECUTION_COURTS_V1
version: 1.0.0
last_updated: 2026-02-20

## Purpose

Defines the execution reality stress-test specification applied to each profit candidate.
This is NOT a backtest. This is a formal robustness gate testing whether a candidate's
assumed edge survives realistic execution cost assumptions.

Numbers marked SOURCE: measured are from EXECUTION_MODEL.md (evidence-based).
Numbers marked PROXY: are declared proxies requiring PROXY_VALIDATION coverage.

---

## 1. Fee Model

SOURCE: measured — from EXECUTION_MODEL.md v1.0.0.

| Parameter | Value | Notes |
|-----------|-------|-------|
| fee_rate_entry | 0.10% | Taker fee, Binance Spot default |
| fee_rate_exit | 0.10% | Taker fee, Binance Spot default |
| round_trip_fee | 0.20% | Entry + exit, conservative (taker both sides) |

---

## 2. Slippage Model Buckets

SOURCE: measured — from EXECUTION_MODEL.md v1.0.0.

| Instrument Class | Default Slippage (per side) | Max Slippage |
|-----------------|----------------------------|--------------|
| Ultra-liquid (BTCUSDT) | 0.02% | 0.10% |
| Highly liquid (ETHUSDT) | 0.03% | 0.15% |
| Liquid (SOLUSDT, BNBUSDT) | 0.05% | 0.25% |
| Default (all others) | 0.10% | 0.50% |

**Backtest default per side:** 0.05%
**Total round-trip slippage:** 0.10% (2 × 0.05%)

---

## 3. Total Round-Trip Cost Baseline

SOURCE: measured — computed from fee + slippage above.

```
round_trip_cost_baseline = 2*fee_rate + 2*slippage_default
                         = 2*0.10% + 2*0.05%
                         = 0.20% + 0.10%
                         = 0.30%
```

---

## 4. Latency Budget

SOURCE: measured — from EXECUTION_MODEL.md v1.0.0.

| Environment | Latency | Verdict |
|-------------|---------|---------|
| Co-located server | 5ms | ELIGIBLE |
| Cloud VPS (same region) | 50ms | ELIGIBLE |
| Cloud VPS (different region) | 200ms | ELIGIBLE |
| Home internet | 500ms | PAPER_ONLY |

**Execution assumption:** 100ms signal-to-order latency (bar-close signal → next bar open).
**Effect:** Entry price = next_bar_open ± slippage. Look-ahead bias: NONE.

---

## 5. Partial Fill Assumptions

SOURCE: measured — from EXECUTION_MODEL.md v1.0.0.

| Order Type | Fill Assumption |
|------------|----------------|
| Market order | 100% fill at slippage cost |
| Limit order at mid | 50% fill probability |
| Limit 1 tick inside | 75% fill probability |
| Large order (>2% daily vol) | Split across 4 bars |

---

## 6. Proxy Expectancy Declaration

PROXY: The following expectancy value is a structural proxy, not a measured backtest result.
It is declared formally and must be validated against actual walk-forward results before
any PASS status can be granted for ELIGIBLE_FOR_PAPER.

```
proxy_expectancy_pct = 0.50%
  Source: Conservative structural estimate for OHLCV momentum strategies
          with positive walk-forward OOS results (≥2 OOS periods).
  PROXY_VALIDATION reference: EDGE_LAB/PROXY_VALIDATION.md
  Revalidation trigger: On completion of first paper trading epoch.
```

---

## 7. Stress Test Grid

The following multiplier grid is applied to round_trip_cost_baseline:

| fee_multiplier | Effective Round-Trip Cost | Stress Level |
|---------------|--------------------------|--------------|
| 1.0x | 0.30% | Baseline |
| 1.25x | 0.375% | Light stress |
| 1.5x | 0.45% | Moderate stress |
| 1.75x | 0.525% | Heavy stress |
| 2.0x | 0.60% | Max stress (required threshold) |
| 3.0x | 0.90% | Extreme (informational) |

Slippage multiplier grid (applied independently):

| slippage_multiplier | Per-side slippage | Total slippage |
|--------------------|------------------|----------------|
| 1.0x | 0.05% | 0.10% |
| 1.5x | 0.075% | 0.15% |
| 2.0x | 0.10% | 0.20% |
| 3.0x | 0.15% | 0.30% |

Latency buckets: [100ms, 300ms, 500ms]
Partial fill rates: [100%, 90%, 75%]

---

## 8. Breakpoint Definition

A candidate's **breakpoint_fee_mult** is the fee multiplier at which net_edge_proxy <= 0:

```
net_edge_proxy(mult) = proxy_expectancy_pct - round_trip_cost_baseline * mult
breakpoint_fee_mult  = proxy_expectancy_pct / round_trip_cost_baseline
                     = 0.50% / 0.30%
                     = 1.667x
```

---

## 9. PASS / BLOCKED Thresholds

| Condition | Verdict |
|-----------|---------|
| breakpoint_fee_mult >= 2.0 AND proxy_expectancy validated | ELIGIBLE_FOR_PAPER |
| breakpoint_fee_mult >= 2.0 AND proxy_expectancy NOT validated | NEEDS_DATA |
| breakpoint_fee_mult < 2.0 AND proxy_expectancy NOT validated | NEEDS_DATA |
| breakpoint_fee_mult < 2.0 AND proxy_expectancy validated | NOT_ELIGIBLE_FOR_PAPER |
| Policy file missing or unparseable | BLOCKED |

**Current state:** proxy_expectancy = PROXY (not yet validated from paper trading) → NEEDS_DATA.

The expectancy must stay > 0 under 2x fee+slippage stress before ELIGIBLE_FOR_PAPER can be declared.
This is a strict gate: no optimism allowed without measured evidence.

---

## 10. MCL Notes

FRAME: Does the candidate survive execution reality under stress? Court answers with proxy, not fantasy.
RISKS: Proxy expectancy too optimistic — mitigation: conservative 0.50% chosen, must be validated.
CONTRACT: edge_execution_reality.mjs reads this file, applies grid, writes EXECUTION_REALITY_COURT.md + EXECUTION_BREAKPOINTS.md + execution_reality_court.json.
MIN-DIFF: Reuses EXECUTION_MODEL.md numbers. Only new element is proxy_expectancy_pct.
RED-TEAM: Inflating proxy_expectancy to make breakpoint_fee_mult >= 2.0 → PROXY_VALIDATION gate blocks.
PROOF: Run npm run edge:execution:reality; expect STATUS=NEEDS_DATA (honest: proxy not validated).
