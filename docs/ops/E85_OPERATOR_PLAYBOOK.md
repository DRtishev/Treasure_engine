# E85 Operator Playbook

## Manual daily fact cadence (non-CI only)
- `CI=false ENABLE_DEMO_ADAPTER=1 ALLOW_MANUAL_RECON=1 UPDATE_E85_EVIDENCE=1 DEMO_API_KEY=*** DEMO_API_SECRET=*** node scripts/verify/e84_exec_recon_demo_daily_manual.mjs`
- `CI=false UPDATE_E85_EVIDENCE=1 UPDATE_E85_THRESHOLDS=1 QUIET=1 npm run -s verify:e85:update`

## Read-only verification cadence
- `CI=false QUIET=1 npm run -s verify:e85`
- `CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e85`

## Integrity checks
- `grep -E '^[0-9a-f]{64} ' reports/evidence/E85/SHA256SUMS.md | sha256sum -c -`
