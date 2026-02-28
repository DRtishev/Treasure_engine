# REGRESSION_FIX01_LOCK_SCHEMA.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 5b35ac334736
NEXT_ACTION: npm run -s verify:regression:fix01-lock-schema

## Liq lock

- rows_n=20 symbols=BTCUSDT,ETHUSDT,SOLUSDT
- schema_version=liquidations.bybit_ws_v5.v2

## Price lock

- rows_n=14 symbols=BTCUSDT,ETHUSDT,SOLUSDT
- schema_version=price_bars.offline_fixture.v1

- checks: ALL_PASS
