# RISK REGISTER (EPOCH-25)

- Risk: offline profiling uses fixtures, not full network execution.
  - Mitigation: explicit opt-in network path (`ENABLE_NETWORK_TESTS=1`) retained.
- Risk: campaign budgets may need tuning with real testnet telemetry.
  - Mitigation: keep threshold values explicit and versioned in gate.
- Risk: export checksum drift can break release wall.
  - Mitigation: always run `export:validated` + `regen:manifests` before wall.
