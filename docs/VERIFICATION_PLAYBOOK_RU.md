# Verification Playbook (RU)

## Стандартный полный прогон
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
npm run verify:epoch17
npm run verify:epoch18
npm run verify:epoch19
npm run verify:epoch20
npm run verify:epoch21
```

## Integrity
```bash
sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.SOURCE.txt
sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.EVIDENCE.txt
```

## Финальный экспорт
```bash
zip -rq FINAL_VALIDATED.zip . -x '.git/*' 'node_modules/*' '.cache/*' 'logs/*' 'artifacts/incoming/*'
sha256sum FINAL_VALIDATED.zip > FINAL_VALIDATED.zip.sha256
```

## Что обязательно проверить вручную
1. Логи anti-flake rerun присутствуют в evidence.
2. В `SUMMARY.md` есть перечень рисков/ограничений.
3. Вердикт SAFE/BLOCKED обоснован.
