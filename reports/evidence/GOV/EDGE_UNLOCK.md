# EDGE_UNLOCK.md — EDGE/PROFIT Unlock Decision

STATUS: PASS
EDGE_UNLOCK: true
RUN_ID: 74a96076b41f
NEXT_ACTION: EDGE_UNLOCK=true. System ready for controlled micro-live operations (subject to ZW00 enforcement).

## Unlock Policy

EDGE/PROFIT unlock requires BOTH:
- P0 SYSTEM PASS: INFRA_P0 PASS + CALM_P0 PASS + eligibility flags true (no DEP/FG01/ZW01 blocks)
- P1 SYSTEM PASS: Merkle root anchored + GOV01 integrity PASS (no manual edits)

## Gate Matrix

| Gate | Status | eligible_for_micro_live | Blocker |
|------|--------|------------------------|---------|
| INFRA_P0 | PASS | true | YES |
| CALM_P0 | PASS | - | YES |
| MERKLE_ROOT | PASS | - | YES |
| GOV01_INTEGRITY | PASS | - | YES |

## P0 System Pass

P0_SYSTEM_PASS: true
- INFRA_P0 status: PASS
- CALM_P0 status: PASS
- eligible_for_micro_live: true
- eligible_for_execution: true

## P1 System Pass

P1_SYSTEM_PASS: true
- MERKLE_ROOT status: PASS
- GOV01_INTEGRITY status: PASS

## Blocking Reasons

NONE — all gates pass

## Non-Goals

- This unlock does NOT enable live trading.
- ZW00 kill switch remains active in all modes.
- ELIGIBLE_FOR_MICRO_LIVE=true only when DEP/FG01/ZW01 all clear.

## Evidence Paths

- reports/evidence/GOV/EDGE_UNLOCK.md
- reports/evidence/GOV/gates/manual/edge_unlock.json
- reports/evidence/GOV/MERKLE_ROOT.md
- reports/evidence/GOV/GOV01_EVIDENCE_INTEGRITY.md
- reports/evidence/INFRA_P0/INFRA_P0_CLOSEOUT.md
- reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md
