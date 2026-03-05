# Sprint 12: Micro-Live Canary — SPEC

## Mission
Prove canary policy triggers PAUSE/FLATTEN in micro_live stage. Update runbook with micro_live operating procedures. Generate per-session receipts.

## Invariants

| ID | Invariant | Gate |
|----|-----------|------|
| S12-C1 | Canary triggers PAUSE on daily loss breach in micro_live | RG_CANARY_SESSION01 (deep) |
| S12-C2 | Canary triggers FLATTEN on exposure breach in micro_live | RG_CANARY_SESSION01 (deep) |
| S12-C3 | Per-session receipt generated with canary events | RG_CANARY_SESSION01 (deep) |
| S12-C4 | RUNBOOK has micro_live operating section | RG_CANARY_RUNBOOK_FAST01 (fast) |

## Gates

### verify:fast (+1)
- **RG_CANARY_RUNBOOK_FAST01**: Verify RUNBOOK.md has micro_live section; session receipt format documented

### verify:deep (+1)
- **RG_CANARY_SESSION01**: Run micro_live scenario with tight limits, verify canary fires PAUSE/FLATTEN, generate session receipt

## Evidence
- Per-session receipts under `reports/evidence/EPOCH-V2-S12-CANARY/`
- Updated RUNBOOK.md with micro_live procedures

## DoD
1. Canary E2E triggers PAUSE/FLATTEN in micro_live
2. Per-session receipt generated with canary events
3. RUNBOOK updated with micro_live section
4. All gates pass
