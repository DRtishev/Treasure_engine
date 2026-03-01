# REGRESSION_OB_OKX12.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c7c93c538a8c
NEXT_ACTION: npm run -s verify:regression:ob-okx12-align-invariants

## ALIGN_INVARIANTS
- ALIGN_FIRST_EVENT: prevSeqId <= snapshot.seqId < seqId
- STRICT: all subsequent prevSeqId == lastSeqId
- DISCARD: seqId <= snapshot.seqId

## CHECKS
- [PASS] align_script_exists: align_script present — OK
- [PASS] buffer_exists: buffer present — OK
- [PASS] snapshot_exists: snapshot present — OK
- [PASS] lock_exists: lock present — OK
- [PASS] align_first_event_condition: prevSeqId=100 <= snapshot.seqId=100 < seqId=101 — OK
- [PASS] align_first_event_seqId_matches_lock: align_first_event_seqId=101 matches lock — OK
- [PASS] discard_count_matches_lock: discarded_n=2 matches lock — OK
- [PASS] strict_apply_chain_valid: all 2 STRICT apply steps have prevSeqId==lastSeqId — OK
- [PASS] align_script_exit_zero: align script EC=0 — PASS
- [PASS] align_script_stdout_pass: stdout=[PASS] — OK
- [PASS] epoch_output_created: EPOCH dir exists: EPOCH-R2-ALIGN-c7c93c538a8c — OK
- [PASS] epoch_align_json_exists: ALIGN.json present — OK
- [PASS] epoch_align_md_exists: ALIGN.md present — OK
- [PASS] epoch_align_json_final_seqId: ALIGN.json final_seqId=103 matches lock — OK

## FAILED
- NONE
