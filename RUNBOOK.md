# RUNBOOK (RU)

## 1) Базовый детерминированный цикл
```bash
npm ci
npm run verify:e2
npm run verify:e2
npm run verify:paper
npm run verify:paper
npm run verify:e2:multi
npm run verify:phase2
npm run verify:integration
npm run verify:core
```

## 2) Эпохальные гейты
- `npm run verify:epoch17`
- `npm run verify:epoch18`
- `npm run verify:epoch19`
- `npm run verify:epoch20`
- `npm run verify:epoch21`

## 3) Структура run-scoped артефактов
- E2: `reports/runs/e2/<seed>/<repeat>/<run_id>/`
- Paper: `reports/runs/paper/<seed>/<repeat>/<run_id>/`

## 4) Evidence дисциплина
Для каждого цикла собирается `reports/evidence/<EPOCH-ID>/` с:
- preflight/install
- логами всех гейтов
- diff/patch
- checksum manifests
- summary + verdict

## 5) Integrity checks
```bash
sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.SOURCE.txt
sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.EVIDENCE.txt
```

## 6) Сеть и безопасность
- Network-dependent тесты выключены по умолчанию.
- Включение только явным `ENABLE_NETWORK_TESTS=1`.
- Live trading в verification path не включается.
