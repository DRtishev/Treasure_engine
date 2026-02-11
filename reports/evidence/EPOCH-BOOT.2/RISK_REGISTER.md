# RISK REGISTER (EPOCH-BOOT.2)
- Risk: paper run-scoping could still write partial artifacts to global paths.
  Mitigation: verify script reads only run-local event file and asserts path from meta.
- Risk: forcing trades for verify may alter non-verify behavior.
  Mitigation: FORCE_TRADES is injected only by wrapper for gate=paper.
- Risk: wrapper updates could impact e2 pathing.
  Mitigation: rerun e2 x2 + e2:multi + verify:core.
