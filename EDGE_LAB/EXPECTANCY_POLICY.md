# EXPECTANCY_POLICY.md — EDGE_PROFIT_00 MVP

## Inputs

Consumes normalized paper telemetry from EDGE_PROFIT_00 ingest court.

## Metrics

- trades (N)
- mean pnl per trade
- standard deviation
- winrate
- profit factor
- max drawdown proxy (equity curve peak-to-trough)
- confidence interval (95% t-interval around mean)

## Fail-closed gates

- If `N < MIN_N` (default 200) => `NEEDS_DATA` / `NDA02`.
- PASS only when:
  1) ingest status is PASS,
  2) expectancy mean > 0,
  3) CI lower bound > 0.

Otherwise BLOCKED (`EX90`) or NEEDS_DATA (`NDA02`).

## Safety

This policy does not unlock live trading and cannot override ZW01.
