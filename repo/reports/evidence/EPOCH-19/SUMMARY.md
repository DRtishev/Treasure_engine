# EPOCH-19 Summary

## Objective
Address repeated PR rejection around unsupported binary files by ensuring PR diff is text-only.

## Decision
- Do not track `repo/FINAL_VALIDATED.zip` in git.
- Track only text artifacts (`*.log`, `*.md`, `*.txt`, `*.sha256`) and verification evidence.

## Gates
- npm ci: PASS
- verify:e2 run #1: PASS
- verify:e2 run #2: PASS
- verify:phase2: PASS
- verify:paper run #1: PASS
- verify:paper run #2: PASS
- verify:epoch11: PASS
- verify:epoch12..17: scripts missing in package.json (recorded as skipped)

## Network-sensitive
- Skipped by default: verify:binance, verify:websocket, verify:live (ENABLE_NETWORK_TESTS not set).

## Deliverable
- Local archive generated: `repo/FINAL_VALIDATED.zip`
- Local checksum generated: `repo/FINAL_VALIDATED.zip.sha256`
- Archive intentionally untracked in git to keep PR text-only.
