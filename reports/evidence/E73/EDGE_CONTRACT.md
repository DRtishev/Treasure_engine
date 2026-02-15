# E73 EDGE CONTRACT
- strict_laws: 1
- allowed_fail_budget_max_total: 10

| law | dataset | expected_status | observed_pass | reason_code | observed_delta |
|---|---|---|---|---|---:|
| M1 | chop | ALLOWED_FAIL | false | FAIL_ORDER_DEPENDENCE | 0.24631609 |
| M1 | flashcrash | ALLOWED_FAIL | false | FAIL_ORDER_DEPENDENCE | 11.34016538 |
| M1 | spread | ALLOWED_FAIL | false | FAIL_ORDER_DEPENDENCE | 8.90148461 |
| M2 | chop | MUST_PASS | true | NOT_APPLICABLE | 0.00000000 |
| M2 | flashcrash | MUST_PASS | true | NOT_APPLICABLE | 0.00000000 |
| M2 | spread | MUST_PASS | true | NOT_APPLICABLE | 0.00000000 |
| M3 | chop | ALLOWED_FAIL | false | FAIL_CAP_LIMIT | 0.00451542 |
| M3 | flashcrash | ALLOWED_FAIL | false | FAIL_CAP_LIMIT | 0.00801898 |
| M3 | spread | ALLOWED_FAIL | false | FAIL_CAP_LIMIT | 0.01395405 |
| M4 | chop | MUST_PASS | true | NOT_APPLICABLE | 2.00764297 |
| M4 | flashcrash | MUST_PASS | true | NOT_APPLICABLE | 1.50751420 |
| M4 | spread | MUST_PASS | true | NOT_APPLICABLE | 1.60300791 |
| M5 | chop | MUST_PASS | true | NOT_APPLICABLE | 2.00764299 |
| M5 | flashcrash | MUST_PASS | true | NOT_APPLICABLE | 1.50751419 |
| M5 | spread | MUST_PASS | true | NOT_APPLICABLE | 1.60300791 |

- observed_allowed_fail_total: 6
- observed_allowed_fail_per_law:
  - M1: observed=3 budget=3
  - M3: observed=3 budget=3
- observed_allowed_fail_per_regime:
  - baseline: observed=2 budget=10
  - fee_shock: observed=2 budget=10
  - missing_candles: observed=2 budget=10
  - spread_spike: observed=2 budget=10
