# W-0019 STRICT_1 is earned, not assumed

W-ID: W-0019
Category: Governance
Problem: strict canary stage can be activated without sufficient observed readiness.
Solution: AUTO stage promotion requires explicit windows+invalid+drift proof per symbol.
Contract (PASS commands): CANARY_STAGE=AUTO npm run -s verify:e80
Minimal diff: add deterministic promotion-readiness proof table in E80 canary x2.
Risks: delayed strict rollout when observed coverage is sparse.
Rollback: force CANARY_STAGE=BASELINE explicitly.
Where used: E80 stage decision and PROMOTION_READINESS evidence.
