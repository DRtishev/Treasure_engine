# REGRESSION_OB_OKX01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c7c93c538a8c
NEXT_ACTION: npm run -s verify:regression:ob-okx01-fixture-integrity

## FIXTURE_PATH
- artifacts/fixtures/okx/orderbook/main/fixture.jsonl
- artifacts/fixtures/okx/orderbook/main/lock.json

## CHECKS
- [PASS] fixture_file_exists: fixture.jsonl present — OK
- [PASS] lock_file_exists: lock.json present — OK
- [PASS] lock_parseable: lock.json parse OK
- [PASS] fixture_non_empty: fixture has 6 line(s)
- [PASS] all_lines_parseable: all 6 lines are valid JSON
- [PASS] messages_n_matches_lock: messages_n=6 — OK
- [PASS] all_messages_have_required_fields: all 6 messages have action, data[0].seqId/prevSeqId/bids/asks — OK
- [PASS] fixture_has_boot_snapshot: 2 snapshot(s) with prevSeqId=-1 found — OK

## FAILED
- NONE
