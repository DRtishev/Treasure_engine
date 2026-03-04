# RG_COCKPIT_DYNAMIC_NEXT01: Cockpit Dynamic Next Action

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:cockpit-dynamic-next01
CHECKS_TOTAL: 4
VIOLATIONS: 0

## CHECKS
- [PASS] has_computeNextAction: OK: computeNextAction function present
- [PASS] hud_json_uses_dynamic: OK: HUD.json next_action uses computeNextAction()
- [PASS] hud_md_one_next_action_header: OK: ONE_NEXT_ACTION header present
- [PASS] hud_md_not_hardcoded: OK: HUD.md uses dynamic computeNextAction()

## FAILED
- NONE
