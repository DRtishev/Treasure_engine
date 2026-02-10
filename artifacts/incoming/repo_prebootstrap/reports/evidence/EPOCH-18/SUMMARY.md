# EPOCH-18 Summary

## Objective
Address PR limitation: remove binary artifact from tracked changes while keeping evidence-driven verification.

## Change
- Removed tracked binary file `repo/FINAL_VALIDATED.zip` from git history moving forward.
- Kept checksum file `repo/FINAL_VALIDATED.zip.sha256` (text) and regenerated local archive for delivery outside PR diff.

## Baseline/Gates
- npm ci: PASS
- verify:e2 run #1: PASS
- verify:e2 run #2: PASS
- verify:phase2: PASS
- verify:paper run #1: PASS
- verify:paper run #2: PASS
- verify:epoch11: PASS
- verify:epoch12..17: missing scripts in package.json (recorded as skipped)

## Network-sensitive gates
Skipped by default: verify:binance, verify:websocket, verify:live (ENABLE_NETWORK_TESTS not set).

## Risk
- `FINAL_VALIDATED.zip` is now intentionally untracked; it is still generated locally with checksum for artifact delivery.
