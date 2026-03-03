# RG_BACKTEST_ORGAN01_HEALTH

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:backtest01-organ-health
CHECKS_TOTAL: 6
VIOLATIONS: 0

## CHECKS
- [PASS] fixture_present: OK: 200 bars
- [PASS] s1_sharpe_finite: OK: backtest_sharpe=0.508745
- [PASS] s3_sharpe_finite: OK: backtest_sharpe=0.224565
- [PASS] s1_determinism_x2: OK: hash=e026f5ccfa7b1530...
- [PASS] s3_determinism_x2: OK: hash=d36b46847ab4a69c...
- [PASS] short_sell_from_flat: OK: pos.qty=-1

## FAILED
- NONE
