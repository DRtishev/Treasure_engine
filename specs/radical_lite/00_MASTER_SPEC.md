# RADICAL-LITE — Master Specification

> Version: 1.0 | Date: 2026-03-05 | Author: Principal Engineer + QA Officer

---

## 1. Program Goal

Make the Treasure Engine core **production-safe, profit-honest, and operator-fast**:

| Phase | Goal | Duration |
|-------|------|----------|
| **R1** Safety Live Core | Close P1 live blockers (idempotency, persistence, halt doctrine, kill metrics) | 3–5 days |
| **R2** Profit Truth Core | PnL attribution + fill quality + paper↔live parity + real-time reconciliation | ~1 week |
| **R3** Speed/Ergonomics | Fast tiers + script index — don't die from verify | 3–5 days |

## 2. Hierarchy

```
Safety > Truth > Profit
```

Every phase MUST pass: `verify:fast x2` (determinism), `verify:deep` (E2E), `epoch:victory:seal` (final).

## 3. Constraints

| ID | Constraint |
|----|-----------|
| C1 | Offline by default — no network unless double-key unlocked |
| C2 | Write-scope: `artifacts/**`, `reports/evidence/EPOCH-*/**`, `specs/**`, `docs/**` |
| C3 | Apply requires double-key: `--apply` flag + `artifacts/incoming/APPLY_AUTOPILOT` |
| C4 | No fabrication — BLOCKED/FAIL when unknown |
| C5 | Determinism x2 — run gates twice, report both |
| C6 | Budget doctrine — verify:fast max +2 light gates per phase |
| C7 | Evidence md-only under `reports/evidence/**` |

## 4. Phase Dependencies

```
BASELINE → R1 (Safety) → R2 (Profit) → R3 (Speed) → SEAL
```

R2 depends on R1 (kill persistence needed for reconciliation recovery).
R3 is independent of R2 content but sequential for gate stability.

## 5. Deliverables

### Specs (this directory)
- `00_MASTER_SPEC.md` — this file
- `TRACEABILITY_MATRIX.md` — requirement → code → gate → evidence
- `PROGRAM_RUNBOOK.md` — operator commands
- `R1_SAFETY_LIVE_CORE_SPEC.md` — R1 phase spec
- `R2_PROFIT_TRUTH_CORE_SPEC.md` — R2 phase spec
- `R3_SPEED_ERGONOMICS_SPEC.md` — R3 phase spec
- `AUDIT_AFTER_R1.md` — template/filled after R1
- `AUDIT_AFTER_R2.md` — template/filled after R2
- `AUDIT_AFTER_R3.md` — template/filled after R3

### Evidence
- `reports/evidence/EPOCH-RADLITE-BASELINE/**` — baseline proof
- `reports/evidence/EPOCH-RADLITE-R1/**` — R1 evidence
- `reports/evidence/EPOCH-RADLITE-R2/**` — R2 evidence
- `reports/evidence/EPOCH-RADLITE-R3/**` — R3 evidence

### Code Changes (per phase)
- R1: `core/exec/`, `core/risk/`, `core/governance/`, `core/live/`, `core/persist/`
- R2: `core/profit/`, `core/recon/`, `core/edge/`, `core/cost/`
- R3: `scripts/verify/`, `scripts/ops/`, `package.json`

### Gates (new)
- R1: 2 fast + 3 deep
- R2: 2 fast + 4 deep
- R3: 2 fast + 0-1 deep

## 6. Quality Bar

- Every new gate: idempotent, offline, deterministic
- Every code change: regression gate + evidence artifact
- Every phase: AUDIT_AFTER_R*.md with honest verdict
- Final: `epoch:victory:seal PASS`

## 7. Risk Register

| Risk | Mitigation |
|------|-----------|
| verify:fast bloat | Budget doctrine C6: max +2 gates/phase |
| Non-determinism leak | x2 anti-flake on every run |
| Regression in existing gates | Full verify:deep after each phase |
| Scope creep | MUST features only; NICE-TO-HAVE deferred |

## 8. Success Criteria

1. All 4 R1 invariants pass with evidence
2. PnL attribution shows 4-component breakdown (fees/slippage/funding/edge)
3. Fill quality metric exists and is deterministic
4. Paper↔live parity score is computable
5. verify:fast stays under budget (+6 gates total)
6. epoch:victory:seal PASS at program end
