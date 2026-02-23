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
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=7f17664a5147c09ef85c4a8d3c781a7232bedd661d54df318017974d7cd43475
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=7f17664a5147c09ef85c4a8d3c781a7232bedd661d54df318017974d7cd43475
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256: PRESENT | sha256=9366c6aa79f4087b12238cbbb6ef7dc6dfa43688f85183510b1ce9b210376ea0

## Available Profiles

| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | next_action |
|---|---|---|---|---|---|
| clean | PASS | NONE | UNKNOWN | false | npm run -s edge:profit:00:x2 |
| conflict | BLOCKED | DC90 | UNKNOWN | false | npm run -s edge:profit:00:expect-blocked:conflict |
| missing | NEEDS_DATA | NDA02 | UNKNOWN | false | npm run -s edge:profit:00:sample:missing |
| real | PASS | NONE | REAL | true | npm run -s edge:profit:00:x2 |
