# COMMANDS_RUN.md — Executor Command Record

UTC_TIMESTAMP_GENERATED: 2026-02-21

## Sequence

| ID | Command | Exit Code | Notes |
|----|---------|-----------|-------|
| C0 | npm ci | 0 | 45 packages installed |
| C1a | npm run p0:all (edge:calm:p0) | 0 | 4/4 CALM P0 steps PASS |
| C1b | npm run p0:all (infra:p0) | 0 | 5/5 INFRA P0 gates PASS; eligible_for_micro_live=true |
| C2 | npm run edge:all | 0 | 19/19 steps PASS; verdict ELIGIBLE |
| POST | npm run edge:calm:p0 | 0 | P0 evidence regenerated after edge:all wipe |
| POST | npm run verify:dep02:failclosed | 0 | R12 assertion vacuously true (no DEP codes) |

## Notes

- edge:all wipes reports/evidence/EDGE_LAB/ at start; edge:calm:p0 re-run post-wipe to restore P0 evidence
- DEPS_OFFLINE: PASS with node_modules installed (npm ci pre-seeded cache — consistent with offline-authoritative R2)
- DEP02 (better-sqlite3 native build) would reappear if node_modules absent; R12 gate seals this

## First Failing Command

NONE — all commands exited 0.
