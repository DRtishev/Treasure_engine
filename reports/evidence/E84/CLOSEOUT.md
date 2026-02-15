# E84 CLOSEOUT
- status: PASS
- commands_executed: CI=false UPDATE_E84_EVIDENCE=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e84:update; CI=false QUIET=1 npm run -s verify:e84; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e84; grep -E "^[0-9a-f]{64} " reports/evidence/E84/SHA256SUMS.md | sha256sum -c -
- canonical_fingerprint: 8a25d51e91f2e333e0c49deca69e49c230dd01ce3bbc7b9f3c49be04bf9f251c
