# COMMANDS_RUN.md — Executor Command Record

UTC_TIMESTAMP_GENERATED: 2026-02-21

## Sequence

| ID | Command | Exit Code | Notes |
|----|---------|-----------|-------|
| C0 | npm ci | 0 | Dependencies installed |
| C1a | npm run p0:all (edge:calm:p0) | 0 | 4/4 CALM P0 steps PASS |
| C1b | npm run p0:all (infra:p0) | 0 | 7/7 INFRA P0 gates (incl. FG01 + ZW01) PASS; eligible_for_micro_live=true |
| C2 | npm run edge:calm:p0:x2 | 0 | X2 determinism: fingerprints match, PASS ND01-free |
| C3 | npm run edge:micro:live:readiness | 0 | Readiness gate evaluated |

## Notes

- edge:calm:p0:x2: NEW in v1.6.0 — runs calm P0 twice, compares SCOPE_MANIFEST_SHA + sha256_norm fingerprints
- verify:fixture:guard (FG01): NEW in v1.6.0 — enforces REAL_ONLY default for evidence sources
- verify:zero:war:probe (ZW01): NEW in v1.6.0 — must-fail proof that T000 kill switch fires for all trading flags
- infra:p0 now includes FG01 and ZW01 as blocking gates (7 total)

## First Failing Command

NONE — all commands exited 0.
