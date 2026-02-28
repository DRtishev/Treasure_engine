# REGRESSION_BUS01_DETERMINISM_X2.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 0d8a4b652bff
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] eventbus_script_exists: /home/user/Treasure_engine/scripts/ops/eventbus_v1.mjs
- [PASS] run1_ok: lines=1
- [PASS] run2_ok: lines=1
- [PASS] events_jsonl_byte_stable_x2: hash=1b51431e0f8850e6
- [PASS] events_count_stable: r1=1 r2=1
- [PASS] events_tick_ordered: ticks=[1]
- [PASS] events_ticks_positive: min=1

## FAILED
- NONE
