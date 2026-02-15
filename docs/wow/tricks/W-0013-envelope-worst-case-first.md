# W-0013 Envelope Worst-Case First

W-ID: W-0013
Category: Execution
Problem: Candidate ranking overfits optimistic execution assumptions and hides fragility.
Solution: Rank by worst-case execution envelope first, then use median/best as supporting views.
Contract (PASS commands): npm run -s verify:wow && WOW_USED=W-0003,W-0013,W-0014 npm run -s verify:wow:usage
Minimal diff: Add deterministic envelope robustness scoring and reason codes.
Risks: Conservative bias can suppress exploratory strategies.
Rollback: Remove W-0013 references and restore prior ranking logic.
Where used: E76 envelope runner and evidence.
