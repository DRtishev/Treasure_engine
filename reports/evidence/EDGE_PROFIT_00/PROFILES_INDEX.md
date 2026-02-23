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
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=e175cae7f1dbfbf34ba89566ce68550010a1c8777f4c5c5acd74a2c8a3357fbf
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz: PRESENT | sha256=e175cae7f1dbfbf34ba89566ce68550010a1c8777f4c5c5acd74a2c8a3357fbf
- reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256: PRESENT | sha256=f3c7b20ab33bb6ee9de2ea135172c998c909896afbec1dce8b5422d985f46ab9

## Available Profiles

| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | promotion_eligible | next_action |
|---|---|---|---|---|---|---|
| clean | PASS | NONE | UNKNOWN | false | false | npm run -s edge:profit:00:x2 |
| conflict | BLOCKED | DC90 | UNKNOWN | false | false | npm run -s edge:profit:00:expect-blocked:conflict |
| missing | NEEDS_DATA | NDA02 | UNKNOWN | false | false | npm run -s edge:profit:00:sample:missing |
| real | PASS | NONE | FIXTURE_STUB | false | false | npm run -s edge:profit:00:x2 |
