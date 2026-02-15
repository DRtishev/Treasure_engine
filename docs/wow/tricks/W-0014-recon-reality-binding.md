# W-0014 Recon > Backtest: Parameter Reality Binding

W-ID: W-0014
Category: Governance
Problem: Backtest parameters drift away from observed execution behavior.
Solution: Bind cost-envelope parameters to observed recon ledger inputs and surface assumptions explicitly.
Contract (PASS commands): npm run -s verify:wow && WOW_USED=W-0003,W-0013,W-0014 npm run -s verify:wow:usage
Minimal diff: Add fixture-based observed ledger and deterministic envelope derivation.
Risks: Fixture staleness if recon is not refreshed.
Rollback: Fall back to static median envelope constants.
Where used: E76 observed recon ledger and materials.
