# REGRESSION_CAP02.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3053d6c7678c
NEXT_ACTION: npm run -s verify:regression:cap02-capabilities-coverage

## CHECKS
- [PASS] capabilities_parseable: JSON parse OK
- [PASS] providers_present: providers=binance,bybit,okx
- [PASS] coverage_binance_policy: key=capabilities.binance.policy level=HIGH — OK
- [PASS] coverage_binance_rate_limits: key=capabilities.binance.rate_limits level=HIGH — OK
- [PASS] coverage_binance_orderbook: key=capabilities.binance.orderbook level=HIGH — OK
- [PASS] coverage_binance_scopes: key=capabilities.binance.scopes level=HIGH — OK
- [PASS] coverage_bybit_policy: key=capabilities.bybit.policy level=HIGH — OK
- [PASS] coverage_bybit_rate_limits: key=capabilities.bybit.rate_limits level=MEDIUM — OK
- [PASS] coverage_bybit_orderbook: key=capabilities.bybit.orderbook level=HIGH — OK
- [PASS] coverage_okx_policy: key=capabilities.okx.policy level=HIGH — OK
- [PASS] coverage_okx_rate_limits: key=capabilities.okx.rate_limits level=MEDIUM — OK
- [PASS] coverage_okx_orderbook: key=capabilities.okx.orderbook level=HIGH — OK
- [PASS] no_unknown_coverage_keys: all 10 keys valid — OK
- [PASS] required_pattern_policy: capabilities.*.policy.* — OK
- [PASS] required_pattern_rate_limits: capabilities.*.rate_limits.* — OK
- [PASS] required_pattern_orderbook: capabilities.*.orderbook.* — OK

## FAILED
- NONE
