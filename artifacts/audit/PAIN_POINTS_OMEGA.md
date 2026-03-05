# PAIN POINTS — OMEGA AUDIT

**Дата:** 2026-03-05 | **Режим:** CERT (OFFLINE) | **HEAD:** 5dfb0b6

---

## P0 — BLOCKERS

Нет P0 blockers. Все 76 гейтов (58 fast + 18 deep) проходят. Система стабильна.

---

## P1 — ОПАСНО (требует внимания перед live)

### PP-01 | P1 | Idempotency Placeholder в MasterExecutor

| Поле | Значение |
|------|----------|
| **Symptom** | `_checkIntentIdempotency` возвращает `{ created: false }` всегда |
| **Root Cause** | Placeholder код, никогда не реализован (`core/exec/master_executor.mjs:367-371`) |
| **Evidence** | `core/exec/master_executor.mjs:367` — комментарий "Placeholder: implement with repoState.createIntent" |
| **Minimal Fix** | Реализовать через RepoState — hash(intent + executionContext) → check/insert |
| **Regression Gate** | `regression_idempotency_no_duplicate_orders` |
| **Residual Risk** | Дублирование ордеров в production |

### PP-02 | P1 | Kill Switch State не Persistent

| Поле | Значение |
|------|----------|
| **Symptom** | Если процесс рестартнётся, kill switch state теряется |
| **Root Cause** | Kill switch — чистая функция, state хранится только in-memory в SafetyLoop |
| **Evidence** | `core/risk/kill_switch.mjs` — pure function, нет persistence |
| **Minimal Fix** | Persist kill switch state в `artifacts/runtime/kill_switch_state.json`; require explicit resume |
| **Regression Gate** | `regression_kill_switch_survives_restart` |
| **Residual Risk** | Ордера возобновляются после crash до re-evaluation |

### PP-03 | P1 | HALT Exit без Double-Key

| Поле | Значение |
|------|----------|
| **Symptom** | Выход из HALT требует только `requestManualReset()` — один вызов метода |
| **Root Cause** | Нет файлового/флагового double-key для HALT reset (в отличие от APPLY_AUTOPILOT) |
| **Evidence** | `core/governance/mode_fsm.mjs:153-160` — просто ставит `manualResetRequested = true` |
| **Minimal Fix** | Потребовать `artifacts/incoming/HALT_RESET` + флаг `--confirm-halt-exit` |
| **Regression Gate** | `regression_halt_exit_requires_double_key` |
| **Residual Risk** | Случайный/программный вызов resetManual() без оператора |

### PP-04 | P1 | MasterExecutor getKillSwitchMetrics() Hardcoded Zeros

| Поле | Значение |
|------|----------|
| **Symptom** | `max_drawdown: 0, exchange_error_rate: 0, consecutive_losses: 0` — caller must provide |
| **Root Cause** | MasterExecutor не трекает drawdown/errors/losses — responsibility leak |
| **Evidence** | `core/exec/master_executor.mjs:443-452` |
| **Minimal Fix** | Track cumulative PnL + drawdown в MasterExecutor; expose real metrics |
| **Regression Gate** | `regression_kill_switch_metrics_not_hardcoded` |
| **Residual Risk** | Kill switch не срабатывает при реальных проблемах если caller не подключён |

---

## P2 — ДОЛГ (технический долг, следует исправить)

### PP-05 | P2 | Date.now() Calls Outside DeterministicClock

| Поле | Значение |
|------|----------|
| **Symptom** | Несколько core-модулей используют `Date.now()` напрямую вместо ctx.clock |
| **Root Cause** | DeterministicClock (core/sys/clock.mjs) создан, но не все модули инжектят его |
| **Evidence** | `mode_fsm.mjs:78`, `truth_engine.mjs:82`, `master_executor.mjs:120,201,394` (fallbacks) |
| **Minimal Fix** | Inject clock в FSM и TruthEngine; eliminate Date.now() fallbacks в MasterExecutor |
| **Regression Gate** | `regression_nd_no_raw_date_now` (расширить existing san01) |
| **Residual Risk** | Nondeterminism в тестах при boundary conditions |

### PP-06 | P2 | 500+ npm Scripts Navigation

| Поле | Значение |
|------|----------|
| **Symptom** | package.json содержит 500+ scripts, поиск нужного затруднён |
| **Root Cause** | Каждая эпоха добавляет ~5-8 scripts, нет cleanup |
| **Evidence** | `package.json` — 798+ строк только scripts section |
| **Minimal Fix** | Категоризация в docs; `npm run help:scripts` — grouped listing |
| **Regression Gate** | N/A (docs change) |
| **Residual Risk** | Developer friction → отказ от запуска правильных гейтов |

### PP-07 | P2 | Default Seed в SeededRNG

| Поле | Значение |
|------|----------|
| **Symptom** | `SeededRNG(seed = 12345)` — default seed может скрыть корреляции между runs |
| **Root Cause** | Удобство developer'а при quick tests |
| **Evidence** | `core/sim/rng.mjs:5` — `constructor(seed = 12345)` |
| **Minimal Fix** | Убрать default, require explicit seed; или warning при использовании default |
| **Regression Gate** | `regression_rng_explicit_seed_required` |
| **Residual Risk** | Скрытая корреляция → overfitting не детектируется |

### PP-08 | P2 | Canary Hardcoded Scenario Multipliers

| Поле | Значение |
|------|----------|
| **Symptom** | `SCENARIO_MUL` в canary_runner.mjs — фиксированные числа для 5 сценариев |
| **Root Cause** | Scenarios были calibrated один раз, не обновляются |
| **Evidence** | `core/canary/canary_runner.mjs:11-17` |
| **Minimal Fix** | Экстернализовать в `artifacts/contracts/canary_scenarios.json`; versioned |
| **Regression Gate** | `regression_canary_scenarios_from_config` |
| **Residual Risk** | Novel market regime не покрыт → blind spot |

### PP-09 | P2 | Promotion Without Cooldown

| Поле | Значение |
|------|----------|
| **Symptom** | `evaluatePromotion()` можно вызвать повторно без cooldown |
| **Root Cause** | Нет state tracking между вызовами |
| **Evidence** | `core/promotion/promotion_ladder.mjs` — stateless function |
| **Minimal Fix** | Добавить `last_promotion_attempt_ts` + minimum cooldown period |
| **Regression Gate** | `regression_promo_cooldown_enforced` |
| **Residual Risk** | Rapid-fire promotion attempts → premature live |

### PP-10 | P2 | Static Fee Schedule

| Поле | Значение |
|------|----------|
| **Symptom** | Cost model uses fixed `fee_taker_bps: 4` |
| **Root Cause** | No tier-based fee support |
| **Evidence** | `core/cost/cost_model.mjs:10-22` — DEFAULT_CONFIG |
| **Minimal Fix** | Accept fee_schedule as config param; support volume-based tiers |
| **Regression Gate** | Existing realism01/02 gates cover this partially |
| **Residual Risk** | PnL estimate drift when volume increases and fees decrease |

---

## P3 — КОСМЕТИКА

### PP-11 | P3 | TruthEngine evaluate() Date.now() in Timestamp

| Поле | Значение |
|------|----------|
| **Symptom** | Verdict timestamp from real clock, not injected |
| **Evidence** | `core/truth/truth_engine.mjs:82` |
| **Minimal Fix** | Accept optional timestamp param |

### PP-12 | P3 | History Truncation Magic Number

| Поле | Значение |
|------|----------|
| **Symptom** | FSM keeps only last 100 transitions (hardcoded) |
| **Evidence** | `core/governance/mode_fsm.mjs:197` |
| **Minimal Fix** | Externalize to config |

### PP-13 | P3 | Console.error in MasterExecutor

| Поле | Значение |
|------|----------|
| **Symptom** | `console.error('[MasterExecutor] Event logging failed:', err.message)` |
| **Evidence** | `core/exec/master_executor.mjs:435` |
| **Minimal Fix** | Use structured error reporting instead of console |

---

## SUMMARY

| Severity | Count | Top Issue |
|----------|-------|-----------|
| P0 | 0 | — |
| P1 | 4 | Idempotency placeholder, kill switch persistence, HALT double-key, kill switch metrics |
| P2 | 6 | Date.now() leaks, script navigation, default seed, canary scenarios, promo cooldown, static fees |
| P3 | 3 | Cosmetic: timestamps, magic numbers, console.error |

**Общий вердикт: НЕТ P0 БЛОКЕРОВ. Система стабильна и хорошо гейтирована для CERT mode. P1 items критичны ТОЛЬКО для перехода к live trading.**
