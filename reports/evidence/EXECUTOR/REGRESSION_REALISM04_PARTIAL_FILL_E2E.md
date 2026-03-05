# REGRESSION_REALISM04_PARTIAL_FILL_E2E.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] small_order_full_fill: fill_ratio=1 (expected 1.0)
- [PASS] small_order_filled_qty: filled_qty=0.001 (expected 0.001)
- [PASS] large_order_partial_fill: fill_ratio=0.02 (expected < 1.0)
- [PASS] large_order_filled_qty_reduced: filled_qty=0.2 (expected < 10)
- [PASS] no_depth_default_fill_ratio: fill_ratio=0.95 (expected 0.95)
- [PASS] partial_fill_reduces_fee: partial_fee=4 < full_fee=200
