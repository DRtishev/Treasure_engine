# PROFILES_INDEX.md — EDGE_PROFIT_00

STATUS: PASS
REASON_CODE: NONE
NEXT_ACTION: npm run -s edge:profit:00:x2

## Active Profile

- active_profile: real
- active_closeout_path: reports/evidence/EDGE_PROFIT_00/real/gates/manual/edge_profit_00_closeout.json
- active_closeout_status: PASS
- active_closeout_reason_code: NONE
- active_evidence_source: FIXTURE_STUB
- active_promotion_eligible: false
- active_promotion_reason: EP02_REAL_REQUIRED: evidence_source is not REAL.

## Release Discipline (contract-aware)

- contract_path: GOV/EXPORT_CONTRACT.md
- contract_state: PASS
- evidence_epoch_resolved: EPOCH-EDGE-RC-STRICT-01
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=355cb8dda9c38678f4766142973c4d34b75298a416292a5e9fe5c59d1faa1eaf
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=355cb8dda9c38678f4766142973c4d34b75298a416292a5e9fe5c59d1faa1eaf
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256: PRESENT | sha256=86cd748405ab0925dcb40b26f5796804f69fe94d7ce7dfc44fa0aa88cda8d7a4

## Available Profiles

| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | promotion_eligible | next_action |
|---|---|---|---|---|---|---|
| clean | MISSING | ME01 | UNKNOWN | false | false | npm run -s edge:profit:00 |
| conflict | MISSING | ME01 | UNKNOWN | false | false | npm run -s edge:profit:00 |
| missing | MISSING | ME01 | UNKNOWN | false | false | npm run -s edge:profit:00 |
| real | PASS | NONE | FIXTURE_STUB | false | false | npm run -s edge:profit:00:x2 |
