# E87 CLOSEOUT
- status: PASS
- canonical_fingerprint: d3dd5843203c1bd986c789a973b8cc37cd2f7dfbf3fb7e91894627038bb2acab
- exact_commands: npm ci; CI=false UPDATE_E87_EVIDENCE=1 UPDATE_E87_POLICIES=1 APPLY_MODE=APPLY ENABLE_DEMO_ADAPTER=1 ALLOW_MANUAL_RECON=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e87:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e87; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e87
