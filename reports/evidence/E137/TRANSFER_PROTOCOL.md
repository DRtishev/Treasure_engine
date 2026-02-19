# E137 TRANSFER PROTOCOL
- mode_matrix: OFFLINE | ONLINE_OPTIONAL | ONLINE_REQUIRED
- export_command: npm run -s verify:e137:export
- export_location: artifacts/outgoing/E137_evidence_<ts>.tar.gz
- import_command: npm run -s verify:e137:import -- --archive <path>
- import_checks: sha256, structure(E137 root), md-only, SHA256SUMS parity, contracts
- reason_code: OK
