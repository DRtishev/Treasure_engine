# W-0017 Quiet Mode = Deterministic Signal/Noise Control

W-ID: W-0017
Category: Governance
Problem: CI logs are noisy and hide deterministic proofs.
Solution: QUIET=1 suppresses intermediate JSON while preserving fingerprints.
Contract (PASS commands): QUIET=1 npm run -s verify:e79
Minimal diff: central quiet helpers + runner adoption.
Risks: reduced human debugging detail in default CI logs.
Rollback: set QUIET=0.
Where used: E79 orchestrator and E79/E78 verify steps.
