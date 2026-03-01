# REGRESSION_CAP05.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c7c93c538a8c
NEXT_ACTION: npm run -s verify:regression:cap05-scope-aware-limits

## POLICY
- binance.scopes: >= 2 entries, each with scope_id + LOGICAL_TICKS rate_limits
- required scope_ids: binance.academy.stream_limits, binance.delivery_testnet.market_streams
- okx.orderbook.dedup_key = "seqId"
- okx.orderbook.reorder_window_max_items: positive integer
- confidence_map covers capabilities.binance.scopes

## CHECKS
- [PASS] capabilities_parseable: JSON parse OK
- [PASS] binance_scopes_array_present: binance.scopes is array — OK
- [PASS] binance_scopes_min_2_entries: binance.scopes has 2 entries — OK
- [PASS] scope_0_has_scope_id: scope[0].scope_id="binance.academy.stream_limits" — OK
- [PASS] scope_0_unit_logical_ticks: scope[0].rate_limits.unit=LOGICAL_TICKS — OK
- [PASS] scope_1_has_scope_id: scope[1].scope_id="binance.delivery_testnet.market_streams" — OK
- [PASS] scope_1_unit_logical_ticks: scope[1].rate_limits.unit=LOGICAL_TICKS — OK
- [PASS] scope_id_binance_academy_stream_limits: scope_id=binance.academy.stream_limits present — OK
- [PASS] scope_id_binance_delivery_testnet_market_streams: scope_id=binance.delivery_testnet.market_streams present — OK
- [PASS] binance_scopes_no_wallclock_fields: no wallclock fields in scope rate_limits — OK
- [PASS] okx_orderbook_dedup_key: okx.orderbook.dedup_key=seqId — OK
- [PASS] okx_orderbook_reorder_window_max_items: okx.orderbook.reorder_window_max_items=5 — OK
- [PASS] confidence_covers_binance_scopes: capabilities.binance.scopes coverage=HIGH — OK
- [PASS] required_pattern_scopes_scope_id: capabilities.*.scopes[*].scope_id in required_path_patterns — OK

## FAILED
- NONE
