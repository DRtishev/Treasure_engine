# AUDIT AFTER R2 — Profit Truth Core

> Date: 2026-03-05 | Auditor: Principal Engineer + QA Officer

---

## SNAPSHOT

R2 Profit Truth Core: 4 invariants enforced (PnL attribution, fill quality, parity score, real-time recon), 6 new gates (2 fast + 4 deep), all existing gates unbroken.

## WHAT_CHANGED

| Path | Change |
|------|--------|
| core/profit/ledger.mjs | R2.1: added funding field, total_funding tracking, getAttribution() 4-component PnL |
| core/edge/fill_quality.mjs | R2.2: NEW — fill quality monitor (hidden_bps, fee_surprise, quality_score) |
| core/recon/parity_score.mjs | R2.3: NEW — paper↔live parity score (4-dimension composite) |
| core/recon/reconcile_v1.mjs | R2.4: added FUNDING_MISMATCH, ReconAction enum, reconcileIncremental() |
| package.json | Added 6 new gate script entries + wired into verify:fast and verify:deep |
| scripts/verify/regression_pnl_attribution_fast01.mjs | New: RG_PNL_ATTRIBUTION_FAST01 |
| scripts/verify/regression_parity_score_fast01.mjs | New: RG_PARITY_SCORE_FAST01 |
| scripts/verify/deep_attribution_e2e01.mjs | New: RG_ATTRIBUTION_E2E01 |
| scripts/verify/deep_fill_quality_e2e01.mjs | New: RG_FILL_QUALITY_E2E01 |
| scripts/verify/deep_parity_e2e02.mjs | New: RG_PARITY_E2E02 |
| scripts/verify/deep_recon_e2e02.mjs | New: RG_RECON_E2E02 |

## COMMANDS_EXECUTED

| # | Command | Exit Code | Notes |
|---|---------|-----------|-------|
| 1 | `npm run -s verify:fast` (run1) | 0 | ALL PASS (64 gates incl 2 new R2 fast) |
| 2 | `npm run -s verify:fast` (run2) | 0 | ALL PASS (deterministic) |
| 3 | `npm run -s verify:deep` | 0 | ALL PASS (25 gates incl 4 new R2 deep) |
| 4 | `npm run -s epoch:victory:seal` | (pending) | After final commit |

## GATE_MATRIX

| Gate | Verdict | Reason Code | Surface |
|------|---------|-------------|---------|
| RG_PNL_ATTRIBUTION_FAST01 | PASS | NONE | getAttribution exports, 4-component decomposition |
| RG_PARITY_SCORE_FAST01 | PASS | NONE | computeParityScore exports, 0-100 range |
| RG_ATTRIBUTION_E2E01 | PASS | NONE | edge > net, costs sum correctly, funding attribution |
| RG_FILL_QUALITY_E2E01 | PASS | NONE | Quality score 0-100, hidden/fee surprise bps |
| RG_PARITY_E2E02 | PASS | NONE | Perfect parity=100, degraded<100, composite correct |
| RG_RECON_E2E02 | PASS | NONE | No-drift OK, price-halt, fee-warn, funding-drift |
| (all existing fast gates) | PASS | NONE | No regression |
| (all existing deep gates) | PASS | NONE | No regression |

## DETERMINISM

Two-run verify:fast: identical output, ALL 64 gates PASS both runs.

## PERFORMANCE

| Metric | Value |
|--------|-------|
| verify:fast duration | ~70s |
| ms-per-gate (fast) | ~1094ms (64 gates) |
| verify:deep duration | ~13s |
| ms-per-gate (deep) | ~520ms (25 gates) |

## EVIDENCE_PATHS

- `reports/evidence/EPOCH-RADLITE-R2/attribution_proof.md`
- `reports/evidence/EPOCH-RADLITE-R2/fill_quality_proof.md`
- `reports/evidence/EPOCH-RADLITE-R2/parity_proof.md`
- `reports/evidence/EPOCH-RADLITE-R2/recon_proof.md`

## VERDICT

**PASS** — All 4 R2 invariants enforced with evidence. No regression in existing gates.

## ONE_NEXT_ACTION

```bash
cat specs/radical_lite/R3_SPEED_ERGONOMICS_SPEC.md
```
