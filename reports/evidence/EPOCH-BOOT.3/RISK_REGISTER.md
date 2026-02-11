# RISK REGISTER (EPOCH-BOOT.3)
- Risk: paper gate still depends on verify-only probe events for deterministic RISK/EXEC presence.
  Mitigation: keep probes explicitly gate-scoped via FORCE_TRADES only in wrapper path.
- Risk: repeated runs increase disk footprint and evidence noise.
  Mitigation: run-scoped directories preserve traceability; manifests exclude generated outputs.
- Risk: specs/epochs directory may not exist.
  Mitigation: document conflict and produce NEXT_EPOCH_PLAN from SDD + TASK_TRACKER.
