# REGRESSION_AUTO03_PR_CLEANROOM_APPLIED.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 468e39233712
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] autopilot_script_exists: /home/user/Treasure_engine/scripts/ops/autopilot_court_v2.mjs
- [PASS] has_apply_flag_check: --apply flag check required
- [PASS] has_apply_token_file_check: APPLY_AUTOPILOT token file check required
- [PASS] double_key_unlock_implemented: both flag AND token file required for apply
- [PASS] auto04_refusal_code_present: AUTO04_APPLY_UNLOCK_REQUIRED refusal code required
- [PASS] refusal_md_written_on_failure: REFUSAL.md must be written when apply is refused
- [PASS] gitignore_exists: .gitignore required for PR cleanroom
- [PASS] gitignore_covers_epoch_dirs: .gitignore must cover EPOCH-* dirs under reports/evidence/
- [PASS] gitignore_covers_apply_token: .gitignore should cover artifacts/incoming/APPLY_AUTOPILOT

## FAILED
- NONE
