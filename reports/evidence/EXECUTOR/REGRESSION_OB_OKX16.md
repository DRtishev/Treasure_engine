# REGRESSION_OB_OKX16.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 62541b39a279
NEXT_ACTION: npm run -s verify:regression:ob-okx16-digest-matches-spec

## POLICY
- Digest algorithm must match docs/OKX_ORDERBOOK_DIGEST_SPEC.md exactly
- { asks, bids } JSON key order, decimal sort, zero exclusion, SHA-256

## CHECKS
- [PASS] json_structure_asks_bids_order: JSON keys=[asks,bids] — asks first, exactly 2 keys — OK
- [PASS] bids_sorted_desc: bids sorted DESC: 49500>49000>48900 — OK
- [PASS] asks_sorted_asc: asks sorted ASC: 50000<50100<50200 — OK
- [PASS] zero_size_excluded_bids: bids zero excluded: only 48900 remains — OK
- [PASS] zero_size_excluded_asks: asks zero excluded: only 50000 remains — OK
- [PASS] determinism_x2: digest x2 identical — OK
- [PASS] digest_sensitive_to_size_change: digest changes on size mutation — OK
- [PASS] decimal_sort_distinguishes_large_ints: compareDecimalStr(9007199254740993,9007199254740992)=1>0 — float64 would give 0 — OK
- [PASS] digest_is_sha256_hex: digest is 64-char hex SHA-256 — OK

## FAILED
- NONE
