# REGRESSION_AUTO01_MODE_ROUTER.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3c4ec9aafacb
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] autopilot_script_exists: /home/user/Treasure_engine/scripts/ops/autopilot_court_v2.mjs
- [PASS] mode_declared_CERT: mode CERT must be in VALID_MODES
- [PASS] mode_declared_CLOSE: mode CLOSE must be in VALID_MODES
- [PASS] mode_declared_AUDIT: mode AUDIT must be in VALID_MODES
- [PASS] mode_declared_RESEARCH: mode RESEARCH must be in VALID_MODES
- [PASS] mode_declared_ACCEL: mode ACCEL must be in VALID_MODES
- [PASS] has_mode_detection: detectMode function required
- [PASS] has_mode_routing: routing logic required (routeMode/modeViolations)
- [PASS] cert_enforces_offline_netv01: CERT mode must emit NETV01 on network
- [PASS] outputs_plan_json: PLAN.json output required
- [PASS] outputs_plan_md: PLAN.md output required
- [PASS] outputs_refusal_md: REFUSAL.md output required
- [PASS] epoch_dir_autopilotv2_pattern: output under EPOCH-AUTOPILOTV2-<RUN_ID>

## FAILED
- NONE
