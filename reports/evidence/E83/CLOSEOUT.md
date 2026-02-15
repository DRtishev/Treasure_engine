# E83 CLOSEOUT
- status: PASS
- commands_executed: CI=false UPDATE_E83_EVIDENCE=1 UPDATE_E83_CALIBRATION=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e83:update; CI=false QUIET=1 npm run -s verify:e83; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e83; grep -E "^[0-9a-f]{64} " reports/evidence/E83/SHA256SUMS.md | sha256sum -c -
- canonical_fingerprint: fe133508e2749c078ab88befcba17dcbaeaed15534ae259e77655f7fa25e6bf5
