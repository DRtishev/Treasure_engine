# E89 CLOSEOUT
- status: PASS
- canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- exact_commands: npm ci; CI=false UPDATE_E89_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e89:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e89; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e89
