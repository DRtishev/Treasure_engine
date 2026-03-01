# REGRESSION_OB_OKX10.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 62541b39a279
NEXT_ACTION: npm run -s verify:regression:ob-okx10-reorder-window-policy

## POLICY
- reorder_window_max_items=5 (from data_capabilities.json)
- Sort buffer by seqId (integer) before processing batch
- Reordered stream must produce same digest as in-order stream
- Deterministic: same input → same digest x2

## CHECKS
- [PASS] window_size_from_capabilities: reorder_window_max_items=5 — OK
- [PASS] adjacent_swap_digest_equal: adjacent swap fixed by window: clean==reorder digest — OK
- [PASS] in_order_digest_unchanged_by_window: in-order: window does not alter digest — OK
- [PASS] window_size_handles_full_reversal: full reversal of 4 updates (window=5) resolved — OK
- [PASS] reorder_determinism_x2: reorder determinism x2: r1==r2 digest — OK

## FAILED
- NONE
