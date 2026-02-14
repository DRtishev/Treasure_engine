# OPERATOR DOCTRINE (RU)

## 10 правил Foundation Seal
1. **SSOT обязателен**: истина только в `spec/ssot.json`, `specs/epochs/LEDGER.json`, `specs/epochs/INDEX.md`, `specs/wow/WOW_LEDGER.json`.
2. **Версии схем обязательны**: изменения в `schema_version` фиксируются атомарно вместе с verify/gate обновлениями.
3. **Resolver-only путь**: все проверки идут через `npm run verify:*`; ручные интерпретации логов не считаются PASS.
4. **Content verification**: любой PASS подтверждается файлами `pack_index.json`, `SHA256SUMS.EVIDENCE`, `VERDICT.md`.
5. **`ASSERT_NO_DIFF` режим обязателен** для freeze-регрессии: canonical evidence нельзя мутировать.
6. **Анти-флейк x2**: обязательные гейты запускаются два раза подряд в `CI=true`.
7. **Offline-first**: PASS не зависит от сети, network-пути только через явный флаг.
8. **No unknown bytes**: release/hash baseline должны быть воспроизводимы и байтово совпадать.
9. **Kill criteria при дрейфе**: если критичный gate падает дважды без root cause, цикл блокируется диагностикой.
10. **Stop lying policy**: нельзя объявлять DONE/PASS без machine-readable evidence.

## Как обновлять SSOT схемы без дрейфа
- Сначала меняйте схему и `schema_version`, потом код резолвера/валидатора, затем документы и evidence.
- Любой schema bump должен сопровождаться:
  - обновлением verifier (`verify:ssot`, `verify:specs`, профильные `verify:*`),
  - пересборкой производных truth-артефактов,
  - запуском обязательных x2 gate-повторов,
  - обновлением `truth/BASELINE.json` через `UPDATE_BASELINE=1 CI=true npm run verify:baseline`.
- Запрещено «тихое» изменение формата без явного bump версии и записи в текущую epoch spec.
