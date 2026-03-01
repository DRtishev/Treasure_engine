# PUBLIC_DATA_READINESS_SEAL.md

STATUS: NEEDS_DATA
REASON_CODE: RDY01
RUN_ID: 7b26add1c824
NEXT_ACTION: npm run -s verify:public:data:readiness
REGISTRY: specs/data_lanes.json (5 lanes)

## PER-LANE MATRIX

- lane=liq_binance_forceorder_ws truth=HINT status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE
- lane=liq_bybit_ws_v5 truth=TRUTH status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE
- lane=liq_okx_ws_v5 truth=HINT status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE
- lane=price_offline_fixture truth=HINT status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE
- lane=price_okx_orderbook_ws truth=HINT status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE

## TRUTH LANES
- liq_bybit_ws_v5: NEEDS_DATA

## HINT LANES
- liq_binance_forceorder_ws: NEEDS_DATA
- liq_okx_ws_v5: NEEDS_DATA
- price_offline_fixture: NEEDS_DATA
- price_okx_orderbook_ws: NEEDS_DATA

## RISK_ONLY LANES
- NONE
