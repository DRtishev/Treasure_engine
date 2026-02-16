# E88 CLOSEOUT
- status: PASS
- canonical_fingerprint: e3245a9960232d8b4d221766f2df5888a88a073cad4ec7bcb5f02cc1c01c4960
- exact_commands: npm ci; CI=false UPDATE_E88_EVIDENCE=1 UPDATE_E88_STATE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e88:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e88; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e88
