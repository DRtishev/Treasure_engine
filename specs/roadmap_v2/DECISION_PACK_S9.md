# DECISION PACK — Sprint 9: Real Pipeline Integration

## 1. Canonical Execution Loop

The wiring targets the following runtime paths:

| Path | Entry Point | Current Cost | Target Cost |
|------|------------|--------------|-------------|
| **Paper runner** | `core/paper/paper_live_runner.mjs:paperExecute()` | Legacy feeBps=4, slipBps=2 | computeTotalCost() SSOT |
| **Paper harness** | `core/paper/paper_trading_harness.mjs:runPaperTradingSession()` | calibration.params.slip_mean_bps + hardcoded 0.0004 fee | computeTotalCost() SSOT |
| **Paper real-feed** | `core/paper/e111_paper_live_real_feed_runner.mjs` | Legacy feeBps=4, slipBps=2 | computeTotalCost() SSOT |
| **Backtest** | `core/backtest/engine.mjs:runBacktest()` | Opt-in via use_cost_model | Default ON for paper/micro-live modes |
| **Dryrun E2E** | `scripts/verify/dryrun_live_e2e_v2.mjs` | No cost model | Verify cost model in pipeline |

## 2. Wiring Strategy

### A) Cost Model (computeTotalCost SSOT)

**Where integrated:**
1. `core/paper/paper_live_runner.mjs:paperExecute()` — replace hardcoded feeBps/slipBps with computeTotalCost() call
2. `core/paper/e111_paper_live_real_feed_runner.mjs` — replace hardcoded feeBps/slipBps with computeTotalCost() call
3. `core/paper/paper_trading_harness.mjs` — replace calibration-based slip + hardcoded fee with computeTotalCost() call

**Backward compatibility:** backtest engine keeps legacy path for non-CERT runs (opts.use_cost_model flag remains). Paper/micro-live paths always use SSOT.

### B) Promotion Ladder (evaluatePromotion)

**Where integrated:**
1. `core/paper/paper_live_runner.mjs:runPaperLiveLoop()` — after loop completes, call evaluatePromotion() with computed metrics and emit PROMOTION_DECISION receipt.

### C) Canary Policy (evaluateCanary)

**Where integrated:**
1. `core/paper/paper_live_runner.mjs:runPaperLiveLoop()` — inside the tick loop, before paperExecute(), call evaluateCanary() with live metrics. If action != CONTINUE, block/flatten/reduce.

## 3. NON-GOALS

- No new simulation engine or market model
- No changes to live/exchange adapter paths (those remain kill-switch only)
- No stochastic components added to cost model
- No network access
- No changes to verify:fast gate structure beyond +2 lightweight gates

## 4. Gate Budget

### verify:fast (+2 lightweight gates)
1. **RG_REALISM_WIRING_FAST01** — grep: paper modules must import computeTotalCost, must NOT have legacy `const feeBps` or `const slipBps` patterns
2. **RG_PROMO_CANARY_WIRING_FAST01** — grep: paper_live_runner.mjs must import evaluatePromotion AND evaluateCanary

### verify:deep (+4 E2E gates)
1. **RG_REALISM06_PAPER_USES_COSTMODEL_E2E** — run paper pipeline, verify cost fields in fills
2. **RG_REALISM07_DRYRUN_USES_COSTMODEL_E2E** — run dryrun pipeline, verify cost model receipt
3. **RG_PROMO03_INTEGRATION_E2E** — run paper loop, verify promotion receipt is generated
4. **RG_CANARY03_INTEGRATION_E2E** — run paper loop with breach, verify canary blocks orders

## 5. Risks and Traps

| Risk | Mitigation |
|------|-----------|
| Paper runner test coverage regression | All existing paper regression gates must still pass |
| Cost model changes break backtest determinism | Backtest legacy path preserved; e108 x2 verifies |
| verify:fast bloat | Budget max +2 gates, grep-only (no execution) |
| Circular import | computeTotalCost import is leaf; no risk |

## 6. Evidence / Receipts

- `COSTMODEL_RECEIPT.md` — emitted by paper runner with cost breakdown
- `PROMOTION_DECISION.md` — emitted after paper loop with verdict
- `CANARY_STATE.md` — emitted when canary triggers action != CONTINUE

## 7. ONE_NEXT_ACTION

Write Sprint 9 spec: `specs/roadmap_v2/SPRINT_9_REAL_PIPELINE_INTEGRATION_SPEC.md`
