# PROFILES_INDEX.md — EDGE_PROFIT_00

STATUS: PASS
REASON_CODE: NONE
NEXT_ACTION: npm run -s edge:profit:00:expect-blocked:conflict

## Active Profile

- active_profile: conflict
- profile_marker_path: artifacts/incoming/paper_telemetry.profile
- active_closeout_path: reports/evidence/EDGE_PROFIT_00/conflict/gates/manual/edge_profit_00_closeout.json
- active_closeout_status: BLOCKED
- active_closeout_reason_code: DC90

## Available Profiles

| profile | closeout_status | closeout_reason_code | next_action |
|---|---|---|---|
| clean | PASS | NONE | npm run -s edge:profit:00:x2 |
| conflict | BLOCKED | DC90 | npm run -s edge:profit:00:expect-blocked:conflict |
| missing | NEEDS_DATA | NDA02 | npm run -s edge:profit:00:sample:missing |
