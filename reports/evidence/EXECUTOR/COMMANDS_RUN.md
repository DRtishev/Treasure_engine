# COMMANDS_RUN.md

| Command | Exit Code |
|---|---:|
| npm ci --omit=optional | 0 |
| npm run -s edge:calm:p0:x2 | 0 |
| npm run -s p0:all | 1 |
| npm run -s gov:integrity | 1 |
| tar -czf artifacts/incoming/MAIN_IDEAL_EVIDENCE.tar.gz -C reports/evidence INFRA_P0 EDGE_LAB SAFETY GOV EXECUTOR | 0 |
| sha256sum artifacts/incoming/MAIN_IDEAL_EVIDENCE.tar.gz | 0 |
