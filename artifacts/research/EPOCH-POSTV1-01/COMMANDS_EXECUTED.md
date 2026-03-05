# COMMANDS EXECUTED — EPOCH-POSTV1-01

## Proof Runs

| # | Команда | EC | Результат | Примечание |
|---|---------|----|-----------|----|
| 1 | `npm run -s verify:fast` (run 1) | 0 | 50/50 PASS | Все гейты пройдены |
| 2 | `npm run -s verify:fast` (run 2) | 0 | 50/50 PASS | Идентично run 1 |
| 3 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 1) | 0 | 10/10 PASS | Детерминизм подтверждён |
| 4 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run 2) | 0 | 10/10 PASS | Идентично run 1 |
| 5 | `npm run -s ops:cockpit` | 0 | PASS | HUD: BOOT, fsm: LIFE, readiness: NEEDS_DATA |
| 6 | `npm run -s ops:doctor` | (running) | BOOT_OK → LIVENESS... | Долгий прогон, startup PASS |
| 7 | `npm run -s ops:node:toolchain:bootstrap` | 0 | PASS | Нужен перед первым verify:fast |

## Anti-Flake: Расхождения между Run 1 и Run 2

| Цепочка | Run 1 | Run 2 | Расхождение |
|---------|-------|-------|-------------|
| verify:fast | 50/50 PASS EC=0 | 50/50 PASS EC=0 | **НЕТ** |
| e108 determinism | 10/10 PASS EC=0 | 10/10 PASS EC=0 | **НЕТ** |

**Вердикт x2:** ДЕТЕРМИНИЗМ ПОДТВЕРЖДЁН. Ноль расхождений.
