# REGRESSION_AUTO04_APPLY_UNLOCK_REQUIRED.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3c4ec9aafacb
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] autopilot_script_exists: /home/user/Treasure_engine/scripts/ops/autopilot_court_v2.mjs
- [PASS] case1_apply_no_token_ec2: --apply + no token => expect EC=2, got EC=2
- [PASS] case1_apply_no_token_auto04_code: --apply + no token => AUTO04 code in output (got: [BLOCKED] ops:autopilot — AUTO04_APPLY_UNLOCK_REQUIRED [DRY_RUN(apply_blocked)] mode=CERT
  PLAN:      reports/evidence/)
- [PASS] case2_apply_wrong_token_ec2: --apply + wrong token content => expect EC=2, got EC=2
- [PASS] case2_apply_wrong_token_auto04_code: --apply + wrong token => AUTO04 code in output
- [PASS] case3_apply_correct_token_not_blocked: --apply + correct token => expect EC != 2, got EC=0
- [PASS] case4_dry_run_no_apply_ec0: no --apply => expect EC=0 (dry-run), got EC=0

## FAILED
- NONE
