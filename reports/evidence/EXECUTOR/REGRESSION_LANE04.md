# REGRESSION_LANE04.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 85923462b561
NEXT_ACTION: npm run -s verify:regression:lane04-truth-requires-truth-ready

## POLICY
- truth_level=TRUTH requires lane_state=TRUTH_READY
- PREFLIGHT/PLANNED/EXPERIMENTAL lanes must not be TRUTH
- Violation is BLOCKED (EC=2), not merely FAIL

## CHECKS
- [PASS] lanes_parseable: JSON parse OK
- [PASS] lanes_present: lanes_n=5
- [PASS] all_lanes_have_lane_state: all 5 lanes have lane_state — OK
- [PASS] truth_lanes_are_truth_ready: all 1 TRUTH lane(s) have lane_state=TRUTH_READY — OK
- [PASS] preflight_planned_not_truth: no PREFLIGHT/PLANNED/EXPERIMENTAL/DEPRECATED lane has truth_level=TRUTH — OK
- [PASS] at_least_one_truth_ready_lane: truth_ready_lanes=liq_bybit_ws_v5
- [PASS] lane_liq_binance_forceorder_ws_state_ok: liq_binance_forceorder_ws: truth_level=HINT lane_state=EXPERIMENTAL
- [PASS] lane_liq_bybit_ws_v5_state_ok: liq_bybit_ws_v5: truth_level=TRUTH lane_state=TRUTH_READY
- [PASS] lane_liq_okx_ws_v5_state_ok: liq_okx_ws_v5: truth_level=HINT lane_state=EXPERIMENTAL
- [PASS] lane_price_offline_fixture_state_ok: price_offline_fixture: truth_level=HINT lane_state=EXPERIMENTAL
- [PASS] lane_price_okx_orderbook_ws_state_ok: price_okx_orderbook_ws: truth_level=HINT lane_state=PREFLIGHT

## FAILED
- NONE
