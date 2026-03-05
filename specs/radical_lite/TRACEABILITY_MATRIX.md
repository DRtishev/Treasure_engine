# RADICAL-LITE — Traceability Matrix

> Requirement → Code → Gate → Evidence

---

## R1: Safety Live Core

| ID | Requirement | Code Path | Fast Gate | Deep Gate | Evidence |
|----|------------|-----------|-----------|-----------|---------|
| R1.1 | Intent idempotency | `core/exec/master_executor.mjs::_checkIntentIdempotency` | RG_IDEMPOTENCY_FAST01 | RG_IDEMPOTENCY_E2E01 | EPOCH-RADLITE-R1/idempotency_proof.md |
| R1.2 | Kill persistence | `core/live/safety_loop.mjs` + `core/persist/repo_state.mjs` | RG_HALT_DOUBLEKEY_FAST01 | RG_KILL_PERSIST_E2E01 | EPOCH-RADLITE-R1/kill_persist_proof.md |
| R1.3 | HALT double-key reset | `core/governance/mode_fsm.mjs::requestManualReset` | RG_HALT_DOUBLEKEY_FAST01 | (covered by persist E2E) | EPOCH-RADLITE-R1/halt_doublekey_proof.md |
| R1.4 | Real kill metrics | `core/exec/master_executor.mjs::getKillSwitchMetrics` | RG_IDEMPOTENCY_FAST01 | RG_KILL_METRICS_E2E01 | EPOCH-RADLITE-R1/kill_metrics_proof.md |

## R2: Profit Truth Core

| ID | Requirement | Code Path | Fast Gate | Deep Gate | Evidence |
|----|------------|-----------|-----------|-----------|---------|
| R2.1 | PnL Attribution (4-component) | `core/profit/ledger.mjs` | RG_PNL_ATTRIBUTION_FAST01 | RG_ATTRIBUTION_E2E01 | EPOCH-RADLITE-R2/attribution_proof.md |
| R2.2 | Fill Quality Monitor | `core/edge/fill_quality.mjs` (new) | RG_PARITY_SCORE_FAST01 | RG_FILL_QUALITY_E2E01 | EPOCH-RADLITE-R2/fill_quality_proof.md |
| R2.3 | Paper↔Live Parity Score | `core/recon/parity_score.mjs` (new) | RG_PARITY_SCORE_FAST01 | RG_PARITY_E2E02 | EPOCH-RADLITE-R2/parity_proof.md |
| R2.4 | Real-time PnL Reconciliation | `core/recon/reconcile_v1.mjs` (enhanced) | RG_PNL_ATTRIBUTION_FAST01 | RG_RECON_E2E02 | EPOCH-RADLITE-R2/recon_proof.md |

## R3: Speed/Ergonomics

| ID | Requirement | Code Path | Fast Gate | Deep Gate | Evidence |
|----|------------|-----------|-----------|-----------|---------|
| R3.1 | Fast tiers (instant/full) | `scripts/verify/`, `package.json` | RG_FAST_TIERS_FAST01 | — | EPOCH-RADLITE-R3/fast_tiers_proof.md |
| R3.2 | Script index generator | `scripts/ops/script_index.mjs` (new) | RG_SCRIPT_INDEX_FAST01 | — | EPOCH-RADLITE-R3/script_index_proof.md |
