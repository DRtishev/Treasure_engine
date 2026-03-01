# REGRESSION_OB_OKX03.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c86c05d745a5
NEXT_ACTION: npm run -s verify:regression:ob-okx03-seq-state-machine

## STATE_MACHINE_RULES
- snapshot+prevSeqId=-1: BOOT (first) or RESET (subsequent)
- seqId==prevSeqId: SKIP (OKX_SEQ_NO_UPDATE)
- prevSeqId==lastSeqId: APPLY (sequential)
- prevSeqId<lastSeqId: RESET_PATH
- prevSeqId>lastSeqId: GAP FATAL

## CHECKS
- [PASS] seq_machine_no_fatal: seq-state machine completed without fatal error — OK
- [PASS] book_boot_occurred: BOOK_BOOT triggered — OK
- [PASS] final_seqId_matches_lock: final_seqId=2002 — OK
- [PASS] event_log_matches_expected: event_log=[BOOK_BOOT, BOOK_APPLY, BOOK_APPLY, BOOK_RESET, BOOK_APPLY, BOOK_APPLY] matches lock.events_expected — OK
- [PASS] at_least_one_book_apply: BOOK_APPLY count=4 — OK
- [PASS] at_least_one_book_reset: BOOK_RESET count=1 — OK

## FAILED
- NONE
