# RISK REGISTER (EPOCH-23)

- Risk: AI decision payloads in future may diverge from bridge expectations.
  - Mitigation: contract checks in `verify:epoch23` validate required fields and deterministic behavior.
- Risk: drift in non-deterministic primitives in AI modules.
  - Mitigation: keep EPOCH-22 drift gate in wall prior to EPOCH-23.
- Risk: checksum manifests can fail if export hash changes.
  - Mitigation: explicit `export:validated` + `regen:manifests` before wall integrity checks.
