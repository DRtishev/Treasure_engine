# REGRESSION_COCKPIT06.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 39e1005c74fc
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] cockpit_script_exists: /home/user/Treasure_engine/scripts/ops/cockpit.mjs
- [PASS] cockpit_has_collect_readiness: collectReadiness function present — OK
- [PASS] cockpit_has_readiness_section: DATA READINESS section in HUD.md — OK
- [PASS] cockpit_has_per_lane_output: per_lane field in readiness section — OK
- [PASS] cockpit_runs_ok: cockpit exits 0 — OK
- [PASS] hud_json_written: reports/evidence/EPOCH-COCKPIT-39e1005c74fc/HUD.json
- [PASS] hud_json_parseable: JSON parse OK
- [PASS] hud_has_readiness_section: sections.readiness present — OK
- [PASS] readiness_has_status: readiness.status=PASS
- [PASS] readiness_has_per_lane_array: per_lane_n=4
- [PASS] per_lane_entries_have_required_fields: all 4 lane entries valid — OK
- [PASS] per_lane_sorted_by_lane_id: per_lane sorted — OK

## FAILED
- NONE
