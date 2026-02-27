# PROFILES_INDEX.md — EDGE_PROFIT_00

STATUS: PASS
REASON_CODE: NONE
NEXT_ACTION: npm run -s edge:profit:00:x2

## Executor Lane Summary

- lane_a_status: PASS
- lane_b_status: NEEDS_DATA
- lane_b_mode: DRY_RUN
- commands_next_action: npm run -s executor:run:chain

## Active Profile

- active_profile: stub
- active_closeout_path: reports/evidence/EDGE_PROFIT_00/stub/gates/manual/edge_profit_00_closeout.json
- active_closeout_status: PASS
- active_closeout_reason_code: NONE
- active_evidence_source: FIXTURE_STUB
- active_promotion_eligible: false
- active_promotion_reason: EP02_REAL_REQUIRED: evidence_source is not REAL/REAL_PUBLIC.

## Release Discipline (contract-aware)

- contract_path: GOV/EXPORT_CONTRACT.md
- contract_state: PASS
- evidence_epoch_resolved: EPOCH-EDGE-RC-STRICT-01
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=461598f7846933e43a34868c8791e6f621bfd18c784d0d16b443aa183693c91e
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=461598f7846933e43a34868c8791e6f621bfd18c784d0d16b443aa183693c91e
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256: PRESENT | sha256=e714b8da7c803317ebf0836a6a5ecb78dbed3c1001403c37ab0ccd79035f1e14

## Public Profile Snapshot

- public_lock_exists: false
- public_lock_path: artifacts/incoming/real_public_market.lock.md
- public_lock_json_path: artifacts/incoming/real_public_market.lock.json
- public_market_path: artifacts/incoming/real_public_market.jsonl
- public_telemetry_csv_path: artifacts/incoming/paper_telemetry.csv
- public_provider_id: UNKNOWN
- public_anchor_server_time_ms: MISSING
- public_anchor_end_ms: MISSING
- public_dataset_sha256: MISSING
- public_telemetry_sha256: MISSING
- public_profile_promotion_eligible: false
- public_route: UNKNOWN
- public_net_family: UNKNOWN
- public_root_cause_code: NONE
- public_sentinel_exists: false
- public_summary: route=UNKNOWN | net_family=UNKNOWN | root_cause_code=NONE | sentinel_exists=false

## Available Profiles

| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | promotion_eligible | micro_live_eligible | next_action |
|---|---|---|---|---|---|---|---|
| clean | PASS | NONE | UNKNOWN | false | false | false | npm run -s edge:profit:00:x2 |
| conflict | BLOCKED | DC90 | UNKNOWN | false | false | false | npm run -s edge:profit:00:expect-blocked:conflict |
| missing | NEEDS_DATA | NDA02 | UNKNOWN | false | false | false | npm run -s edge:profit:00:sample:missing |
| real | PASS | NONE | REAL_SANDBOX | false | false | false | npm run -s edge:profit:00:x2 |
| sandbox | PASS | NONE | REAL_SANDBOX | false | false | false | npm run -s edge:profit:00:x2 |
| stub | PASS | NONE | FIXTURE_STUB | false | false | false | npm run -s edge:profit:00:x2 |
