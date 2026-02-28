# REGRESSION_COCKPIT05_LINKS_EXIST.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: aead54a15263
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] cockpit_script_exists: /home/user/Treasure_engine/scripts/ops/cockpit.mjs
- [PASS] declares_evidence_paths: evidence_paths array required in HUD.json
- [PASS] cockpit_runs_without_crash: exit code=1: [BLOCKED] ops:cockpit — FAST_GATE
  HUD:      reports/evidence/EPOCH-COCKPIT-aea
- [PASS] evidence_paths_is_array: 2 paths declared
- [PASS] all_evidence_paths_exist: all 2 evidence_paths exist
- [PASS] hud_md_exists: reports/evidence/EPOCH-COCKPIT-aead54a15263/HUD.md
- [PASS] hud_has_schema_version: schema_version=1.0.0
- [PASS] hud_has_timemachine_section: timemachine section present
- [PASS] hud_has_autopilot_section: autopilot section present

## FAILED
- NONE
