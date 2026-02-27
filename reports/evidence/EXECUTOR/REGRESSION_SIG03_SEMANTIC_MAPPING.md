# REGRESSION_SIG03_SEMANTIC_MAPPING.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: ef4898489c4d
NEXT_ACTION: npm run -s verify:regression:sig03-semantic-mapping

## Fixture: RG_DATA04_FIXTURE (bybit_ws_v5 v2, liq_side mapped)

- BTCUSDT: long_liq_vol=4 short_liq_vol=12 liq_pressure=0.25 regime=BULL_LIQ
- ETHUSDT: long_liq_vol=0 short_liq_vol=20 liq_pressure=0 regime=BULL_LIQ

## Expected

- BTCUSDT: liq_pressure=0.25 regime=BULL_LIQ
- ETHUSDT: liq_pressure=0 regime=BULL_LIQ

- checks: ALL_PASS
