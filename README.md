# TREASURE ENGINE

## Что это
TREASURE ENGINE — офлайн-ориентированная фабрика проверки торговых инвариантов: спецификация → код → детерминированные гейты → доказательства в `reports/evidence/`. Главная цель — воспроизводимая истина без скрытой магии.

## Одна команда проверки истины
```bash
CI=true npm run verify:phoenix
```
Анти-флейк обязателен: запустите эту же команду **два раза подряд**.

## Сборка релиза (строго)
```bash
npm run release:build
RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release
```
Строгий verify релиза также запускается два раза подряд.

## Операторская доктрина
- `docs/OPERATOR_DOCTRINE_RU.md` — 10 правил Foundation Seal + дисциплина миграций SSOT без дрейфа.

## Карта репозитория
- `specs/` — спецификации, эпохи, контракты.
- `core/edge/` — edge-ядро и epoch-гейты E31+.
- `scripts/verify/` — проверочные гейты и репо-политики.
- `reports/evidence/` — machine-readable доказательства прогонов.
- `kb/` — операторские справки и навигация.

## Жёсткие правила
- Offline-first: PASS без сети по умолчанию.
- Determinism-first: без скрытых `Math.random`/`Date.now` в критическом runtime.
- Evidence-first: нет PASS без артефактов и отчётов.
- Network disabled by default; network пути только явным флагом.
- Live orders disabled by default; включение только через явный governance путь.

## Как добавлять новую эпоху
- Создать/обновить `specs/epochs/EPOCH-NN.md` с фальсифицируемыми критериями.
- Реализовать минимальный безопасный код под критерии эпохи.
- Добавить/обновить gate `verify:epochNN`.
- Обновить `specs/epochs/INDEX.md` и `specs/epochs/LEDGER.json`.
- Собрать evidence-пакет в `reports/evidence/EPOCH-NN/`.
- Запустить обязательные гейты в `CI=true` режиме.
- Повторить критические гейты x2 (анти-флейк) перед отметкой DONE/PASS.
