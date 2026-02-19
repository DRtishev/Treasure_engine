# FINAL_MEGA RUNBOOK
## One Command Flow
- run: npm run -s doctor
- then: run NEXT_ACTION exactly once
## If BLOCKED/CACHE_MISSING
- CI=true npm run -s verify:mega
## If STALE
- CI=true npm run -s verify:mega
## If CACHE_STALE_FILESYSTEM
- CI=true npm run -s verify:mega
## If FAIL_NODE_CAPSULE
- place capsule at artifacts/incoming/node/ and rerun verify:mega
## RAW
- next_action: CI=true npm run -s verify:mega
