# REGRESSION_OB_OKX09.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 62541b39a279
NEXT_ACTION: npm run -s verify:regression:ob-okx09-duplicate-idempotent

## POLICY
- Dedup by seqId: if seqId already seen, skip the message
- Duplicates must not change the canonical book digest
- Duplicates must not corrupt the seq-state chain

## CHECKS
- [PASS] single_dup_digest_unchanged: clean=aebc0639309c09c1 dup=aebc0639309c09c1 — EQUAL OK
- [PASS] single_dup_counted: dedup_count=1 — OK
- [PASS] multi_dup_digest_unchanged: multi-dup: clean==dup digest — OK
- [PASS] multi_dup_counted: dedup_count=3 — OK
- [PASS] no_dup_dedup_count_zero: no duplicates: dedup_count=0 — OK
- [PASS] dup_does_not_corrupt_state: dup rejected: bids=[["49100","0.5"],["49000","1.0"]] — 49200 not applied — OK

## FAILED
- NONE
