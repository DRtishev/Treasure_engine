# E72 EDGE CONTRACT
- strict_laws: 1

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

- summary_must_pass_rows: 9
- summary_allowed_fail_rows: 6
- summary_not_applicable_rows: 0
