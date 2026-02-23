# COMMANDS_RUN.md

| Command | Exit Code |
|---|---:|
| npm run -s verify:node | 0 |
| ENABLE_SQLITE_PERSISTENCE=0 TREASURE_OMIT_OPTIONAL_PROOF=1 npm ci --omit=optional | 0 |
| npm run -s edge:calm:p0:x2 | 0 |
| npm run -s infra:p0 | 0 |
| npm run -s p0:all | 0 |
| npm run -s gov:gov01 | 0 |
| npm run -s gov:integrity | 0 |
| npm run -s export:final-validated | 0 |
| tar -czf artifacts/incoming/MAIN_IDEAL_EVIDENCE.tar.gz -C reports/evidence INFRA_P0 EDGE_LAB SAFETY GOV EXECUTOR | 0 |
| sha256sum artifacts/incoming/MAIN_IDEAL_EVIDENCE.tar.gz > artifacts/incoming/MAIN_IDEAL_EVIDENCE.tar.gz.sha256 | 0 |
