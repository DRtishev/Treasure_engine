# E81 CLOSEOUT
- status: PASS
- commands_executed: CI=false UPDATE_E81_EVIDENCE=1 UPDATE_E81_CALIBRATION=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e81:update; CI=false QUIET=1 npm run -s verify:e81; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e81; grep -E "^[0-9a-f]{64} " reports/evidence/E81/SHA256SUMS.md | sha256sum -c -
- canonical_fingerprint: a1fe74648338e5de5309d6b3af1e93bbe0b3c3bcba5fe278b5acb66f3d5b3cfe
