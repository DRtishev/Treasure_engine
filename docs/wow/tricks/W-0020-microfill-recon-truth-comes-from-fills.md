# W-0020 Microfill recon: truth comes from fills

W-ID: W-0020
Category: Execution
Problem: calibration and canary quality degrade without real-ish fill observations.
Solution: demo-only manual microfill recon creates deterministic md evidence of fill behavior.
Contract (PASS commands): CI=false ENABLE_DEMO_ADAPTER=1 ALLOW_MANUAL_RECON=1 UPDATE_E80_EVIDENCE=1 npm run -s verify:exec:recon:microfill
Minimal diff: add manual, gated microfill recon writer producing md-only evidence.
Risks: manual ritual requires operator discipline.
Rollback: skip manual microfill and continue with fixture-only recon loop.
Where used: E80 manual recon ritual.
