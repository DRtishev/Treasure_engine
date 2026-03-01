# REGRESSION_OB_OKX13.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c7c93c538a8c
NEXT_ACTION: npm run -s verify:regression:ob-okx13-buffer-discard-rules

## DISCARD_RULE
- seqId <= snapshot.seqId → DISCARD
- seqId > snapshot.seqId → KEEP (candidate for ALIGN_FIRST_EVENT or STRICT)

## CHECKS
- [PASS] all_discarded_have_seqId_lte_snapshot: all 2 discarded messages have seqId <= 100 — OK
- [PASS] all_kept_have_seqId_gt_snapshot: all 3 kept messages have seqId > 100 — OK
- [PASS] discard_count_matches_lock: discarded_n=2 matches lock — OK
- [PASS] applied_count_matches_lock: applied_n=3 matches lock — OK
- [PASS] boundary_condition_exact: boundary: seqId==100→discard, seqId==101→keep — OK
- [PASS] all_discarded_no_first_event: all-discarded buffer: kept=0 → no ALIGN_FIRST_EVENT — OK
- [PASS] align_first_event_gap_detected: gap scenario: prevSeqId=103 > snapshot.seqId=100 → ALIGN_FIRST_EVENT_FAIL — OK
- [PASS] align_first_event_perfect_match: perfect first event: prevSeqId=100 <= snapshot.seqId=100 < seqId=101 → ALIGN_FIRST_EVENT — OK

## FAILED
- NONE
