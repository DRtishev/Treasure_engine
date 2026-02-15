# E86 Operator Playbook

## Daily manual cadence (non-CI)
- `CI=false ENABLE_DEMO_ADAPTER=1 ALLOW_MANUAL_RECON=1 UPDATE_E86_EVIDENCE=1 DEMO_API_KEY=*** DEMO_API_SECRET=*** node scripts/verify/e86_demo_daily_cadence.mjs`
- `CI=false UPDATE_E86_EVIDENCE=1 UPDATE_E86_THRESHOLDS=1 ENABLE_DEMO_ADAPTER=1 ALLOW_MANUAL_RECON=1 DEMO_API_KEY=*** DEMO_API_SECRET=*** CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e86:update`

## Read-only verification
- `CI=false QUIET=1 npm run -s verify:e86`
- `CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e86`

## Lock recovery
- `test -f .foundation-seal/E86_KILL_LOCK.md && rm -f .foundation-seal/E86_KILL_LOCK.md`
