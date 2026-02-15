# EDGE Meta Contract v2

This contract defines expected outcomes for metamorphic laws in E73.

## Law Matrix

| law | dataset | expected_status | reason_code_if_not_must_pass |
|---|---|---|---|
| M1 | chop | ALLOWED_FAIL | FAIL_ORDER_DEPENDENCE |
| M1 | flashcrash | ALLOWED_FAIL | FAIL_ORDER_DEPENDENCE |
| M1 | spread | ALLOWED_FAIL | FAIL_ORDER_DEPENDENCE |
| M2 | chop | MUST_PASS | NOT_APPLICABLE |
| M2 | flashcrash | MUST_PASS | NOT_APPLICABLE |
| M2 | spread | MUST_PASS | NOT_APPLICABLE |
| M3 | chop | ALLOWED_FAIL | FAIL_CAP_LIMIT |
| M3 | flashcrash | ALLOWED_FAIL | FAIL_CAP_LIMIT |
| M3 | spread | ALLOWED_FAIL | FAIL_CAP_LIMIT |
| M4 | chop | MUST_PASS | NOT_APPLICABLE |
| M4 | flashcrash | MUST_PASS | NOT_APPLICABLE |
| M4 | spread | MUST_PASS | NOT_APPLICABLE |
| M5 | chop | MUST_PASS | NOT_APPLICABLE |
| M5 | flashcrash | MUST_PASS | NOT_APPLICABLE |
| M5 | spread | MUST_PASS | NOT_APPLICABLE |

## Allowed Fail Budget

max_total: 10

per_law:
- M1: 3
- M3: 3

per_regime:
- baseline: 10
- fee_shock: 10
- spread_spike: 10
- missing_candles: 10
