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
- active_promotion_reason: EP02_REAL_REQUIRED: evidence_source is not REAL.

## Release Discipline (contract-aware)

- contract_path: GOV/EXPORT_CONTRACT.md
- contract_state: PASS
- evidence_epoch_resolved: EPOCH-EDGE-RC-STRICT-01
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=04dca1d987c98ad7f8711e2284304fb09720752bf60d7c460af5d9a225d3758b
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=04dca1d987c98ad7f8711e2284304fb09720752bf60d7c460af5d9a225d3758b
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256: PRESENT | sha256=aa25c62f41530e6bfe109c3220421c19c0df55af60116c7a9a366a0d31949897

## Available Profiles

| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | promotion_eligible | next_action |
|---|---|---|---|---|---|---|
| clean | PASS | NONE | UNKNOWN | false | false | npm run -s edge:profit:00:x2 |
| conflict | BLOCKED | DC90 | UNKNOWN | false | false | npm run -s edge:profit:00:expect-blocked:conflict |
| missing | NEEDS_DATA | NDA02 | UNKNOWN | false | false | npm run -s edge:profit:00:sample:missing |
| real | PASS | NONE | REAL_SANDBOX | false | false | npm run -s edge:profit:00:x2 |
| sandbox | MISSING | ME01 | UNKNOWN | false | false | npm run -s edge:profit:00 |
| stub | PASS | NONE | FIXTURE_STUB | false | false | npm run -s edge:profit:00:x2 |
