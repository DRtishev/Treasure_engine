# ONE_NEXT_ACTION.md

## Текущее состояние
- verify:fast x2: **PASS** (детерминизм подтверждён)
- e108 x2: **PASS** (backtest determinism подтверждён)
- ops:life: **PASS**
- ops:cockpit: **PASS** (FSM=BOOT, readiness=NEEDS_DATA)
- FINDING-A: **ОПРОВЕРГНУТО** (ajv работает)
- FINDING-B: **ПОДТВЕРЖДЕНО** (courts orphaned)
- FINDING-C: **ПОДТВЕРЖДЕНО** (metrics bifurcation)

## ONE NEXT ACTION

```bash
# Wire Edge Lab courts в strategy_sweep.mjs (Sprint 0, FINDING-B fix)
# В scripts/edge/strategy_sweep.mjs:
#   - import { runCandidatePipeline } from '../../core/edge/candidate_pipeline.mjs'
#   - заменить прямой runBacktest + CT01 на runCandidatePipeline()
#   - verify:fast x2 после изменения
```

## Почему именно это
Courts — 7 реализованных "судов реальности" — orphaned. Кандидат проходит DRAFT → BACKTESTED → GRADUATED
без единой court validation. Это САМЫЙ ОПАСНЫЙ gap: система claims fail-closed но operates permit-by-default.
Фикс = 1 import + 1 function call change. Impact = 10/10. Risk = 3/10.
