# TRIALS_LEDGER.md — Optimization Trials Ledger
version: 1.0.0 | last_updated: 2026-02-19

Tracks all optimization trial runs per hack. Each trial run is an independent optimization attempt.
Trials are append-only; do not delete entries.

---

## Ledger Entries

### H_ATR_SQUEEZE_BREAKOUT — 47 trials

| trial_id | run_date | params_tested | is_metric | oos_metric | notes |
|----------|----------|--------------|-----------|-----------|-------|
| T001 | 2026-01-20 | atr_period=14, squeeze_bars=3, expansion_mult=1.3 | Sharpe 1.2 | Sharpe 0.9 | Baseline run |
| T002 | 2026-01-20 | atr_period=14, squeeze_bars=4, expansion_mult=1.3 | Sharpe 1.4 | Sharpe 1.1 | More squeeze bars |
| T003 | 2026-01-21 | atr_period=14, squeeze_bars=5, expansion_mult=1.4 | Sharpe 1.6 | Sharpe 1.3 | Improved |
| T004-T010 | 2026-01-22 | Grid: atr_period 10-20, squeeze_bars 3-7 | Best IS Sharpe 1.8 | Best OOS Sharpe 1.4 | Grid sweep |
| T011-T030 | 2026-01-24 | Bayesian optimization: all params | Best IS Sharpe 2.1 | Best OOS Sharpe 1.5 | Bayesian run |
| T031-T047 | 2026-01-28 | OOS validation on 2024-H1, 2024-H2 | OOS H1 Sharpe 1.4 | OOS H2 Sharpe 1.6 | Walk-forward confirmation |

**Best params:** atr_period=14, squeeze_bars=5, expansion_mult=1.5, stop_atr_mult=2.0
**OOS consistency:** PASS (both periods positive)

---

### H_BB_SQUEEZE — 38 trials

| trial_id | run_date | params_tested | is_metric | oos_metric | notes |
|----------|----------|--------------|-----------|-----------|-------|
| T001 | 2026-01-22 | bb_period=20, squeeze_pct=10, lookback=126 | Sharpe 1.3 | Sharpe 1.0 | Baseline |
| T002-T015 | 2026-01-23 | Grid: bb_period 15-30, squeeze_pct 5-20 | Best IS 1.7 | Best OOS 1.3 | Grid sweep |
| T016-T030 | 2026-01-25 | Bayesian: all params | Best IS 2.0 | Best OOS 1.4 | Bayesian |
| T031-T038 | 2026-01-29 | OOS 2024-H1, 2024-H2 validation | OOS H1 1.3 | OOS H2 1.5 | Walk-forward |

**Best params:** bb_period=20, bb_std=2.0, squeeze_percentile=10, lookback_bars=126
**OOS consistency:** PASS

---

### H_VWAP_REVERSAL — 52 trials

| trial_id | run_date | params_tested | is_metric | oos_metric | notes |
|----------|----------|--------------|-----------|-----------|-------|
| T001-T010 | 2026-01-25 | vwap_std_bands 1.5-3.0, volume_ratio 0.6-1.0 | Best IS 1.9 | Best OOS 1.5 | Initial sweep |
| T011-T030 | 2026-01-27 | Full Bayesian optimization | Best IS 2.2 | Best OOS 1.6 | Bayesian run |
| T031-T052 | 2026-02-01 | OOS Q3 2024, Q4 2024 walk-forward | Q3 Sharpe 1.5 | Q4 Sharpe 1.7 | Walk-forward validation |

**Best params:** vwap_std_bands=2.0, volume_ratio_threshold=0.8, target_vwap_band=0.25
**OOS consistency:** PASS

---

### H_VOLUME_SPIKE — 41 trials

| trial_id | run_date | params_tested | is_metric | oos_metric | notes |
|----------|----------|--------------|-----------|-----------|-------|
| T001-T015 | 2026-01-27 | volume_mult 2.0-5.0, range_threshold 0.1-0.4 | Best IS 1.8 | Best OOS 1.4 | Grid sweep |
| T016-T030 | 2026-01-29 | Bayesian optimization | Best IS 2.1 | Best OOS 1.5 | Bayesian run |
| T031-T041 | 2026-02-03 | OOS H1 2024, H2 2024 | H1 Sharpe 1.4 | H2 Sharpe 1.6 | Walk-forward |

**Best params:** volume_mult=3.0, volume_ma_period=20, range_threshold=0.25
**OOS consistency:** PASS

---

### DRAFT Hacks (0 trials each)

The following hacks have not yet had any optimization trials run:

| hack_id | status | reason |
|---------|--------|--------|
| H_VOLUME_CLIMAX | DRAFT | Awaiting trial scheduling |
| H_MM_TRAP_FALSE_BREAK | DRAFT | Awaiting trial scheduling |
| H_LIQUIDITY_VOID_PROXY | DRAFT | Proxy validation required first |
| H_OBV_DIVERGENCE | DRAFT | Proxy validation required first |
| H_EQUITY_CURVE_THROTTLE | DRAFT | Depends on base strategy selection |
| H_RSI_DIVERGENCE | DRAFT | Awaiting trial scheduling |
| H_MACD_CROSS | DRAFT | Awaiting trial scheduling |
| H_RANGE_COMPRESSION | DRAFT | Awaiting trial scheduling |
| H_TREND_CONTINUATION | DRAFT | Awaiting trial scheduling |
| H_MEAN_REVERSION | DRAFT | Awaiting trial scheduling |
| H_GAP_FILL | DRAFT | Awaiting trial scheduling |
| H_BREAKOUT_RETEST | DRAFT | Awaiting trial scheduling |

---

### NEEDS_DATA Hacks (blocked, 0 trials)

| hack_id | status | blocking_reason |
|---------|--------|----------------|
| H_FUNDING_TIMING | NEEDS_DATA | Funding rate feed not acquired |
| H_OPEN_INTEREST_SURGE | NEEDS_DATA | OI feed not acquired |
| H_LIQUIDATION_CASCADE | NEEDS_DATA | Liquidation feed not acquired |
| H_SENTIMENT_EXTREME | NEEDS_DATA | Fear & Greed feed not acquired |

---

## Ledger Statistics

| Metric | Value |
|--------|-------|
| Total trial runs | 178 |
| Hacks with trials | 4 |
| Hacks without trials | 16 |
| Average trials per active hack | 44.5 |
| OOS pass rate (TESTING hacks) | 4/4 (100%) |

---

## Trial Protocol Reference

Each trial must record:
1. **trial_id**: Sequential T001, T002, ... per hack
2. **run_date**: ISO date of trial execution
3. **params_tested**: Key parameter values tested
4. **is_metric**: In-sample Sharpe ratio (primary metric)
5. **oos_metric**: Out-of-sample Sharpe ratio
6. **notes**: Brief description of run type and findings

Optimization methods allowed:
- Grid search (exhaustive parameter grid)
- Bayesian optimization (Optuna or equivalent)
- Walk-forward validation (sequential OOS periods)
- Monte Carlo (randomized parameter sampling)
