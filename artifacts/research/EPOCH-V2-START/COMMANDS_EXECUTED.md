# COMMANDS EXECUTED — EPOCH-V2-START (Baseline Proof)

## verify:fast x2

| Run | CMD | EC | Gates | Результат |
|-----|-----|----|----|-----------|
| 1 (до PR05 fix) | `npm run -s verify:fast` | 1 | 49/50 | FAIL: regression_pr05_executor_ssot_stable_set — RG_PR05_NON_ALLOWLIST_ADDED |
| PR05 FIX | Добавлен `NODE_*.md` в allowlist | — | — | scripts/verify/regression_pr05_executor_ssot_stable_set.mjs |
| 2 (после fix) | `npm run -s verify:fast` | 0 | 50/50 | ALL PASS |
| 3 (run2 x2) | `npm run -s verify:fast` | 0 | 50/50 | ALL PASS |

**Детерминизм:** Run 2 и Run 3 идентичны. ✓

## e108 x2

| Run | CMD | EC | Tests | Результат |
|-----|-----|----|----|-----------|
| 1 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` | 0 | 10/10 | PASSED |
| 2 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` | 0 | 10/10 | PASSED |

**Детерминизм:** Идентичны. ✓

## Baseline Summary

| Проверка | Статус |
|----------|--------|
| verify:fast x2 | 50/50 PASS ✓ |
| e108 x2 | 10/10 PASS ✓ |
| PR05 fix | NODE_*.md в allowlist ✓ |
