# REGRESSION_OB_OKX02.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 62541b39a279
NEXT_ACTION: npm run -s verify:regression:ob-okx02-lock-integrity

## POLICY
- lock.json must have all required fields
- raw_sha256 must match actual fixture.jsonl content
- canonical_book_digest_sha256 must be valid sha256 hex

## CHECKS
- [PASS] lock_parseable: JSON parse OK
- [PASS] lock_required_fields_present: all 8 required fields present — OK
- [PASS] lock_provider_id_valid: provider_id=okx_orderbook_ws — OK
- [PASS] lock_schema_version_valid: schema_version=okx_orderbook_ws.r2_preflight.v1 — OK
- [PASS] raw_sha256_matches_fixture: raw_sha256=8f46bcf41433b40a... — matches fixture — OK
- [PASS] canonical_book_digest_sha256_format: canonical_book_digest_sha256=9805f4ad64e69e1e... — OK
- [PASS] lock_messages_n_positive: messages_n=6 — OK
- [PASS] lock_events_expected_array: events_expected=[BOOK_BOOT, BOOK_APPLY, BOOK_APPLY, BOOK_RESET, BOOK_APPLY, BOOK_APPLY] — OK
- [PASS] lock_events_expected_has_boot: events_expected includes BOOK_BOOT — OK

## FAILED
- NONE
