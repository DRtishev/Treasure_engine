# E82 CLOSEOUT
- status: PASS
- commands_executed: CI=false UPDATE_E82_EVIDENCE=1 UPDATE_E82_CALIBRATION=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e82:update; CI=false QUIET=1 npm run -s verify:e82; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e82; grep -E "^[0-9a-f]{64} " reports/evidence/E82/SHA256SUMS.md | sha256sum -c -
- canonical_fingerprint: 84a190582fcf0c041489e72d358dee1df6f77aa42d1da5c26d0b24919da2d237
