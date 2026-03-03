# SNAPSHOT — Treasure Engine Audit
Дата: 2026-03-03
Аудитор: Claude (CERT mode, offline)

## Точка фиксации

| Параметр | Значение |
|----------|----------|
| Branch | `claude/treasure-engine-audit-u4X28` |
| HEAD SHA | `bdbf61f4aabe31a5d8d5ee1e8489f5e92896f578` |
| Node.js | v22.22.0 |
| npm | 10.9.4 |
| git status | clean (## claude/treasure-engine-audit-u4X28) |
| node_modules | MISSING при старте, установлено через `npm install` (45 пакетов) |
| ALLOW_NETWORK | NOT FOUND → OFFLINE (CERT) |
| APPLY_AUTOPILOT | NOT FOUND |

## Режим: CERT (offline)

Сеть не используется. Все выводы основаны на локальном состоянии репо.

## Что запускалось

| Команда | Run 1 EC | Run 2 EC | Статус |
|---------|----------|----------|--------|
| `npm run -s verify:fast` | 2 | 2 | BLOCKED (ACQ_LOCK01) |
| `npm run -s ops:life` | 1 | — | CRASH (EVT_SCHEMA_ERROR) |
| `npm run -s ops:doctor` | 1 | — | FAIL (BOOT_FAIL) |
| `npm run -s ops:cockpit` | 0 | — | PASS |
| `npm run -s ops:timemachine` | 0 | — | PASS |
| `npm run -s ops:autopilot` | 0 | — | PASS (DRY_RUN) |

## Детерминизм verify:fast

verify:fast заблокирован на первом шаге (`ops:node:toolchain:ensure`), поэтому x2 прогон идентичен — оба EC=2.
Вердикт: **IDENTICAL** (оба BLOCKED на одном и том же шаге).
