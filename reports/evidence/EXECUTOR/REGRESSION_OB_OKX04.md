# REGRESSION_OB_OKX04.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 62541b39a279
NEXT_ACTION: npm run -s verify:regression:ob-okx04-book-digest

## DIGEST_ALGORITHM
- Bids sorted descending by price (parseFloat)
- Asks sorted ascending by price (parseFloat)
- Zero-size entries excluded
- Only [price, size] tuples
- sha256(JSON.stringify({ asks, bids }))

## CHECKS
- [PASS] digest_computed_run1: digest=9805f4ad64e69e1e... bids=3 asks=2
- [PASS] digest_computed_run2: digest=9805f4ad64e69e1e...
- [PASS] digest_deterministic: run1===run2=9805f4ad64e69e1e... — deterministic OK
- [PASS] digest_matches_lock: digest=9805f4ad64e69e1e... matches lock — OK
- [PASS] canon_book_json_matches_lock: canon_book_json matches lock — OK
- [PASS] final_book_non_empty: bids=3 asks=2 — OK

## FAILED
- NONE
