# RISK REGISTER (EPOCH-24)

- Risk: Walk-forward dataset is synthetic and may not represent full market regimes.
  - Mitigation: gate is structural anti-overfit monitor, not performance claim.
- Risk: Missing `court_report.json` would break epoch24 gate.
  - Mitigation: wall order keeps `verify:phase2` before epoch24.
- Risk: Export hash drift can fail wall checksum checks.
  - Mitigation: explicit `export:validated` + `regen:manifests` before wall.
