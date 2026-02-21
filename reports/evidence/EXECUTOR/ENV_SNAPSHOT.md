# ENV_SNAPSHOT.md — Executor Environment Snapshot

UTC_TIMESTAMP_GENERATED: 2026-02-21

## Git State

| Field | Value |
|-------|-------|
| branch | claude/calm-infra-p0-hardening-UM0c4 |
| HEAD | 3d37e68311e23554a1ef1996642b4583e46e341d |

## Runtime

| Field | Value |
|-------|-------|
| node -v | v22.22.0 |
| npm -v | 10.9.4 |
| CI | (unset) |
| TREASURE_RUN_ID | (unset — RUN_ID resolved via GIT commit SHA) |
| VERIFY_MODE | GIT (default) |

## RUN_ID Resolution

VERIFY_MODE=GIT → RUN_ID = git rev-parse HEAD (short)
Expected RUN_ID: 3d37e68 (first 7 chars of HEAD SHA)
