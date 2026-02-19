# RED_TEAM_PLAYBOOK.md — Red Team Attack Scenarios
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Defines adversarial scenarios used to stress-test each edge hypothesis. The Red Team attempts to BREAK the hypothesis by simulating hostile market conditions, system failures, and structural edge decay. A hack must survive the Red Team to achieve ELIGIBLE status.

---

## Red Team Philosophy

The Red Team assumes:
1. The market is adversarial and adapts to exploited edges
2. Infrastructure will fail at the worst possible moment
3. Historical regimes do not guarantee future regimes
4. Our models are always wrong; the question is whether they're usefully wrong

---

## Attack Scenarios

### Scenario 1: Liquidity Crisis

**Code:** RT_LIQUIDITY_CRISIS
**Narrative:** Exchange order books thin dramatically. Bid-ask spreads widen 5-10x. Large orders move the market. Fills are partial or at extreme prices.

**Simulated conditions:**
- Slippage: 10x baseline (0.50-2.00%)
- Fill rate: 40% of intended position size
- Market impact: 5x baseline price impact
- Duration: 48-72 hours

**Test:** Does the hack retain positive expectancy with 10x slippage and 40% fills?

**Pass condition:** OOS Sharpe after liquidity haircut >= 0.3
**Fail condition:** Strategy becomes unprofitable or requires abandonment

**Historical analogues:** FTX collapse (Nov 2022), COVID crash (March 2020), Terra/Luna (May 2022)

---

### Scenario 2: Data Gap

**Code:** RT_DATA_GAP
**Narrative:** Critical data feed goes offline for 4-24 hours. OHLCV bars are missing. External data (funding, OI) is unavailable for an extended period. System must degrade gracefully.

**Simulated conditions:**
- Missing bar sequence: 4h, 8h, 24h gaps tested
- Position handling: carry last known state vs. emergency exit
- Signal suppression: no signals during gap period
- Recovery: gap-filling vs. fresh start after reconnect

**Test:** Does the system correctly detect the gap, suppress signals, and recover without data integrity violations?

**Pass condition:**
- No trades executed during data gap window
- No look-ahead violations from gap-filling interpolation
- System recovers to NOMINAL state within 1 bar after data resumes

**Fail condition:** Trades executed on interpolated/stale data

---

### Scenario 3: Execution Lag

**Code:** RT_EXECUTION_LAG
**Narrative:** Network latency spikes to 2-10 seconds. Orders are delayed. By the time an order executes, the signal is stale. Multiple orders queue up and execute simultaneously.

**Simulated conditions:**
- Order latency: 2s, 5s, 10s
- Signal staleness window: signal invalid if > 3 bars old
- Queue pile-up: 5 orders queued and executing simultaneously
- Price move during lag: signal price vs. fill price divergence of 0.5-2%

**Test:** Does the hack have adequate edge after execution lag, or does the signal become stale before execution?

**Pass condition:** Profitable with 5-second order latency on 1h+ timeframes
**Fail condition:** Signal-to-fill price slippage > 50% of expected edge

**Mitigation:** Hacks on sub-1h timeframes that fail RT_EXECUTION_LAG must implement signal expiry logic.

---

### Scenario 4: Volatility Crush

**Code:** RT_VOLATILITY_CRUSH
**Narrative:** After an extended high-volatility period, realized volatility collapses to near zero. Breakout-style strategies find no signals. Range-based strategies get stopped out by micro-noise. The market enters a "dead zone."

**Simulated conditions:**
- ATR contracts to 30% of 1-year average
- Daily range: < 0.3% for 10+ consecutive days
- Signal frequency: drops to < 20% of historical average
- False breakout rate: increases 3x vs. historical

**Test:** Does the hack correctly identify low-volatility regimes and reduce position size or go to cash?

**Pass condition:**
- Hack either: (a) has a volatility filter that prevents trading in crush regime, OR
- (b) Demonstrates acceptable drawdown (< 8%) during the crush period with automatic recovery

**Fail condition:** Hack continues normal trading during volatility crush and suffers >15% drawdown

**Historical analogues:** BTC ranging at $29k for 60 days (summer 2023)

---

### Scenario 5: Correlation Break

**Code:** RT_CORRELATION_BREAK
**Narrative:** Historical correlations between instruments break down. BTC and ETH decorrelate. Hedging assumptions fail. Cross-instrument signals based on historical cointegration become unreliable.

**Simulated conditions:**
- BTC/ETH 30-day rolling correlation drops from 0.85 to 0.20
- Portfolio positions that were "diversified" become correlated in a crisis
- Parameters optimized on correlated regimes fail in decorrelated regime
- Regime shift duration: 2-6 months

**Test:** Does the hack's edge depend on historical correlations remaining stable? Does performance collapse if correlations break?

**Pass condition:**
- Hack is validated on single-instrument basis without cross-instrument correlation assumptions
- OR: Correlation dependency is explicitly documented and a monitoring trigger is defined

**Fail condition:** Hack's IS performance was achieved on correlated data and OOS includes a decorrelation period that wasn't identified

---

### Scenario 6: Regime Change (Bonus Scenario)

**Code:** RT_REGIME_CHANGE
**Narrative:** A fundamental market structure change occurs. New major participants enter, regulatory environment shifts, or the underlying asset's correlation to macro changes dramatically.

**Simulated conditions:**
- Pre-ETF vs. post-ETF BTC trading behavior shift
- Institutional dominance vs. retail dominance periods
- Regulatory crackdown: exchange volumes shift, certain instruments restricted

**Test:** Does the hack's OOS period include a regime transition? If not, flag for additional OOS testing.

**Pass condition:** OOS data includes at least one regime boundary as identified by structural break analysis
**Fail condition:** All IS and OOS data from the same structural regime (no regime diversity)

---

## Red Team Scoring

Each attack scenario is scored:

| Score | Meaning |
|-------|---------|
| SURVIVE | Strategy passes with no modification needed |
| SURVIVE_WITH_MITIGATION | Strategy passes but requires a specific mitigation (e.g., signal expiry) |
| CONDITIONAL | Strategy survives but with caveats; operator must acknowledge |
| FAIL | Strategy cannot survive this attack scenario |

**Overall Red Team Verdict:**
- All SURVIVE or SURVIVE_WITH_MITIGATION → RED_TEAM: PASS
- Any CONDITIONAL → RED_TEAM: PASS with noted conditions
- Any FAIL → RED_TEAM: FAIL

---

## Red Team Log

| hack_id | RT_LIQUIDITY | RT_DATA_GAP | RT_EXEC_LAG | RT_VOL_CRUSH | RT_CORR_BREAK | Overall |
|---------|-------------|------------|------------|-------------|--------------|---------|
| H_ATR_SQUEEZE_BREAKOUT | SURVIVE | SURVIVE | SURVIVE_M | SURVIVE | SURVIVE | PASS |
| H_BB_SQUEEZE | SURVIVE | SURVIVE | SURVIVE_M | CONDITIONAL | SURVIVE | PASS* |
| H_VWAP_REVERSAL | SURVIVE | SURVIVE | SURVIVE | SURVIVE | SURVIVE | PASS |
| H_VOLUME_SPIKE | SURVIVE | SURVIVE | SURVIVE_M | SURVIVE | SURVIVE | PASS |
| DRAFT/NEEDS_DATA hacks | — | — | — | — | — | NOT_RUN |

*H_BB_SQUEEZE: conditional on volatility filter implementation; monitor in production
SURVIVE_M = SURVIVE_WITH_MITIGATION (signal expiry required for sub-4h timeframes)
