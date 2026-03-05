# R2.1 PnL Attribution Proof

## Gate: RG_PNL_ATTRIBUTION_FAST01 + RG_ATTRIBUTION_E2E01

### Implementation

- `core/profit/ledger.mjs`: Added `funding` field to fill records, `total_funding` to ledger state
- New export `getAttribution(ledger, prices)` returns 4-component decomposition:
  - `gross_pnl`: realized + unrealized
  - `fees_cost`, `slippage_cost`, `funding_cost`: tracked per-fill
  - `net_pnl`: gross after costs
  - `edge_pnl`: net + total_costs (raw edge)

### Evidence

- Fast gate (contract): verifies `getAttribution` export exists and returns expected keys
- Deep gate (E2E): fills with known costs → verifies edge > net, costs sum correctly, funding attribution non-zero

### Verdict: PASS
