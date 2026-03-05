# Decision Pack — Sprint 11: Paper Burn-In + Reality Gap

## Context
S10 established acquire→lock→replay infrastructure with CALIBRATION_CONTRACT tracking param provenance.
All params currently DEFAULT source. S11 proves the paper pipeline works end-to-end over a multi-day burn-in.

## Wiring Strategy
1. **Burn-in E2E** (deep gate): Run `runPaperLiveLoop` with 200+ ticks spanning multi-day scenario
   - Verify ledger reconciliation: sum(realized_pnl) + unrealized == total_pnl
   - Verify fees and slippage tracked correctly
   - Verify promotion result returned
2. **REALITY_GAP.md**: Document gap between DEFAULT params and what real exchange data would provide
3. **LEDGER_RECONCILE.md**: Prove ledger arithmetic is correct with specific numbers from burn-in
4. **Fast gate**: Static check that receipt files exist with required sections

## Risk
- No real data yet (ALLOW_NETWORK absent) → reality gap measured as "unknown, all defaults"
- Paper loop is deterministic → burn-in results reproducible

## Decision
Proceed with burn-in using default cost model params. Reality gap documented as BLOCKED NEEDS_DATA for data-backed columns.
