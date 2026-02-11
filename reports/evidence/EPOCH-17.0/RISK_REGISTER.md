# Risk Register
- Risk: legacy scripts reading reports/*.json directly may bypass run-scoped outputs.
  Mitigation: route verify schema checker + court + panel to latest run directory.
- Risk: deterministic run_id collision for same epoch/seed/hack_id is expected by design.
  Mitigation: include explicit hack_id domains (SIM_BATCH, EQS, COURT, PAPER_E2E).
- Risk: old stale reports/*.json remain in repo and can mislead manual checks.
  Mitigation: validation paths now resolve to reports/runs/<run_id>/.
