# ROADMAP — Treasure Engine
Дата: 2026-03-03
Режим: evidence-driven, fail-closed

---

## Sprint 0 — РЕАНИМАЦИЯ (1-2 дня)

### Цели
Закрыть 3 блокера, оживить health button организма.

### Задачи

| # | Задача | Файл | Diff | Критичность |
|---|--------|------|------|-------------|
| S0.1 | Fix MINE-01: budget_ms → budget_millis | scripts/ops/state_manager.mjs:460 | 1 строка | P0 — разблокирует ops:life |
| S0.2 | Bootstrap vendored toolchain | `npm run -s ops:node:toolchain:bootstrap` | Команда (требует сеть одноразово) | P0 — разблокирует verify:fast |
| S0.3 | Fix MINE-08: regression EC anomaly | scripts/verify/regression_net_toolchain01*.mjs | Exit code fix | P2 — fail-closed integrity |
| S0.4 | npm audit fix (ajv) | `npm audit fix` | Lock file update | P2 |
| S0.5 | Убрать placeholder hashes | EDGE_PROFIT_00/TRIALS_LEDGER.md | Delete/mark STUB | P2 |

### Definition of Done (DoD)
```bash
npm run -s verify:fast       # run 1 → PASS (EC=0)
npm run -s verify:fast       # run 2 → PASS (EC=0) — determinism proof
npm run -s ops:life          # EC=0 (no crash)
npm run -s ops:doctor        # EC=0 (HEALTHY)
npm run -s ops:cockpit       # EC=0 (fsm state visible)
```

### Гейты
- verify:fast x2: IDENTICAL PASS
- ops:life: EC=0
- ops:doctor: EC=0, scoreboard > 50/100
- 0 placeholder SHA256 в EDGE_PROFIT_00/

### Риски
- Bootstrap toolchain требует интернет (одноразово)
- После bootstrap всё работает offline

### ONE_NEXT_ACTION
```bash
# Fix state_manager.mjs:460: budget_ms → budget_millis
```

---

## Sprint 1 — ОРГАНИЗМ ЖИВОЙ (3-7 дней)

### Цели
Дожать нервную систему, закрыть дыры детерминизма, wiring судов.

### Задачи

| # | Задача | Описание | Effort |
|---|--------|----------|--------|
| S1.1 | Расширить SAN01 на core/ | Scan core/**/*.mjs для Date.now/Math.random + allowlist | 2-4 часа |
| S1.2 | Fix DeterministicClock default | `??` вместо `\|\|`; assert in CERT mode | 15 мин |
| S1.3 | Оживить backtest determinism x2 | Обрезать ajv import chain в engine → contracts | 1 час |
| S1.4 | Wire 3 ключевых суда в sweep | strategy_sweep → deflatedSharpe + bootstrapCI + adversarial | 1-2 дня |
| S1.5 | mode_fsm.mjs inject clock | 3 callsites: Date.now() → ctx.clock.now() | 30 мин |
| S1.6 | Event schema allowlist | Explicit allowlist для budget_millis и будущих полей | 2-4 часа |
| S1.7 | Eliminate ctx fallback в master_executor | Remove 12x `\|\| Date.now()` patterns | 1 день |

### DoD
```bash
npm run -s verify:fast                    # x2 PASS (с новыми гейтами)
npm run -s ops:life                       # PASS — FSM transitions work
npm run -s ops:doctor                     # HEALTHY (scoreboard > 70/100)
# Новые гейты:
npm run -s verify:regression:san01-core   # PASS (или allowlist задокументирован)
npm run -s verify:regression:bt01-det-x2  # PASS
npm run -s verify:regression:bt02-courts  # PASS
```

### Гейты
- RG_SAN01_CORE_SCOPE: PASS
- RG_BT01_DETERMINISM_X2_ALIVE: PASS
- RG_BT02_COURTS_WIRED: PASS
- RG_CLOCK01_NO_WALLCLOCK_DEFAULT: PASS
- verify:fast x2 IDENTICAL PASS

### Риски
- SAN01 expansion может вскрыть ~50+ нарушений → нужен disciplined allowlist
- Courts wiring может потребовать рефакторинг strategy_sweep interface

### ONE_NEXT_ACTION
```bash
npm run -s verify:regression:san01-global-forbidden-apis
# Расширить scope, запустить, triage violations
```

---

## Sprint 2 — BACKTEST ORGAN + DATA (1-3 недели)

### Цели
Upgradить backtest engine, acquirить данные, начать paper trading.

### Задачи

| # | Задача | Описание | Effort |
|---|--------|----------|--------|
| S2.1 | Square-root market impact | Добавить в engine.mjs: `sqrt(size/ADV) * coeff` | 1-2 дня |
| S2.2 | Data acquisition: funding rates | Binance funding rate history → capsule | 2-3 дня |
| S2.3 | Data acquisition: OI | Binance open interest history → capsule | 2-3 дня |
| S2.4 | Fill probe implementation | Real testnet fill detection | 3-5 дней |
| S2.5 | Profit ledger refresh | Regenerate state from latest capsule | 2-4 часа |
| S2.6 | Paper trading setup | s1_breakout_atr → testnet paper harness | 3-5 дней |

### DoD
- >=2 data feeds acquired с SHA256 locked
- Market impact model: verified on 3+ symbols
- >=1 strategy: paper trading started (30-day target)
- Breakpoint fee multiplier recalculated с market impact

### Гейты
- Data quorum gate: >=2 feeds
- verify:e108 (backtest determinism x2): PASS
- edge:profit:00: PASS с реальными данными
- Impact model: determinism x2 PASS

### Риски
- Funding rate API может быть rate-limited
- Market impact model может показать что expectancy < cost → HOLD_STRICT
- Paper trading timeframe: 30 дней minimum

### ONE_NEXT_ACTION
```bash
npm run -s e109:capsule:build
```

---

## Sprint 3 — PROFIT LANE (1-2 месяца)

### Цели
Fail-closed путь к первому доллару: acquire → lock → offline replay → paper → micro-live.

### Задачи

| Фаза | Задача | Продолжительность | Блокируется |
|------|--------|-------------------|-------------|
| **ACQUIRE** | Capsule build: Binance/Bybit public data | 3-5 дней | Network access |
| **LOCK** | SHA256 lock + replay verification x2 | 1 день | Capsule ready |
| **OFFLINE REPLAY** | Backtest x2 → 7-court pipeline → proof | 2-3 дня | Lock done |
| **PAPER** | Paper trading: testnet, 30+ дней, 100+ trades | 30-45 дней | Replay PASS |
| **MICRO-LIVE** | Canary: $5-25 max, 1 trade/day, 7-day | 7-14 дней | Paper PASS |

### DoD
- >=1 стратегия: прошла все суды с реальными данными
- Paper trading: 30+ дней evidence с SHA256 chain
- Micro-live: 7+ дней без catastrophic failure
- Governance FSM: DRY_RUN → LIVE_TESTNET transition approved
- Breakpoint fee multiplier >= 1.5x (relaxed) или >= 2.0x (strict)

### Гейты
- verify:e109 (data quorum): PASS
- verify:e109 (live safety): PASS
- edge:profit:00:x2: PASS
- verify:regression:no-stub-promotion: PASS
- Governance approval: documented

### Риски
- **Высокий**: Реальный expectancy < proxy → HOLD_STRICT verdict
- **Средний**: Exchange API changes → adapter maintenance
- **Средний**: Testnet ≠ mainnet slippage/latency
- **Низкий**: ETHUSDT losses → drop из candidate pool

### ONE_NEXT_ACTION
```bash
npm run -s edge:profit:00:acquire:public
```

---

## TIMELINE ВИЗУАЛИЗАЦИЯ

```
Неделя 0    │ Sprint 0: РЕАНИМАЦИЯ (3 фикса, health button)
            │ ────────────▶ verify:fast x2 PASS, ops:life PASS
            │
Неделя 1-2  │ Sprint 1: ОРГАНИЗМ ЖИВОЙ
            │ ────────────▶ SAN01 core, courts wired, determinism strict
            │
Неделя 2-5  │ Sprint 2: BACKTEST + DATA
            │ ────────────▶ market impact, data acquisition, paper setup
            │
Неделя 5-12 │ Sprint 3: PROFIT LANE
            │ ├── ACQUIRE (3-5 дней)
            │ ├── LOCK + REPLAY (3-4 дня)
            │ ├── PAPER (30-45 дней)
            │ └── MICRO-LIVE (7-14 дней)
            │ ────────────▶ First $ (fail-closed, evidence-proven)
```
