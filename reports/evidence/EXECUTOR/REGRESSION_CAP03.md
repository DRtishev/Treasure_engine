# REGRESSION_CAP03.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3053d6c7678c
NEXT_ACTION: npm run -s verify:regression:cap03-exceptions-accounted

## CHECKS
- [PASS] okx_flag_checksum_deprecated: checksum_deprecated=true — OK
- [PASS] okx_flag_seq_no_update_supported: seq_no_update_supported=true — OK
- [PASS] okx_flag_seq_reset_possible: seq_reset_possible=true — OK
- [PASS] okx_orderbook_lane_present: price_okx_orderbook_ws — OK
- [PASS] okx_lane_has_r2_exception_refs: refs_n=3
- [PASS] ref_anchor_no-update: ref with #no-update found — OK
- [PASS] ref_anchor_seq-reset: ref with #seq-reset found — OK
- [PASS] ref_anchor_empty-updates: ref with #empty-updates found — OK
- [PASS] ref_doc_exists_no-update: docs/OKX_ORDERBOOK_R2_PROCEDURE.md
- [PASS] ref_anchor_resolved_no-update: #no-update found in docs/OKX_ORDERBOOK_R2_PROCEDURE.md — OK
- [PASS] ref_doc_exists_seq-reset: docs/OKX_ORDERBOOK_R2_PROCEDURE.md
- [PASS] ref_anchor_resolved_seq-reset: #seq-reset found in docs/OKX_ORDERBOOK_R2_PROCEDURE.md — OK
- [PASS] ref_doc_exists_empty-updates: docs/OKX_ORDERBOOK_R2_PROCEDURE.md
- [PASS] ref_anchor_resolved_empty-updates: #empty-updates found in docs/OKX_ORDERBOOK_R2_PROCEDURE.md — OK
- [PASS] fixture_dir_no_update_exists: artifacts/fixtures/okx/orderbook/no_update
- [PASS] fixture_dir_no_update_nonempty: files_n=1
- [PASS] fixture_dir_seq_reset_exists: artifacts/fixtures/okx/orderbook/seq_reset
- [PASS] fixture_dir_seq_reset_nonempty: files_n=1
- [PASS] fixture_dir_empty_updates_exists: artifacts/fixtures/okx/orderbook/empty_updates
- [PASS] fixture_dir_empty_updates_nonempty: files_n=1

## FAILED
- NONE
