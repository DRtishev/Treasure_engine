# PROFILES_INDEX.md — EDGE_PROFIT_00

STATUS: PASS
REASON_CODE: NONE
NEXT_ACTION: npm run -s edge:profit:00:x2

## Active Profile

- active_profile: real
- active_closeout_path: reports/evidence/EDGE_PROFIT_00/real/gates/manual/edge_profit_00_closeout.json
- active_closeout_status: PASS
- active_closeout_reason_code: NONE
- active_evidence_source: REAL

## Release Discipline (contract-aware)

- contract_path: GOV/EXPORT_CONTRACT.md
- contract_state: PASS
- evidence_epoch_resolved: EPOCH-EDGE-RC-STRICT-01
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=235b7adb8106554b3727dcccb7382cdd6b489149fde5d97630f180a5190ca4b0
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=235b7adb8106554b3727dcccb7382cdd6b489149fde5d97630f180a5190ca4b0
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256: PRESENT | sha256=acdf31e3c3588413b944413fee282376e67fb6c9aac9bed4fe91e5da287abfc4

## Available Profiles

| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | next_action |
|---|---|---|---|---|---|
| clean | MISSING | ME01 | UNKNOWN | false | npm run -s edge:profit:00 |
| conflict | MISSING | ME01 | UNKNOWN | false | npm run -s edge:profit:00 |
| missing | MISSING | ME01 | UNKNOWN | false | npm run -s edge:profit:00 |
| real | PASS | NONE | REAL | true | npm run -s edge:profit:00:x2 |
