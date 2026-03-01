# REGRESSION_R2_02_FIXTURES_READONLY.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 4eecd5118e0e
NEXT_ACTION: npm run -s verify:r2:okx-orderbook

## GUARDED PATHS
- artifacts/fixtures/okx/orderbook
- specs
- docs

## INNER GATE: verify:r2:okx-orderbook (TREASURE_NET_KILL=1)
- exit_code: 0
- pass: true

## MUTATION CHECK
- mutations_detected_n: 0
- NONE

## INNER GATE OUTPUT
```
[PASS] regression_r2_01_no_daily_wiring — NONE
[PASS] regression_ob_okx01_fixture_integrity — NONE
[PASS] regression_ob_okx02_lock_integrity — NONE
[PASS] regression_ob_okx03_seq_state_machine — NONE
[PASS] regression_ob_okx04_book_digest — NONE
[PASS] regression_ob_okx05_eventbus_events — NONE
[PASS] regression_ob_okx06_gap_detection — NONE
[PASS] regression_dec01_decimal_sort_total_order — NONE
[PASS] regression_ob_okx08_multi_level_sort_canon — NONE
[PASS] regression_ob_okx09_duplicate_idempotent — NONE
[PASS] regression_ob_okx10_reorder_window_policy — NONE
[PASS] regression_ob_okx15_digest_spec_present — NONE
[PASS] regression_ob_okx16_digest_matches_spec — NONE
```
