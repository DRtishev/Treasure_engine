# REGRESSION_NET_TOOLCHAIN01.md

STATUS: FAIL
REASON_CODE: NET_TOOLCHAIN01_VIOLATION
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] verify_fast_calls_ensure_not_acquire: verify:fast calls toolchain:ensure (offline) — OK
- [PASS] ensure_script_exists: /home/user/Treasure_engine/scripts/ops/node_toolchain_ensure.mjs
- [PASS] ensure_no_network_calls: no curl/wget/fetch — OK
- [PASS] acquire_requires_double_key: acquire enforces double-key unlock — OK
- [FAIL] vendored_toolchain_binary_present: vendored node binary missing
- [PASS] acquire_blocked_without_double_key: acquire exits 2 (BLOCKED) without double-key — OK

## FAILED
- vendored_toolchain_binary_present: vendored node binary missing
