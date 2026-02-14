> ARCHIVED / NOT SSOT / kept for history. Do not follow.

# RUNBOOK (RU)

## 1) Канонический оффлайн wall
```bash
EVIDENCE_EPOCH=EPOCH-PIPELINE-FREEZE npm run verify:wall
```

`verify:wall` выполняет фиксированный оффлайн-пайплайн:
1. `npm ci`
2. `npm run verify:specs`
3. `npm run verify:paper` (x2)
4. `npm run verify:e2` (x2)
5. `npm run verify:e2:multi`
6. `npm run verify:paper:multi`
7. `npm run verify:phase2`
8. `npm run verify:integration`
9. `npm run verify:core`
10. `npm run verify:epoch27`
11. `npm run verify:epoch28`
12. `npm run verify:epoch29`
13. `npm run verify:clean-clone`
14. `npm run regen:manifests`
15. `sha256sum -c reports/evidence/<EVIDENCE_EPOCH>/SHA256SUMS.SOURCE.txt`
16. `sha256sum -c reports/evidence/<EVIDENCE_EPOCH>/SHA256SUMS.EVIDENCE.txt`
17. `sha256sum -c reports/evidence/<EVIDENCE_EPOCH>/SHA256SUMS.EXPORT.txt`

Если `EVIDENCE_EPOCH` не задан, используется самый свежий каталог в `reports/evidence/`.

## 2) Канонический порядок манифестов
```bash
EVIDENCE_EPOCH=EPOCH-PIPELINE-FREEZE npm run regen:manifests
```
Порядок всегда: **EVIDENCE -> SOURCE -> EXPORT**, затем `sha256sum -c` по каждому манифесту.

## 3) Канонический validated export
```bash
npm run export:validated
```
Выход:
- `FINAL_VALIDATED.zip`
- `FINAL_VALIDATED.zip.sha256`

Экспорт исключает `.git`, `node_modules`, `reports/runs`, логи, кеши, временные директории и `artifacts/incoming`.

## 4) Сеть и безопасность
- Network-dependent тесты выключены по умолчанию.
- Включение только явным `ENABLE_NETWORK_TESTS=1`.
- Live trading в verification path не включается.


## 5) Machine-readable wall outputs
После каждого `verify:wall` формируются:
- `reports/evidence/<EVIDENCE_EPOCH>/WALL_RESULT.json`
- `reports/evidence/<EVIDENCE_EPOCH>/WALL_MARKERS.txt`

`verify:release-governor` читает `WALL_RESULT.json` в первую очередь, log parsing используется только как fallback.
