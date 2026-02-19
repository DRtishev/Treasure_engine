# FINAL_MEGA RUNBOOK
## Step 1 — Read the flight deck
```
npm run -s doctor
```
## Step 2 — Run NEXT_ACTION exactly once
- Copy NEXT_ACTION from doctor output. Run it.
- Expect: MODE=AUTHORITATIVE_PASS after full success.
## Failure Codes & Actions
| REASON_CODE             | What happened                        | Action                                    |
|-------------------------|--------------------------------------|-------------------------------------------|
| CACHE_MISSING           | No truth cache yet                   | CI=true npm run -s verify:mega            |
| CACHE_STALE             | Cache >24h old                       | CI=true npm run -s verify:mega            |
| CACHE_STALE_FILESYSTEM  | Capsule/boot gone since last auth    | CI=true npm run -s verify:mega            |
| NEED_NODE_TARBALL       | Capsule file missing                 | Place capsule → CI=true npm run -s verify:mega |
| FAIL_CAPSULE_INTEGRITY  | Capsule present but SHA256 mismatch  | Replace capsule → CI=true npm run -s verify:mega |
| NEED_BOOTSTRAP          | Bootstrap failed                     | CI=true npm run -s verify:mega            |
| FAIL_PINNED_NODE_HEALTH | Pinned node unhealthy                | CI=true npm run -s verify:mega            |
| FAIL_NODE_POLICY        | Bridge/gate failed                   | CI=true npm run -s verify:mega            |
| PROBE_ONLY_NON_AUTH     | Probe run (no acquisition)           | CI=true npm run -s verify:mega            |
## Capsule Placement
```
ls artifacts/incoming/node/   # must contain the capsule tarball
CI=true npm run -s verify:mega
```
## Probe Mode
- Probe skips acquisition (no capsule download, no bootstrap, no bridge/gate).
- TRUTH_CACHE is NEVER overwritten in probe mode.
- Probe exits 0 regardless; use for smoke-testing evidence pipeline only.
## Clean Evidence (what it means)
- Every verify:mega run cleans FINAL_MEGA .md files before writing.
- No outcome depends on leftover evidence from prior runs.
- TRUTH_CACHE (in E142_MEGA/) is NOT cleaned — it persists until an authoritative run overwrites it.
## Optional Online Acquire
```
ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 CI=true npm run -s verify:mega
```
## RAW
- next_action: CI=true npm run -s verify:mega
