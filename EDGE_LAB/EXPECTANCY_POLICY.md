# EXPECTANCY_POLICY.md — EDGE_PROFIT_00 P0

## Policy thresholds (deterministic defaults)

- `MIN_N_TRADES`: 200
- `BOOTSTRAP_ITERS`: 10000
- `PSR_MIN`: 0.95
- `CI_LOWER_GT_ZERO`: required (`ci95_low > 0`)
- `MIN_TRL_TRADES`: 2.0 (proxy threshold)

## Verdict requirements

PASS only if all are true:
1. ingest status = PASS
2. execution reality status = PASS
3. `N >= MIN_N_TRADES`
4. `ci95_low > 0`
5. `psr0 >= PSR_MIN`
6. `MinTRL_trades >= MIN_TRL_TRADES`

Otherwise:
- `NEEDS_DATA` for insufficient sample/TRL
- `BLOCKED` for threshold failure under sufficient sample

## Safety

This policy never unlocks live trading and cannot override ZW01.
