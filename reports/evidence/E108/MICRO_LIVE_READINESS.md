# E108 MICRO-LIVE READINESS

- fixture: 200 bars, 3 simulated days

## breakout_atr
- verdict: NOT_READY
- oos_court: FAIL
## Micro-Live Readiness
- verdict: NOT_READY

### Checks
- min_sample_days: PASS (days=3 threshold=3)
- max_drawdown: PASS (max_dd=0.01% threshold=5%)
- anomalies: PASS (anomalies=0 threshold=2)
- min_return: PASS (return=-0.0146% threshold=-1%)
- min_fills: PASS (fills=5 threshold=5)
- oos_court: FAIL (court_verdict=FAIL)

### Failure Reasons
- OOS Court FAIL: FAIL

## mean_revert_rsi
- verdict: NOT_READY
- oos_court: FAIL
## Micro-Live Readiness
- verdict: NOT_READY

### Checks
- min_sample_days: PASS (days=3 threshold=3)
- max_drawdown: PASS (max_dd=0.00% threshold=5%)
- anomalies: PASS (anomalies=0 threshold=2)
- min_return: PASS (return=-0.0094% threshold=-1%)
- min_fills: PASS (fills=8 threshold=5)
- oos_court: FAIL (court_verdict=FAIL)

### Failure Reasons
- OOS Court FAIL: FAIL

## Overall Recommendation
- candidate: NONE
- status: No strategy passed all readiness checks
