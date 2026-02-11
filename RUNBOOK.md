# RUNBOOK (RU)

## 1) Канонический оффлайн wall
```bash
npm run verify:wall
```

`verify:wall` выполняет строгую последовательность:
1. `npm ci`
2. `npm run verify:specs`
3. `npm run verify:paper` (x2)
4. `npm run verify:e2` (x2)
5. `npm run verify:e2:multi`
6. `npm run verify:phase2`
7. `npm run verify:integration`
8. `npm run verify:epoch17`
9. `npm run verify:epoch18`
10. `npm run verify:epoch19`
11. `npm run verify:monitoring` (x2)
12. `npm run verify:epoch20`
13. `npm run verify:epoch21`
14. `npm run verify:epoch22`
15. `npm run verify:epoch23`
16. `npm run verify:epoch24`
17. `npm run verify:epoch25`
18. `npm run verify:epoch26` (x2)
19. `npm run verify:release-governor` (x2)
20. `sha256sum -c reports/evidence/EPOCH-BOOT.AUTOPILOT/SHA256SUMS.SOURCE.txt`
21. `sha256sum -c reports/evidence/EPOCH-BOOT.AUTOPILOT/SHA256SUMS.EVIDENCE.txt`

## 2) Канонический порядок манифестов
```bash
npm run regen:manifests
```
Порядок всегда: **EVIDENCE -> SOURCE -> EXPORT**, затем `sha256sum -c` по каждому манифесту.

## 3) Канонический validated export
```bash
npm run export:validated
```
Выход:
- `FINAL_VALIDATED.zip`
- `FINAL_VALIDATED.zip.sha256`

Экспорт исключает `.git`, `node_modules`, `reports/runs`, логи, кеши, временные и входящие архивы.

## 4) Сеть и безопасность
- Network-dependent тесты выключены по умолчанию.
- Включение только явным `ENABLE_NETWORK_TESTS=1`.
- Live trading в verification path не включается.
