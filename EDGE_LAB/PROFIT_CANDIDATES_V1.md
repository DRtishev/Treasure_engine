# PROFIT_CANDIDATES_V1.md — Profit Candidate Set v1

epoch: PROFIT_CANDIDATES_EXECUTION_COURTS_V1
version: 1.0.0
last_updated: 2026-02-20
candidate_count: 4
status_default: NEEDS_DATA

## Purpose

Formal enumeration of profit candidates drawn from TESTING-status hacks in HACK_REGISTRY.md.
Each candidate is a formalized object with traceable fields. No field may contain vague claims.
STATUS=NEEDS_DATA until paper trading evidence confirms forward performance.

## Schema

Required fields per candidate (fixed order):
NAME | HYPOTHESIS | REGIMES | FAILURE_MODES | REQUIRED_GUARDS | DATA_REQUIREMENTS | EXECUTION_RISKS | RISK_LIMITS | STATUS

Sorting rule: Candidates MUST be sorted alphabetically by NAME (ascending).

---

## CANDIDATE: H_ATR_SQUEEZE_BREAKOUT

| field | value |
|-------|-------|
| NAME | H_ATR_SQUEEZE_BREAKOUT |
| HYPOTHESIS | ATR contraction followed by expansion signals directional breakout; edge arises from volatility regime shift captured on 1h-4h timeframe using OHLCV only. |
| REGIMES | Trending markets with periodic volatility compression; excludes choppy/range-bound regimes with ATR < 0.3% of price. |
| FAILURE_MODES | False breakout in low-liquidity periods; ATR contraction without directional follow-through; correlated breakout failures across instruments. |
| REQUIRED_GUARDS | RISK_FSM state <= CAUTIOUS; max 2 concurrent positions in same instrument family; stop_distance >= 1.5x ATR at entry. |
| DATA_REQUIREMENTS | OHLCV (1h, 4h); instrument: BTCUSDT, ETHUSDT, SOLUSDT; source: Binance spot; truth_tag: TRUE_DATA. |
| EXECUTION_RISKS | Slippage on breakout bars elevated (volatility expansion); latency > 300ms may miss entry window; partial fill risk on illiquid alts. |
| RISK_LIMITS | max_loss_per_trade: 1.0% equity; max_drawdown_trigger: 5.0%; halt_on: 3 consecutive losses within 24h; position_size: 1.0% equity risk. |
| STATUS | NEEDS_DATA |

---

## CANDIDATE: H_BB_SQUEEZE

| field | value |
|-------|-------|
| NAME | H_BB_SQUEEZE |
| HYPOTHESIS | Bollinger Band width contraction below 20-period percentile threshold precedes directional expansion; entry on first bar touching outer band after squeeze resolution. |
| REGIMES | Low-volatility accumulation phases transitioning to directional moves; excludes high-volatility trending markets where bands are already expanded. |
| FAILURE_MODES | Squeeze without resolution (prolonged ranging); outer band touch without follow-through; band width re-compression within 3 bars. |
| REQUIRED_GUARDS | RISK_FSM state <= CAUTIOUS; minimum squeeze duration: 5 bars at threshold; exit on band re-compression or fixed stop at 1.5% from entry. |
| DATA_REQUIREMENTS | OHLCV (1h, 4h); instrument: BTCUSDT, ETHUSDT; source: Binance spot; truth_tag: TRUE_DATA. |
| EXECUTION_RISKS | Outer band entries have higher slippage due to bar momentum; limit order partial fill risk on fast moves; latency sensitivity moderate. |
| RISK_LIMITS | max_loss_per_trade: 1.0% equity; max_drawdown_trigger: 5.0%; halt_on: 3 consecutive losses within 24h; position_size: 1.0% equity risk. |
| STATUS | NEEDS_DATA |

---

## CANDIDATE: H_VOLUME_SPIKE

| field | value |
|-------|-------|
| NAME | H_VOLUME_SPIKE |
| HYPOTHESIS | Volume spike (>3x 20-bar average) with concurrent price close in top 25% of bar range indicates institutional accumulation; trend continuation expected on next 3-5 bars. |
| REGIMES | Trending or breakout markets; excludes climactic volume spikes at price extremes (reversal scenario flagged separately by H_VOLUME_CLIMAX). |
| FAILURE_MODES | Distribution disguised as accumulation (volume spike at resistance); climactic volume misidentified as continuation; spike in low-liquidity alts with manipulated volume. |
| REQUIRED_GUARDS | RISK_FSM state <= CAUTIOUS; price close in upper 25% of bar required; volume > 3x 20-bar average confirmed; no adjacent spike within 5 bars. |
| DATA_REQUIREMENTS | OHLCV (1h); instrument: BTCUSDT, ETHUSDT, SOLUSDT; source: Binance spot; truth_tag: TRUE_DATA. |
| EXECUTION_RISKS | Post-spike entry on next bar open subject to gap; elevated slippage on continuation bars; fill rate may degrade in high-volume market stress periods. |
| RISK_LIMITS | max_loss_per_trade: 1.0% equity; max_drawdown_trigger: 5.0%; halt_on: 3 consecutive losses within 24h; position_size: 1.0% equity risk. |
| STATUS | NEEDS_DATA |

---

## CANDIDATE: H_VWAP_REVERSAL

| field | value |
|-------|-------|
| NAME | H_VWAP_REVERSAL |
| HYPOTHESIS | Price deviation from session VWAP beyond 1.5 standard deviations reverts within the session; mean reversion edge is structural due to institutional anchor behavior. |
| REGIMES | High-volume session periods (08:00-16:00 UTC); excludes overnight sessions with low volume; excludes strong trending days (daily range > 3x ATR). |
| FAILURE_MODES | Continuation move instead of reversion on news-driven breaks; VWAP calculation drift in extended sessions; correlated failures across instruments on macro events. |
| REQUIRED_GUARDS | RISK_FSM state <= CAUTIOUS; session volume filter (current volume > 50% of 20-day average session volume); stop beyond 2.5 SD from VWAP. |
| DATA_REQUIREMENTS | OHLCV (1h, 15m); instrument: BTCUSDT, ETHUSDT; source: Binance spot; truth_tag: TRUE_DATA. |
| EXECUTION_RISKS | Entry near VWAP deviation extreme has elevated fill competition; slippage higher in thin intraday periods; latency > 200ms degrades entry quality. |
| RISK_LIMITS | max_loss_per_trade: 1.0% equity; max_drawdown_trigger: 5.0%; halt_on: 3 consecutive losses within 24h; position_size: 1.0% equity risk. |
| STATUS | NEEDS_DATA |

---

## MCL Notes

FRAME: Formal enumeration of profit candidates. Each candidate is validated by PROFIT_CANDIDATES_COURT.
RISKS: Self-deception via optimistic regime descriptions or failure mode omission. Mitigation: required FAILURE_MODES field is non-negotiable.
CONTRACT: edge_profit_candidates.mjs validates all fields and sorting. Missing field = BLOCKED.
MIN-DIFF: 4 candidates from existing TESTING hacks only. No new hypotheses invented here.
RED-TEAM: Attempt to sneak in optimistic STATUS=ELIGIBLE_FOR_PAPER → blocked by court (requires execution_reality PASS).
PROOF: Run npm run edge:profit:candidates; expect STATUS=PASS for format validation.
