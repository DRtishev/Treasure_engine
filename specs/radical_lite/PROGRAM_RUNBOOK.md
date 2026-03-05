# RADICAL-LITE — Program Runbook

> Operator commands for each phase.

---

## Phase 0: Baseline

```bash
npm run -s verify:fast          # run1
npm run -s verify:fast          # run2 (x2 determinism)
npm run -s verify:deep          # E2E gates
npm run -s epoch:victory:seal   # seal
```

Evidence: `reports/evidence/EPOCH-RADLITE-BASELINE/`

## Phase R1: Safety Live Core

### Implementation
Apply code changes to:
- `core/exec/master_executor.mjs` — wire intent idempotency
- `core/live/safety_loop.mjs` — kill persistence save/restore
- `core/governance/mode_fsm.mjs` — HALT double-key enforcement
- `core/exec/master_executor.mjs` — real kill metrics

### Verification
```bash
npm run -s verify:fast                    # run1
npm run -s verify:fast                    # run2
npm run -s verify:deep                    # E2E
npm run -s epoch:victory:seal             # seal
```

### New Gates
```bash
npm run -s verify:regression:idempotency-fast01
npm run -s verify:regression:halt-doublekey-fast01
npm run -s verify:deep:idempotency-e2e01
npm run -s verify:deep:kill-persist-e2e01
npm run -s verify:deep:kill-metrics-e2e01
```

Evidence: `reports/evidence/EPOCH-RADLITE-R1/`

## Phase R2: Profit Truth Core

### Implementation
Apply code changes to:
- `core/profit/ledger.mjs` — add funding tracking + attribution breakdown
- `core/edge/fill_quality.mjs` — new fill quality scorer
- `core/recon/parity_score.mjs` — new parity score calculator
- `core/recon/reconcile_v1.mjs` — enhance with funding recon

### Verification
```bash
npm run -s verify:fast                    # run1
npm run -s verify:fast                    # run2
npm run -s verify:deep                    # E2E
npm run -s epoch:victory:seal             # seal
```

### New Gates
```bash
npm run -s verify:regression:pnl-attribution-fast01
npm run -s verify:regression:parity-score-fast01
npm run -s verify:deep:attribution-e2e01
npm run -s verify:deep:fill-quality-e2e01
npm run -s verify:deep:parity-e2e02
npm run -s verify:deep:recon-e2e02
```

Evidence: `reports/evidence/EPOCH-RADLITE-R2/`

## Phase R3: Speed/Ergonomics

### Implementation
- `package.json` — add verify:fast:instant tier
- `scripts/ops/script_index.mjs` — new script index generator
- `scripts/verify/regression_fast_tiers.mjs` — tier budget gate
- `scripts/verify/regression_script_index.mjs` — index freshness gate

### Verification
```bash
npm run -s verify:fast                    # run1
npm run -s verify:fast                    # run2
npm run -s verify:deep                    # E2E
npm run -s epoch:victory:seal             # seal
```

Evidence: `reports/evidence/EPOCH-RADLITE-R3/`

## Final Seal

```bash
npm run -s epoch:victory:seal             # PASS required
```

## Triage (if blocked)

```bash
npm run -s epoch:victory:triage
npm run -s ops:cockpit
npm run -s ops:doctor
```
