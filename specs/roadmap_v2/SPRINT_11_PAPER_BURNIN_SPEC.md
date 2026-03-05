# Sprint 11: Paper Burn-In + Reality Gap — SPEC

## Mission
Prove paper pipeline produces a consistent, reconcilable ledger over a multi-day burn-in scenario. Measure reality gap between default and data-backed params. Generate receipts.

## Invariants

| ID | Invariant | Gate |
|----|-----------|------|
| S11-B1 | Burn-in scenario completes with COMPLETED status | RG_BURNIN01 (deep) |
| S11-B2 | Ledger reconciles: sum(realized_pnl) + unrealized == equity - initial_capital | RG_BURNIN01 (deep) |
| S11-B3 | Reality gap receipt documents param provenance | RG_BURNIN_FAST01 (fast) |
| S11-B4 | Promotion result returned with valid verdict | RG_BURNIN01 (deep) |

## Gates

### verify:fast (+1)
- **RG_BURNIN_FAST01**: Verify REALITY_GAP.md and LEDGER_RECONCILE.md exist and contain required sections

### verify:deep (+1)
- **RG_BURNIN01**: Run multi-day paper burn-in E2E, validate ledger reconciliation, promotion result

## Evidence
- `REALITY_GAP.md` — default vs data-backed param comparison
- `LEDGER_RECONCILE.md` — ledger integrity proof (fills sum, equity check)

## DoD
1. Burn-in E2E gate passes (multi-day scenario, ledger reconciles)
2. REALITY_GAP.md generated with param comparison table
3. LEDGER_RECONCILE.md generated with integrity proof
4. Fast gate validates receipt presence
