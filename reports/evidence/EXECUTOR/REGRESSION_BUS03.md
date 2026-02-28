# REGRESSION_BUS03.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 39e1005c74fc
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] cockpit_script_exists: /home/user/Treasure_engine/scripts/ops/cockpit.mjs
- [PASS] cockpit_run1_ok: path=reports/evidence/EPOCH-COCKPIT-40c3f98677b5/HUD.json
- [PASS] cockpit_run2_ok: path=reports/evidence/EPOCH-COCKPIT-40c3f98677b5/HUD.json
- [PASS] hud_json_byte_identical_x2: hash=7745fede5beb56a7… — OK
- [PASS] eventbus_exports_mergeAndSortEvents: mergeAndSortEvents export required for BUS03
- [PASS] findAllBusJsonls_no_mtime: no mtime API calls in eventbus_v1.mjs — OK
- [PASS] cockpit_uses_mergeAndSortEvents: cockpit uses mergeAndSortEvents — OK

## FAILED
- NONE
