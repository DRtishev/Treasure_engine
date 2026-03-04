# REGRESSION_TOOLCHAIN_REASON02.md — Toolchain Detail Required

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] detail_is_object: detail assigned as object — OK
- [PASS] detail_has_kind_field: detail.kind present — OK
- [PASS] detail_has_message_field: detail.message present — OK
- [PASS] detail_has_next_action_field: detail.next_action present — OK
- [PASS] detail_next_action_is_bootstrap: next_action references "npm run -s ops:node:toolchain:bootstrap" — OK
- [PASS] receipt_pass_no_detail_check_needed: status=PASS — OK

## FAILED
- NONE
