# REGRESSION_COCKPIT03_INTEGRATION.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: aead54a15263
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] cockpit_script_exists: /home/user/Treasure_engine/scripts/ops/cockpit.mjs
- [PASS] script_has_timemachine_section: timemachine section required in cockpit
- [PASS] script_has_autopilot_section: autopilot section required in cockpit
- [PASS] no_wall_clock_time: no wall-clock time
- [PASS] outputs_hud_json: HUD.json output required
- [PASS] outputs_hud_md: HUD.md output required
- [PASS] epoch_dir_cockpit_pattern: output under EPOCH-COCKPIT-<RUN_ID>
- [PASS] cockpit_runs_without_crash: cockpit exit code=1: [BLOCKED] ops:cockpit — FAST_GATE
  HUD:      reports/evidence/EPOCH-COCKPIT-aead54a15263/HUD.md
  H
- [PASS] hud_json_produced: reports/evidence/EPOCH-COCKPIT-aead54a15263/HUD.json
- [PASS] hud_md_produced: reports/evidence/EPOCH-COCKPIT-aead54a15263/HUD.md
- [PASS] hud_json_has_timemachine: HUD.json.sections.timemachine required
- [PASS] hud_json_has_autopilot: HUD.json.sections.autopilot required
- [PASS] hud_md_has_timemachine_section: HUD.md must contain TIMEMACHINE section
- [PASS] hud_md_has_autopilot_section: HUD.md must contain AUTOPILOT section

## FAILED
- NONE
