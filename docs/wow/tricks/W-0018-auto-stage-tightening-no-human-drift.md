# W-0018 AUTO STAGE TIGHTENING = No Human Drift

W-ID: W-0018
Category: Risk
Problem: Manual canary stage selection can drift and introduce bias.
Solution: AUTO stage policy deterministically selects STRICT_1 vs BASELINE per symbol.
Contract (PASS commands): CANARY_STAGE=AUTO npm run -s verify:e79
Minimal diff: contract + deterministic stage decision evidence.
Risks: strict mode may be deferred under sparse recon coverage.
Rollback: explicit BASELINE override.
Where used: E79 canary x2 decision path.
