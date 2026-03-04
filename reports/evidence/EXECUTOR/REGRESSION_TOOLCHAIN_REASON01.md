# REGRESSION_TOOLCHAIN_REASON01.md — Toolchain Reason Classification

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] case1_lock_missing_yields_ACQ_LOCK01: ACQ_LOCK01 used when lock absent — OK
- [PASS] case2_binary_missing_yields_NT02: NT02 used for toolchain_binary_missing — OK
- [PASS] case3_not_executable_yields_NT02: NT02 used for toolchain_not_executable — OK
- [PASS] case4_wrong_version_yields_NT02: NT02 used for toolchain_wrong_version — OK
- [PASS] anti_NETV01_forbidden_in_ensure: NETV01 not assigned in ensure — OK
- [PASS] all_detail_kinds_present: all detail.kind values present — OK
- [PASS] live_receipt_reason_code_not_NETV01: live receipt reason_code=NONE — OK

## FAILED
- NONE
