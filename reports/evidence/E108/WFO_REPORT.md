# E108 WFO REPORT

- fixture: 200 bars

## WFO: breakout_atr
- folds: 3
- best_config: {"atr_mult":1.5,"atr_period":10,"lookback":8}
- stability (OOS stddev): 0.0000

### Fold 0
- train_bars: 39, oos_bars: 27
- best_params: {"atr_mult":1.5,"atr_period":10,"lookback":8}
- train_metric: 0.0017
- oos_metric: 0.0000

### Fold 1
- train_bars: 39, oos_bars: 27
- best_params: {"atr_mult":1,"atr_period":10,"lookback":8}
- train_metric: 0.0238
- oos_metric: 0.0000

### Fold 2
- train_bars: 39, oos_bars: 27
- best_params: {"atr_mult":1,"atr_period":10,"lookback":12}
- train_metric: 0.0000
- oos_metric: 0.0000

## WFO: mean_revert_rsi
- folds: 3
- best_config: {"overbought":65,"oversold":25,"rsi_period":10}
- stability (OOS stddev): 0.0144

### Fold 0
- train_bars: 39, oos_bars: 27
- best_params: {"overbought":65,"oversold":35,"rsi_period":14}
- train_metric: 0.0033
- oos_metric: 0.0000

### Fold 1
- train_bars: 39, oos_bars: 27
- best_params: {"overbought":65,"oversold":25,"rsi_period":10}
- train_metric: 0.0000
- oos_metric: 0.0132

### Fold 2
- train_bars: 39, oos_bars: 27
- best_params: {"overbought":65,"oversold":30,"rsi_period":10}
- train_metric: 0.0072
- oos_metric: -0.0157

## Recommended Candidate
- NONE: no strategy passed overfit court
