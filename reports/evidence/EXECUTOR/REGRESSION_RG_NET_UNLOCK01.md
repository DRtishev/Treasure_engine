# REGRESSION_RG_NET_UNLOCK01.md — Net Unlock File Contract

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 2c6ea43a6ce4
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] unlock_creates_exact_content: creates "ALLOW_NETWORK: YES" — OK
- [PASS] unlock_tamper_detection: tamper detection present — OK
- [PASS] unlock_idempotent: idempotent already_unlocked path present — OK
- [PASS] lock_removes_file: unlinkSync present — OK
- [PASS] lock_fail_closed_if_absent: lock_without_unlock fail-closed — OK
- [PASS] lock_fail_closed_if_wrong_content: tamper_detected fail-closed — OK
- [PASS] allow_network_absent_daily: ALLOW_NETWORK absent — OK

## FAILED
- NONE
