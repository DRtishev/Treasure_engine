# E83 Operator Cadence

## Daily manual ritual (demo collection)
1. Export manual gates and credentials:
   - `CI=false`
   - `ENABLE_DEMO_ADAPTER=1`
   - `ALLOW_MANUAL_RECON=1`
   - `UPDATE_E83_EVIDENCE=1`
   - `DEMO_API_KEY` and `DEMO_API_SECRET`
2. Run daily collector + cadence runner:
   - `node scripts/verify/e83_operator_cadence_runner.mjs`

## Daily verification ritual (offline-safe)
- `CI=false QUIET=1 npm run -s verify:e83`

## Weekly update ritual
- `CI=false UPDATE_E83_EVIDENCE=1 UPDATE_E83_CALIBRATION=1 UPDATE_E83_THRESHOLDS=1 CANARY_STAGE=AUTO QUIET=1 npm run -s verify:e83:update`

## CI drift ritual
- `CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e83`
