# RISK REGISTER (EPOCH-BOOT.1)
- Risk: wrapping e2 could break downstream schema paths.
  Mitigation: wrapper only injects env, `json_schema_check` already resolves `TREASURE_RUN_DIR`.
- Risk: repeated runs overwrite outputs.
  Mitigation: scoped path `reports/runs/e2/<seed>/<repeat>/<run_id>/` with unique repeat suffixing.
- Risk: checksum manifests accidentally include generated outputs.
  Mitigation: SOURCE manifest generated from tracked files with explicit exclusions (`reports/`, `logs/`, archive hashes).
