# E110 CANDIDATE BOARD

- bars: 200
- days: 0.69
- thresholds: minTrades=10, minDays=1, minOOSBars=20

## Candidates
NONE — no strategy passed all filters on available data.
This is the honest result. More data or parameter space needed.

## Rejected (with reasons)
| Strategy | StabScore | Trades | Court | Reject Reason |
| --- | --- | --- | --- | --- |
| breakout_atr | 0.5640 | 4 | FAIL | insufficient_days: 0.69 < 1 |
| mean_revert_rsi | 0.4083 | 5 | FAIL | insufficient_days: 0.69 < 1 |

## Court Verdict Details
### breakout_atr
- court: FAIL
- reasons: IS/OOS ratio too high: 15.32 > 3
- best_config: {"atr_mult":1.5,"atr_period":5,"lookback":5}
- oos_avg: 0.0010
- is_avg: 0.0147
- wfo_stability: 0.0017

### mean_revert_rsi
- court: FAIL
- reasons: IS/OOS ratio too high: 11.17 > 3
- best_config: {"overbought":60,"oversold":37,"rsi_period":6}
- oos_avg: 0.0009
- is_avg: 0.0105
- wfo_stability: 0.0050
