# START HERE (RU)

Операторский вход: начните с `README.md`, затем используйте этот файл как маршрут по фабрике верификации.

## Базовый порядок
1. `npm ci`
2. `CI=true npm run verify:repo`
3. `CI=true npm run verify:specs`
4. `CI=true npm run verify:docs`
5. `CI=true npm run verify:ledger`
6. `CI=true npm run verify:edge`
7. `CI=true npm run verify:treasure`
8. `CI=true npm run verify:phoenix`

Критические гейты гоняются два раза подряд (анти-флейк).

## Основные документы
- `docs/RUNBOOK_RU.md` — операционный runbook.
- `docs/DOCTRINE.md` — политика determinism/evidence/offline/safety.
- `docs/WOW_CATALOG.md` — производная витрина состояния.
- `docs/STAGE2_IMPLEMENTATION_MATRIX.md` — матрица реализации.
- `kb/INDEX.md` — карта базы знаний.
