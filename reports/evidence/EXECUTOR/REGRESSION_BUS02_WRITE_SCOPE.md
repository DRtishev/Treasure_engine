# REGRESSION_BUS02_WRITE_SCOPE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3c4ec9aafacb
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] eventbus_script_exists: /home/user/Treasure_engine/scripts/ops/eventbus_v1.mjs
- [PASS] output_uses_epoch_eventbus_pattern: output path must include EPOCH-EVENTBUS-
- [PASS] no_executor_writes_in_bus: OK
- [PASS] uses_write_json_deterministic: deterministic JSON required
- [PASS] no_wall_clock_in_bus: OK
- [PASS] ticks_not_random: tick counter is deterministic
- [PASS] latest_epoch_by_lex_not_mtime: lexicographic sort used

## FAILED
- NONE
