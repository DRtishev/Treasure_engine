# W-0015 Canary Budget Doctrine

W-ID: W-0015
Category: Risk
Problem: Profit claims survive despite reason-code drift and budget overuse.
Solution: Apply deterministic fail-budget caps per reason-code family in canary evaluation.
Contract (PASS commands): npm run -s verify:wow && WOW_USED=W-0003,W-0015,W-0016 npm run -s verify:wow:usage
Minimal diff: Add reason-code budget checks in E77 canary evaluator.
Risks: Too-tight budgets can block exploratory models.
Rollback: Relax budgets in canary contract and re-run verify:e77.
Where used: E77 canary evaluator + EDGE_CANARY evidence.
