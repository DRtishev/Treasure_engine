# ENV_SNAPSHOT.md — Executor Environment Snapshot

UTC_TIMESTAMP_GENERATED: 2026-02-21

## Git State

| Field | Value |
|-------|-------|
| branch | claude/firmware-hardening-framework-ENj44 |
| HEAD | f79f67ee65ad3209cfb8bd612ca41aa6bdb523d2 |

## Runtime

| Field | Value |
|-------|-------|
| node -v | v22.22.0 |
| npm -v | 10.9.4 |
| CI | (unset) |
| TREASURE_RUN_ID | (unset — RUN_ID resolved via GIT commit SHA) |
| VERIFY_MODE | GIT (default) |
| BUNDLE_COMMIT_SHA_SHORT | (unset) |
| SOURCE_FINGERPRINT | (unset) |

## RUN_ID Resolution

VERIFY_MODE=GIT → RUN_ID = git rev-parse HEAD (short)
Expected RUN_ID: f79f67ee65ad (first 12 chars of HEAD SHA)

## Firmware Version

FIRMWARE: SHAMAN_P0_MASTER_HARDENING_FIRMWARE v1.1
POML_ID: SHAMAN_P0_MASTER_HARDENING_FIRMWARE
POML_DATE: 2026-02-21
