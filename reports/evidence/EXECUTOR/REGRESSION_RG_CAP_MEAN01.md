# REGRESSION_RG_CAP_MEAN01.md — Capabilities Keys Have Meaning

STATUS: PASS
REASON_CODE: NONE
RUN_ID: ce74ca2de8ca
NEXT_ACTION: npm run -s verify:regression:rg-cap-mean01-keys-have-meaning
CHECKS_TOTAL: 61
VIOLATIONS: 0

## CHECKS
- [PASS] binance.rate_limits._field_meta_present: _field_meta present — OK
- [PASS] binance.rate_limits._field_meta.connections_per_ip_present: _field_meta.connections_per_ip present
- [PASS] binance.rate_limits._field_meta.connections_per_ip.meaning: meaning="Maximum concurrent WebSocket connections" — OK
- [PASS] binance.rate_limits._field_meta.connections_per_ip.unit_hint: unit_hint="count" — OK
- [PASS] binance.rate_limits._field_meta.connections_per_ip.window_kind: window_kind="static_limit" — OK
- [PASS] binance.rate_limits._field_meta.messages_per_connection_present: _field_meta.messages_per_connection present
- [PASS] binance.rate_limits._field_meta.messages_per_connection.meaning: meaning="Maximum subscribe/unsubscribe messages p" — OK
- [PASS] binance.rate_limits._field_meta.messages_per_connection.unit_hint: unit_hint="count" — OK
- [PASS] binance.rate_limits._field_meta.messages_per_connection.window_kind: window_kind="rolling" — OK
- [PASS] binance.orderbook._field_meta_present: _field_meta present — OK
- [PASS] binance.orderbook._field_meta.depth_levels_present: _field_meta.depth_levels present
- [PASS] binance.orderbook._field_meta.depth_levels.meaning: meaning="Available order book depth snapshot leve" — OK
- [PASS] binance.orderbook._field_meta.depth_levels.unit_hint: unit_hint="levels" — OK
- [PASS] binance.orderbook._field_meta.depth_levels.window_kind: window_kind="snapshot" — OK
- [PASS] binance.scopes[binance.academy.stream_limits].rate_limits._field_meta_present: _field_meta present — OK
- [PASS] binance.scopes[binance.academy.stream_limits].rate_limits._field_meta.connections_per_ip.meaning: meaning OK
- [PASS] binance.scopes[binance.academy.stream_limits].rate_limits._field_meta.connections_per_ip.unit_hint: unit_hint OK
- [PASS] binance.scopes[binance.academy.stream_limits].rate_limits._field_meta.connections_per_ip.window_kind: window_kind OK
- [PASS] binance.scopes[binance.academy.stream_limits].rate_limits._field_meta.streams_per_connection.meaning: meaning OK
- [PASS] binance.scopes[binance.academy.stream_limits].rate_limits._field_meta.streams_per_connection.unit_hint: unit_hint OK
- [PASS] binance.scopes[binance.academy.stream_limits].rate_limits._field_meta.streams_per_connection.window_kind: window_kind OK
- [PASS] binance.scopes[binance.delivery_testnet.market_streams].rate_limits._field_meta_present: _field_meta present — OK
- [PASS] binance.scopes[binance.delivery_testnet.market_streams].rate_limits._field_meta.connections_per_ip.meaning: meaning OK
- [PASS] binance.scopes[binance.delivery_testnet.market_streams].rate_limits._field_meta.connections_per_ip.unit_hint: unit_hint OK
- [PASS] binance.scopes[binance.delivery_testnet.market_streams].rate_limits._field_meta.connections_per_ip.window_kind: window_kind OK
- [PASS] binance.scopes[binance.delivery_testnet.market_streams].rate_limits._field_meta.streams_per_connection.meaning: meaning OK
- [PASS] binance.scopes[binance.delivery_testnet.market_streams].rate_limits._field_meta.streams_per_connection.unit_hint: unit_hint OK
- [PASS] binance.scopes[binance.delivery_testnet.market_streams].rate_limits._field_meta.streams_per_connection.window_kind: window_kind OK
- [PASS] bybit.rate_limits._field_meta_present: _field_meta present — OK
- [PASS] bybit.rate_limits._field_meta.connections_per_ip_present: _field_meta.connections_per_ip present
- [PASS] bybit.rate_limits._field_meta.connections_per_ip.meaning: meaning="Maximum concurrent WebSocket connections" — OK
- [PASS] bybit.rate_limits._field_meta.connections_per_ip.unit_hint: unit_hint="count" — OK
- [PASS] bybit.rate_limits._field_meta.connections_per_ip.window_kind: window_kind="static_limit" — OK
- [PASS] bybit.rate_limits._field_meta.messages_per_connection_present: _field_meta.messages_per_connection present
- [PASS] bybit.rate_limits._field_meta.messages_per_connection.meaning: meaning="Maximum subscribe/unsubscribe messages p" — OK
- [PASS] bybit.rate_limits._field_meta.messages_per_connection.unit_hint: unit_hint="count" — OK
- [PASS] bybit.rate_limits._field_meta.messages_per_connection.window_kind: window_kind="rolling" — OK
- [PASS] bybit.orderbook._field_meta_present: _field_meta present — OK
- [PASS] bybit.orderbook._field_meta.depth_levels_present: _field_meta.depth_levels present
- [PASS] bybit.orderbook._field_meta.depth_levels.meaning: meaning="Available order book depth snapshot leve" — OK
- [PASS] bybit.orderbook._field_meta.depth_levels.unit_hint: unit_hint="levels" — OK
- [PASS] bybit.orderbook._field_meta.depth_levels.window_kind: window_kind="snapshot" — OK
- [PASS] okx.rate_limits._field_meta_present: _field_meta present — OK
- [PASS] okx.rate_limits._field_meta.connections_per_ip_present: _field_meta.connections_per_ip present
- [PASS] okx.rate_limits._field_meta.connections_per_ip.meaning: meaning="Maximum concurrent WebSocket connections" — OK
- [PASS] okx.rate_limits._field_meta.connections_per_ip.unit_hint: unit_hint="count" — OK
- [PASS] okx.rate_limits._field_meta.connections_per_ip.window_kind: window_kind="static_limit" — OK
- [PASS] okx.rate_limits._field_meta.messages_per_connection_present: _field_meta.messages_per_connection present
- [PASS] okx.rate_limits._field_meta.messages_per_connection.meaning: meaning="Maximum subscribe/unsubscribe messages p" — OK
- [PASS] okx.rate_limits._field_meta.messages_per_connection.unit_hint: unit_hint="count" — OK
- [PASS] okx.rate_limits._field_meta.messages_per_connection.window_kind: window_kind="rolling" — OK
- [PASS] okx.orderbook._field_meta_present: _field_meta present — OK
- [PASS] okx.orderbook._field_meta.depth_levels_present: _field_meta.depth_levels present
- [PASS] okx.orderbook._field_meta.depth_levels.meaning: meaning="Available order book depth snapshot leve" — OK
- [PASS] okx.orderbook._field_meta.depth_levels.unit_hint: unit_hint="levels" — OK
- [PASS] okx.orderbook._field_meta.depth_levels.window_kind: window_kind="snapshot" — OK
- [PASS] okx.orderbook._field_meta.reorder_window_max_items_present: _field_meta.reorder_window_max_items present
- [PASS] okx.orderbook._field_meta.reorder_window_max_items.meaning: meaning="Maximum number of out-of-order messages " — OK
- [PASS] okx.orderbook._field_meta.reorder_window_max_items.unit_hint: unit_hint="count" — OK
- [PASS] okx.orderbook._field_meta.reorder_window_max_items.window_kind: window_kind="reorder_buffer" — OK
- [PASS] confidence_map_covers_field_meta: confidence_map has 6 _field_meta entries — OK

## FAILED
- NONE
