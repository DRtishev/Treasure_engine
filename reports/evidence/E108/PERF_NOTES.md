# E108 PERF NOTES

## Performance Characteristics
- Strategy evaluation: O(n) per bar, O(n*k) for k strategies
- Backtest: O(n) per bar with O(1) fill recording
- WFO: O(folds * grid_size * n) — bounded grid + rolling windows
- Paper replay: O(n) single pass

## No Regression Risk
E108 adds new modules only (core/edge/strategies/, core/backtest/, core/wfo/, core/gates/).
Existing verify chains (E97-E107) are not modified.

## Methodology
- 200-bar BTCUSDT 5m deterministic fixture (seeded RNG)
- All WFO grid searches bounded to prevent combinatorial explosion
- Determinism verified via double-run hash comparison
