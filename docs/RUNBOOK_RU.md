# RUNBOOK RU

## Обязательный baseline
```bash
npm ci
CI=true npm run verify:repo
CI=true npm run verify:specs
CI=true npm run verify:docs
CI=true npm run verify:ledger
CI=true npm run verify:edge
CI=true npm run verify:treasure
CI=true npm run verify:phoenix
```
Каждый required gate — два запуска подряд.

## Релизный baseline
```bash
npm run release:build
RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release
```
Строгую проверку релиза запускать дважды.

## Политика отказа
- Любой FAIL = BLOCKED.
- Нет evidence-файлов = BLOCKED.
- Любая недетерминированность в ACTIVE runtime = BLOCKED.
