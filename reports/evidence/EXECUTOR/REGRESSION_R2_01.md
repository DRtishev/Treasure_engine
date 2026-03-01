# REGRESSION_R2_01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 4eecd5118e0e
NEXT_ACTION: npm run -s verify:regression:r2-01-no-daily-wiring

## POLICY
- verify:fast MUST NOT contain verify:r2:* (R2 gates are research-only)
- ops:life MUST NOT contain verify:r2:* (daily chain must stay clean)
- R2 gates run only via verify:r2:okx-orderbook until lane is TRUTH_READY

## CHECKS
- [PASS] package_json_parseable: JSON parse OK
- [PASS] verify_fast_no_r2_wiring: verify:fast has no verify:r2:* — OK
- [PASS] ops_life_script_no_r2_wiring: ops:life script has no verify:r2:* — OK
- [PASS] life_mjs_no_r2_wiring: scripts/ops/life.mjs has no verify:r2:* — OK
- [PASS] verify_r2_okx_orderbook_script_exists: verify:r2:okx-orderbook script present — OK
- [PASS] verify_r2_preflight_script_exists: verify:r2:preflight script present — OK

## FAILED
- NONE
