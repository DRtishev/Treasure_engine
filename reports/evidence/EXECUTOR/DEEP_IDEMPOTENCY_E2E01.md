# RG_IDEMPOTENCY_E2E01: Intent Idempotency E2E

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
CHECKS: 4
VIOLATIONS: 0

- [PASS] first_intent_succeeds: OK: first intent executed
- [PASS] duplicate_intent_rejected: OK: duplicate rejected
- [PASS] only_one_order_placed: OK: 1 order
- [PASS] different_intent_succeeds: OK: different intent_id accepted
