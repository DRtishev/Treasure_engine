# REGRESSION_BUS01_DETERMINISM_X2.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3c4ec9aafacb
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] eventbus_script_exists: /home/user/Treasure_engine/scripts/ops/eventbus_v1.mjs
- [PASS] run1_ok: lines=5
- [PASS] run2_ok: lines=5
- [PASS] events_jsonl_byte_stable_x2: hash=60b0fbd24ce5c29b
- [PASS] events_count_stable: r1=5 r2=5
- [PASS] events_tick_ordered: ticks=[1,2,3,4,5]
- [PASS] events_ticks_positive: min=1

## FAILED
- NONE
