# REGRESSION_OB_OKX08.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c86c05d745a5
NEXT_ACTION: npm run -s verify:regression:ob-okx08-multi-level-sort-canon

## SORT_ALGORITHM
- compareDecimalStr from decimal_sort.mjs (no parseFloat)
- Bids: DESC (compareDecimalStr(b[0], a[0]))
- Asks: ASC  (compareDecimalStr(a[0], b[0]))
- Zero-size entries excluded before sort

## CHECKS
- [PASS] multi_level_bids_sorted_desc: bids DESC: [50000,49900,49800,49700,49600,49500] — OK
- [PASS] multi_level_asks_sorted_asc: asks ASC: [50050,50100,50200,50300,50400,50500] — OK
- [PASS] mixed_decimal_bids_sorted_desc: mixed bids DESC: [50001,50000.25,49999.75,49999.5,49998.99] — OK
- [PASS] digest_deterministic_x2: digest run1===run2=386fd915028828b5... — deterministic OK
- [PASS] canon_json_has_asks_bids_keys: canon JSON has exactly asks+bids keys — OK
- [PASS] canon_bids_descending: canon bids are descending — OK
- [PASS] canon_asks_ascending: canon asks are ascending — OK
- [PASS] digest_sensitive_to_sort_order: digest differs for mis-sorted book (correct≠wrong) — OK
- [PASS] zero_size_excluded_from_digest: zero-size entry excluded — digests match — OK

## FAILED
- NONE
