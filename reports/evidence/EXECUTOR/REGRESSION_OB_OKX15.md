# REGRESSION_OB_OKX15.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 62541b39a279
NEXT_ACTION: npm run -s verify:regression:ob-okx15-digest-spec-present

## POLICY
- docs/OKX_ORDERBOOK_DIGEST_SPEC.md must exist
- Must contain all required sections and terminology
- No wallclock fields

## CHECKS
- [PASS] spec_file_exists: docs/OKX_ORDERBOOK_DIGEST_SPEC.md exists — OK
- [PASS] spec_non_empty: spec length=5918 chars — OK
- [PASS] section_canonical_book_digest: section "CANONICAL BOOK DIGEST" present — OK
- [PASS] section_decimal_sort_total_order: section "DECIMAL SORT TOTAL ORDER" present — OK
- [PASS] section_dedup_policy: section "DEDUP POLICY" present — OK
- [PASS] section_reorder_window_policy: section "REORDER WINDOW POLICY" present — OK
- [PASS] section_okx_8_step_align_algorithm: section "OKX 8-STEP ALIGN ALGORITHM" present — OK
- [PASS] section_gate_coverage: section "GATE COVERAGE" present — OK
- [PASS] term_comparedecimalstr: term "compareDecimalStr" present — OK
- [PASS] term_sha256: term "sha256" present — OK
- [PASS] term_parsefloat: term "parseFloat" present — OK
- [PASS] term_seqid: term "seqId" present — OK
- [PASS] term_reorder_window_max_items: term "reorder_window_max_items" present — OK
- [PASS] term_align_first_event: term "ALIGN_FIRST_EVENT" present — OK
- [PASS] no_wallclock_in_spec: no wallclock fields in spec — OK

## FAILED
- NONE
