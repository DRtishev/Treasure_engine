# FORMAT_POLICY_GATE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3d37e68311e2
NEXT_ACTION: Migrate 3 legacy EDGE_LAB gate JSON files to schema_version in a follow-up PR.

## Gate Results

| Check | Result |
|-------|--------|
| policy_file | PRESENT |
| strict_json_checked | 6 (P0 + INFRA_P0) |
| legacy_json_checked | 5 (pre-existing EDGE_LAB) |
| strict_violations | 0 |
| legacy_warnings | 3 (WARN only, migration scheduled) |

## Strict-Scope Violations (FAIL if any)

- NONE

## Legacy Warnings (WARN only — pre-existing, migration scheduled)

- **WARN** `reports/evidence/EDGE_LAB/gates/manual/ledger_acyclicity.json`: missing schema_version [MIGRATION_SCHEDULED]
- **WARN** `reports/evidence/EDGE_LAB/gates/manual/paper_evidence.json`: missing schema_version [MIGRATION_SCHEDULED]
- **WARN** `reports/evidence/EDGE_LAB/gates/manual/profit_candidates_court.json`: missing schema_version; forbidden timestamp field(s) [MIGRATION_SCHEDULED]

## Scope Policy

- **STRICT** (P0 + INFRA_P0 new files): violations cause FAIL FP01
- **LEGACY** (pre-existing EDGE_LAB gate JSON): violations cause WARN only; migration to schema_version scheduled

## Message

Format policy satisfied (strict scope). 6 new JSON file(s) verified. 3 legacy file(s) queued for schema_version migration.

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/format_policy_gate.json
- reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md
