# SNAPSHOT.md — Treasure Engine Audit Snapshot

Дата: 2026-03-04
Timezone: Europe/Amsterdam
Режим: CERT (OFFLINE)

## Окружение

| Параметр | Значение |
|---|---|
| git branch | `claude/audit-harden-treasure-engine-68ZkR` |
| HEAD sha | `bdbf61f4aabe31a5d8d5ee1e8489f5e92896f578` |
| node -v | v22.22.0 |
| npm -v | 10.9.4 |
| node_modules | PRESENT (45 packages, 1 moderate vuln) |
| git status | clean (no uncommitted changes) |
| Network unlock | NO (artifacts/incoming/ALLOW_NETWORK отсутствует) |
| Toolchain | vendored via symlink → system node v22.22.0 |

## Маркеры режима

- CERT mode: подтверждён (no ALLOW_NETWORK file)
- VERIFY_MODE: GIT
- TREASURE_NET_KILL: доступен как preload guard

## Структура репозитория

- 1002 npm scripts в package.json
- ~340 verify скриптов
- ~31 ops скриптов
- ~200 core модулей в 30 директориях
- 67 epoch спецификаций
- 63 EDGE_LAB policy документа
- 7 реализованных Edge Lab courts
