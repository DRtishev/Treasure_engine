# EPOCH-65 — FOUNDATION SEAL v1.0 (Baseline + Repro + Run-Scope Isolation)

## Цель
Довести foundation-полировку до operator-proof уровня: канонический baseline truth, опциональный reproducible release proof и run-scope изоляция тяжёлых verify-проходов.

## Фальсифицируемые критерии
- [ ] `docs/OPERATOR_DOCTRINE_RU.md` создан и связан из `README.md` + `docs/START_HERE.md`.
- [ ] `CI=true npm run verify:baseline` PASS (x2) без `UPDATE_BASELINE`.
- [ ] `RELEASE_REPRO=1 CI=true npm run verify:release:repro` PASS (рекомендуемо/платиново).
- [ ] `TREASURE_RUN_DIR` поддерживается тяжёлыми verify-проходами (phoenix/freeze/sweep/edge wrappers) без записи мусора в canonical evidence.
- [ ] `verify:phoenix` включает `verify:baseline` в финальном контуре.

## Обязательные гейты
- `npm ci`
- `CI=true npm run verify:repo` x2
- `CI=true npm run verify:specs` x2
- `CI=true npm run verify:docs` x2
- `CI=true npm run verify:ledger` x2
- `CI=true npm run verify:edge` x2
- `CI=true npm run verify:treasure` x2
- `CI=true npm run verify:phoenix` x2
- `npm run release:build`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release` x2
- `CI=true npm run verify:baseline` x2
- optional platinum: `RELEASE_REPRO=1 CI=true npm run verify:release:repro`

## Артефакты эпохи
- `reports/evidence/EPOCH-65/gates/manual/baseline.json`
- `reports/evidence/EPOCH-65/gates/manual/release_repro_report.json` (если запускался)
- `reports/evidence/EPOCH-65/gates/manual/run_scope_report.json`
- `reports/evidence/EPOCH-65/gates/manual/verify_epoch65_result.json`
