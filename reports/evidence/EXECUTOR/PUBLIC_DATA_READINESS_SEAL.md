# PUBLIC_DATA_READINESS_SEAL.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 39e1005c74fc
NEXT_ACTION: npm run -s verify:public:data:readiness
REGISTRY: specs/data_lanes.json (4 lanes)

## PER-LANE MATRIX

- lane=liq_binance_forceorder_ws truth=HINT status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE
- lane=liq_bybit_ws_v5 truth=TRUTH status=PASS reason=NONE ec=0 run_id=RG_LIQ_LOCK01_FIXTURE
- lane=liq_okx_ws_v5 truth=HINT status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE
- lane=price_offline_fixture truth=HINT status=NEEDS_DATA reason=RDY01 ec=2 run_id=NONE

## TRUTH LANES
- liq_bybit_ws_v5: PASS

## HINT LANES
- liq_binance_forceorder_ws: NEEDS_DATA
- liq_okx_ws_v5: NEEDS_DATA
- price_offline_fixture: NEEDS_DATA

## RISK_ONLY LANES
- NONE
