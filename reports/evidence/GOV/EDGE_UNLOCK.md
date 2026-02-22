# EDGE_UNLOCK.md — EDGE/PROFIT Unlock Decision

STATUS: BLOCKED
REASON_CODE: BLOCKED
EDGE_UNLOCK: false
RUN_ID: cad9c4ea3904
NEXT_ACTION: npm run -s p0:all

## Gate Matrix

| Gate | Status | Blocker |
|------|--------|---------|
| INFRA_P0 | FAIL | YES |
| CALM_P0 | PASS | YES |
| CALM_P0_X2 | FAIL | YES |
| OP01_SCRIPTS_CHECK | PASS | YES |
| MERKLE_ROOT | PASS | YES |
| GOV01_INTEGRITY | PASS | YES |
| REASON_CODE_AUDIT | PASS | YES |

## System Pass

- P0_SYSTEM_PASS: false
- P1_SYSTEM_PASS: true

## Blocking Reasons

- INFRA_P0 status=FAIL
- CALM_P0_X2 status=FAIL
- eligible_for_micro_live=false (DEP02: Native build candidates detected via static lock scan: [better-sqlite3@12.6.2]. Native builds require capsule/toolchain policy approval. Cannot claim offline-satisfiable.)
- eligible_for_execution=false
