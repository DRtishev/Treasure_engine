# REPO_MAP — Карта организма Treasure Engine
Дата: 2026-03-03

## Общая статистика

| Метрика | Значение |
|---------|----------|
| Всего файлов (без .git, node_modules) | ~6,918 |
| Всего .mjs файлов | 1,418 |
| npm scripts в package.json | 1,002 |
| Эпох (specs/epochs/) | 67 (EPOCH-01..67) + 70+ edge epochs (E68..E137+) |
| Регрессионных гейтов (AGENTS.md) | 16 |
| Зависимостей (prod) | 2 (undici, ws) |
| Зависимостей (dev) | 1 (ajv) |
| Зависимостей (optional) | 1 (better-sqlite3) |
| Транзитивных пакетов | 45 |

## Структура директорий

```
Treasure_engine/
├── core/                   # 208 файлов — ядро торгового движка
│   ├── agent/              # Mesh интеграция агентов
│   ├── backtest/           # Бэктест-движок (engine.mjs — 183 строки)
│   ├── canary/             # Canary-деплой и тесты
│   ├── control/            # Мастер-контроллер
│   ├── court/              # Court v1/v2 валидация
│   ├── courts/             # Parity-суды
│   ├── data/               # 36+ файлов — провайдеры данных
│   │   └── providers/      # WebSocket провайдеры
│   ├── edge/               # 115+ файлов — Edge Lab ядро
│   │   ├── alpha/          # Magic suites
│   │   ├── calibration/    # Execution envelope калибровка
│   │   ├── contracts/      # Edge контракты
│   │   ├── fixtures/       # Тест-фикстуры
│   │   ├── state/          # State: cadence, profit, reason ledgers
│   │   └── strategies/     # 5 стратегий (s1-s5)
│   ├── edge_lab/           # Суды Edge Lab
│   ├── evidence/           # Evidence write mode
│   ├── exec/               # 14+ файлов — адаптеры исполнения
│   ├── execution/          # Калибровка execution cost
│   ├── gates/              # Live fill gate, readiness
│   ├── governance/         # Mode FSM, approval workflow
│   ├── live/               # Live runners, exchange interfaces
│   ├── monitoring/         # Safety monitoring
│   ├── obs/                # Event logging, reality gap
│   ├── paper/              # Paper trading harness
│   ├── persist/            # DB + миграции
│   ├── portfolio/          # Portfolio allocation
│   ├── profit/             # Profit ledger (ledger.mjs — 240 строк)
│   ├── risk/               # Risk governance
│   ├── sim/                # Simulation engine
│   ├── strategy/           # Strategy orchestration
│   ├── sys/                # clock, context, rng — ДЕТЕРМИНИЗМ
│   └── truth/              # Truth engine
│
├── scripts/                # 1,243 файла — скрипты и тесты
│   ├── ops/                # 40+ файлов — операции организма
│   │   ├── life.mjs        # METAAGENT ORGANISM (v4, EPOCH-72)
│   │   ├── state_manager.mjs # FSM Brain (BFS, circuit breaker)
│   │   ├── doctor_v2.mjs   # Living Doctor v3 (9 фаз)
│   │   ├── cockpit.mjs     # HUD dashboard
│   │   ├── autopilot_court_v2.mjs # Mode decisions
│   │   ├── fsm_guards.mjs  # Pure guard functions
│   │   ├── fsm_compensations.mjs # Saga rollbacks
│   │   ├── event_schema_v1.mjs # Event schema validator
│   │   └── eventbus_v1.mjs # Event bus
│   ├── verify/             # 70+ файлов — верификация
│   ├── edge/               # 180+ файлов — Edge Lab скрипты
│   ├── data/               # 80+ файлов — data pipeline
│   └── executor/           # 18 файлов — epoch executors
│
├── specs/                  # 131 файл — спецификации
│   ├── fsm_kernel.json     # НЕРВНАЯ СИСТЕМА (7 состояний, 7 переходов)
│   ├── policy_kernel.json  # ПОЛИТИКА (6 режимов, зоны, write-scope)
│   ├── doctor_manifest.json # ДОКТОР (probes, chaos, self-heal)
│   ├── epochs/             # 70+ спецификаций эпох
│   │   └── LEDGER.json     # 65 закрытых эпох (все PASS/DONE)
│   └── wow/                # 35+ WOW items
│
├── reports/                # 4,944 файла — отчёты и evidence
│   └── evidence/           # Per-epoch evidence folders
│
├── docs/                   # 86 файлов — документация
├── truth/                  # 9 файлов — JSON schemas + baseline
├── artifacts/              # 47 файлов — фикстуры, incoming, audit
├── EDGE_LAB/               # 62+ файлов — edge lab policies
├── EDGE_PROFIT_00/         # 6 файлов — profit research
└── schemas/                # 1 файл — evidence schema
```

## SSOT иерархия

```
AGENTS.md          ← SSOT для AI-агентов (правила R1-R14)
CLAUDE.md          ← Exec summary + ссылка на AGENTS.md
specs/fsm_kernel.json    ← НЕРВНАЯ СИСТЕМА организма
specs/policy_kernel.json ← ПОЛИТИКА ЯДРО (режимы, зоны)
specs/doctor_manifest.json ← ДОКТОР OS (пробы, хаос, самолечение)
specs/epochs/LEDGER.json   ← Реестр эпох
truth/                     ← JSON schemas (court, sim, events, etc.)
```

## Критическая цепочка (critical chain)

```
verify:fast → [ops:node:toolchain:ensure → 35+ regression gates → verify:repo:byte-audit:x2]
ops:life → [proprioception → consciousness(FSM runToGoal) → telemetry → doctor → reflex → immune → metaagent → seal]
ops:doctor → [self-heal → startup probe(verify:fast) → liveness(x2) → readiness → chaos → provenance → intelligence → immune → scoreboard]
ops:cockpit → [timemachine → autopilot → eventbus → fast_gate → pr01 → wow]
```

## Где детерминизм может течь

| Точка утечки | Файлы | Критичность |
|-------------|-------|-------------|
| Date.now() без injection | 439 occurrences в 152 файлах | P1 — core/ не сканируется автоматически |
| new Date() | 110 occurrences в 79 файлах | P2 |
| Math.random() | 80 occurrences в 27 файлах | P2 — perf_engine, mock_exchange, websocket_feed |
| DeterministicClock default=Date.now() | core/sys/clock.mjs:12 | P1 — silent fallback |
| ctx?.clock?.now() \|\| Date.now() | core/exec/master_executor.mjs (12x) | P1 — fallback при отсутствии ctx |
| mode_fsm.mjs direct Date.now() | core/governance/mode_fsm.mjs (3x) | P2 — без injection point |
| fs.mtime/statSync | 86 occurrences | P3 — используется для cache |
| process.hrtime | 6 occurrences | P3 — только perf measurement |
