# TREASURE ENGINE — ТОТАЛЬНЫЙ АУДИТ ДО БАЙТА
Дата: 2026-03-03
Режим: CERT (offline)
Аудитор: Claude (Principal Engineer + QA Officer + Security Auditor + Quant Designer + SRE)

---

## 1) SNAPSHOT

| Параметр | Значение |
|----------|----------|
| Branch | `claude/treasure-engine-audit-u4X28` |
| HEAD SHA | `bdbf61f4aabe31a5d8d5ee1e8489f5e92896f578` |
| Node.js | v22.22.0 (system) |
| npm | 10.9.4 |
| git status | clean |
| Режим | CERT (offline) — ALLOW_NETWORK не найден |
| node_modules | Отсутствовал, установлен через `npm install` |
| Vendored toolchain | ОТСУТСТВУЕТ (artifacts/toolchains/node/v22.22.0/) |
| Запускалось | verify:fast x2, ops:life, ops:doctor, ops:cockpit, ops:timemachine, ops:autopilot, 20+ regression gates |

---

## 2) WHAT WORKS (сильные стороны)

### Архитектура "живого организма" — уникальна и почти реализована
- **FSM Nervous System** (specs/fsm_kernel.json): 7 состояний, 7 переходов, 5 запрещённых пар, circuit breaker, BFS goal-seeking — полностью специфицирован и реализован в `scripts/ops/state_manager.mjs` (637+ строк)
- **Doctor OS v3** (scripts/ops/doctor_v2.mjs): 9 фаз, 5 chaos-гейтов (mode lie, orphan injection, evidence tamper, FP01 trap, net leak), self-heal таксономия, scoreboard 100 баллов
- **MetaAgent Life** (scripts/ops/life.mjs): 6+1 фаза, fleet consciousness, immune memory
- **Cockpit HUD** (scripts/ops/cockpit.mjs): EventBus-unified dashboard, PASS EC=0

### Fail-closed культура — настоящая, не декоративная
- **16 регрессионных гейтов** в AGENTS.md, все с npm scripts, автоматически проверяемые
- **verify:fast**: цепочка из 35+ проверок — от toolchain до byte-audit x2
- **Determinism x2**: встроен в FSM (T02: action_x2=true), бэктест (hash comparison), byte-audit
- **Evidence protocol**: каждый epoch → `reports/evidence/EPOCH-*/**`, checksums, verdicts
- **65 закрытых эпох** (specs/epochs/LEDGER.json) — все PASS/DONE

### Edge Lab — серьёзная квантовая инфраструктура
- **19-шаговый pipeline** судов: sources → registry → candidates → paper → expectancy → hypothesis → portfolio → dataset → execution → risk → overfit → redteam → sre → verdict
- **13/13 судов PASS** (EDGE_LAB/FINAL_VERDICT.md)
- **Overfit defense**: CPCV splits с purge/embargo, Bayesian Sharpe, adversarial validation, walk-forward
- **Risk fortress**: Vol-regime adaptive sizing (LOW 1.0x → CRISIS 0.25x), hard stops (trade 2.5%, day 6%, week 12%)
- **5 торговых стратегий** (s1-s5) с чистым интерфейсом meta/init/onBar
- **178 optimization trials** по 4 кандидатам

### Безопасность — чисто
- **Ноль eval()/new Function()** во всей кодовой базе
- **Ноль hardcoded secrets** — все API keys через process.env
- **Multi-key arming** для live: 5 независимых safety checks
- **TREASURE_NET_KILL preload** в 55 файлах — enforcement на уровне Node.js runtime
- **Governance FSM**: DRY_RUN → LIVE_TESTNET → LIVE_PRODUCTION с mandatory approval

### Детерминизм — хорошо спроектирован
- **DeterministicClock + DeterministicRNG** в core/sys/
- **Unified Sharpe SSOT** (core/edge/unified_sharpe.mjs): 3 железных правила, zero dependencies
- **truncateTowardZero** вместо banker's rounding — для воспроизводимости
- **xorshift128+ PRNG** с 10-iter warmup (core/sim/rng.mjs)
- **SeededRNG + seed из sha256(dataset_sha + ssot_sha)** — строгая привязка

### Минимальные зависимости — осознанный выбор
- Всего 3 зависимости (undici, ws, ajv-dev) + 1 optional (better-sqlite3)
- Вся математика (Sharpe, erf, Monte Carlo, HMM) — написана руками, zero deps

---

## 3) WHAT'S BROKEN / MINES (слабые стороны)

| ID | Sev | Symptom | Root Cause | Evidence | Fix (Patch Plan) | Regression Gate |
|----|-----|---------|-----------|----------|-------------------|-----------------|
| **MINE-01** | **P0** | ops:life CRASH: `EVT_SCHEMA_ERROR: forbidden field name: "attrs.budget_ms"` | `FORBIDDEN_FIELD_RE = /(_at\|_ts\|_ms\|...)/i` в event_schema_v1.mjs:19 ложно срабатывает на `budget_ms` — это не timestamp, а timeout бюджет | state_manager.mjs:460 передаёт `budget_ms: String(timeoutMs)` в attrs; event_schema_v1.mjs:145 бросает исключение | Переименовать `budget_ms` → `budget_millis` в state_manager.mjs:460 (1 строка diff). ИЛИ: добавить `budget_ms` в allowlist в event_schema_v1.mjs | Новый: `RG_EVT03_BUDGET_FIELD_ALLOWED` |
| **MINE-02** | **P0** | verify:fast BLOCKED EC=2 — `ACQ_LOCK01 node_toolchain_ensure` | Vendored node toolchain отсутствует: нет `artifacts/toolchains/node/v22.22.0/` и lock.json | node_toolchain_ensure.mjs:48 — `!fs.existsSync(LOCK_PATH)` | `npm run -s ops:node:toolchain:bootstrap` (требует сеть) — после bootstrap verify:fast пройдёт | Существующий: `RG_NET_TOOLCHAIN01` |
| **MINE-03** | **P1** | ops:doctor FAIL — `STARTUP: BOOT_FAIL` | Doctor зависит от verify:fast в startup probe; verify:fast блокирован (MINE-02) | doctor_v2.mjs → spawnSync verify:fast → EC=2 → FAIL | Устранить MINE-02 → doctor автоматически заработает | — |
| **MINE-04** | **P1** | Детерминизм core/ не сканируется автоматически | regression_san01 сканирует только scripts/ops/ и scripts/edge/data_organ/, НЕ core/ | 439 Date.now() и 80 Math.random() в core/ без автоматического enforcement | Расширить san01 scan scope на core/**/*.mjs; добавить allowlist для легитимных (live_adapter, system_clock) | Расширенный: `RG_SAN01_CORE_SCOPE` |
| **MINE-05** | **P1** | DeterministicClock defaults to Date.now() | clock.mjs:12: `this.currentTime = initialTime \|\| Date.now()` — falsy 0 и undefined оба дают wall clock | core/sys/clock.mjs:12 | Заменить `\|\|` на `?? Date.now()` и добавить assert: `if (initialTime === undefined) throw` в CERT mode | `RG_CLOCK01_NO_WALLCLOCK_DEFAULT` |
| **MINE-06** | **P1** | Backtest determinism x2 contract мёртв | Import chain: e108_backtest_determinism_x2_contract → engine.mjs → contracts.mjs → `import Ajv from 'ajv'` → ajv не в prod deps | artifacts/BACKTEST_ORGAN_AUDIT_SPEC_v2.0.md, lines 72-92 | Обрезать цепочку: engine.mjs не должен импортировать contracts.mjs; использовать deterministic_math.mjs напрямую | `RG_BT01_DETERMINISM_X2_ALIVE` |
| **MINE-07** | **P2** | ajv ReDoS vulnerability (CVE GHSA-2g4f-4pwh-qvx6) | ajv ^8.17.1 имеет moderate ReDoS при $data option | `npm audit` → 1 moderate | `npm audit fix` или pin ajv@8.17.2+ | — |
| **MINE-08** | **P2** | regression:net-toolchain01 FAIL с EC=0 | Gate логически FAIL но exit code 0 — нарушение fail-closed семантики | `npm run -s verify:regression:net-toolchain01-no-net-in-verify-fast` → `[FAIL] ... EC=0` | EC должен быть !=0 при FAIL. Проверить exit logic в regression script | `RG_NET_TOOLCHAIN01_EC_CONTRACT` |
| **MINE-09** | **P2** | Edge Lab courts не wired в backtest/sweep | 7 судов (deflated Sharpe, bootstrap CI, etc.) существуют в core/edge_lab/courts/, но strategy_sweep запускает только backtest x2 → CT01 | artifacts/BACKTEST_ORGAN_AUDIT_SPEC_v2.0.md, lines 94-100 | Wiring: strategy_sweep вызывает court pipeline после backtest x2 | `RG_BT02_COURTS_WIRED` |
| **MINE-10** | **P2** | EDGE_PROFIT_00 placeholder hashes | EDGE_PROFIT_00/TRIALS_LEDGER.md содержит `sha256:1111...`, `sha256:2222...` — фальшивые | EDGE_PROFIT_00/TRIALS_LEDGER.md, lines 9-11 | Удалить placeholder entries или пометить STATUS=STUB | `RG_EP00_NO_PLACEHOLDERS` |
| **MINE-11** | **P2** | Все 4 profit candidates: NEEDS_DATA | EDGE_LAB/PROFIT_CANDIDATES_V1.md — все 4 кандидата без paper evidence | EDGE_LAB/PROFIT_CANDIDATES_V1.md | Data acquisition sprint: funding rates, OI, liquidations | — |
| **MINE-12** | **P2** | Fill probe runner — stub (always returns filled=false) | core/live/e125_fill_probe_runner.mjs:7 — `fill` hardcoded to `false` | core/live/e125_fill_probe_runner.mjs:7 | Имплементировать real fill detection или пометить как STUB | — |
| **MINE-13** | **P2** | Profit ledger state: данные 2+ лет назад (Nov 2023) | core/edge/state/profit_ledger_state.md — даты Nov 2023 | profit_ledger_state.md | Обновить при next data acquisition | — |
| **MINE-14** | **P3** | Breakpoint fee multiplier ниже порога (1.667x < 2.0x) | Proxy expectancy 0.50% с 0.30% round-trip cost | EDGE_LAB/EXECUTION_REALITY_POLICY.md, line 139 | Или реальный expectancy выше proxy, или снижение costs (maker fees, co-location) | — |
| **MINE-15** | **P3** | mode_fsm.mjs: 3x direct Date.now() без injection | core/governance/mode_fsm.mjs lines 78, 158, 247 | Grep: `Date.now()` in mode_fsm.mjs | Inject clock через context | `RG_SAN01_CORE_SCOPE` |

---

## 4) GATE MATRIX

| Gate | Run 1 | Run 2 | First Failing Step | Verdict |
|------|-------|-------|--------------------|---------|
| **verify:fast** | BLOCKED (EC=2) | BLOCKED (EC=2) | `ops:node:toolchain:ensure` → ACQ_LOCK01 | **BLOCKED** |
| **ops:life** | CRASH (EC=1) | — | `event_schema_v1.mjs:145` → EVT_SCHEMA_ERROR (budget_ms) | **FAIL** |
| **ops:doctor** | FAIL (EC=1) | — | STARTUP: BOOT_FAIL (verify:fast blocked) | **FAIL** |
| **ops:cockpit** | PASS (EC=0) | — | — | **PASS** |
| **ops:timemachine** | PASS (EC=0) | — | — | **PASS** |
| **ops:autopilot** | PASS (EC=0) | — | — | **PASS** |
| **Determinism verdict** | IDENTICAL (оба BLOCKED на одном шаге) | — | — | BLOCKED/IDENTICAL |

### Regression Gates (индивидуально)

| Gate | Status | EC |
|------|--------|----|
| RG_AGENT01_AGENTS_PRESENT | PASS | 0 |
| RG_AGENT02_CLAUDE_MD_DRIFT | PASS | 0 |
| RG_TIME01_STABLE_TICK_ORDER | PASS | 0 |
| RG_TIME02_NO_TIME_FIELDS | PASS | 0 |
| RG_AUTO01_MODE_ROUTER | PASS | 0 |
| RG_CERT_EXECUTOR_WRITE01 | PASS | 0 |
| RG_NET_TOOLCHAIN01 | **FAIL** (logic) / EC=0 (anomaly!) | 0 |
| RG_LIQ_LOCK01 | PASS | 0 |
| RG_LIQ_SSOT01 | PASS | 0 |
| RG_FSM01_NO_SKIP_STATES | PASS | 0 |
| RG_FSM02_CONSCIOUSNESS | PASS | 0 |
| RG_IMMUNE01_INTEGRATION | PASS | 0 |
| RG_METAAGENT01_FLEET | PASS | 0 |
| RG_SAN01_FORBIDDEN_APIS | PASS | 0 |
| RG_BACKTEST01_ORGAN_HEALTH | PASS | 0 |
| RG_ND_BYTE02_REPO_MANIFEST | PASS (3.2s) | 0 |
| RG_NODE_TRUTH_ALIGNMENT | PASS | 0 |
| RG_CHURN_CONTRACT01 | PASS | 0 |
| RG_NETKILL_LEDGER | PASS | 0 |
| RG_PR01_EVIDENCE_BLOAT | PASS | 0 |
| RG_LIFE04_NEXT_ACTION | PASS | 0 |

**Итого: 20 PASS, 1 FAIL (anomalous EC=0), 1 BLOCKED (verify:fast)**

---

## 5) SECURITY / POLICY / OFFLINE AUTHORITY

### Network: где может протечь

| Точка | Файл | Защита | Риск |
|-------|------|--------|------|
| Bybit REST API | core/live/exchanges/bybit_rest_testnet.mjs | CI block + ENABLE_NET + I_UNDERSTAND_LIVE_RISK | Mainnet path EXISTS в том же файле; только env var гейтит |
| Binance client | core/exec/adapters/binance_client.mjs | ENABLE_NET + API key check | Аналогично |
| WebSocket feeds | core/data/providers/ | TREASURE_NET_KILL preload | Покрыто, но 5 провайдеров |
| npm install | package.json | Нет SHA256 pinning в package.json (есть integrity в lock) | При чистой установке — зависит от registry |

### Write-scope: осиротевшие артефакты

| Директория | Размер | Риск |
|-----------|--------|------|
| reports/ | 4,944 файлов | Огромный объём evidence; PR hygiene гейт (RG_PR01) проверяет bloat |
| reports/evidence/EXECUTOR/ | ~50+ файлов | CERT write target; protected by RG_CERT_EXECUTOR_WRITE01 |
| artifacts/incoming/ | 30+ файлов | Incoming artifacts не проверяются на orphans |

### Supply chain: Node toolchain integrity

- **Ожидание**: vendored node v22.22.0 с SHA256 lock (artifacts/toolchains/node/v22.22.0/)
- **Факт**: директория ОТСУТСТВУЕТ; система работает на system node
- **Риск**: при bootstrap скачивается binary с nodejs.org, проверяется SHA256 через lock file
- **Покрытие**: AGENTS.md R6 ("Node SSOT 22.22.0; ladder HOST→DOCKER→VENDORED")

---

## 6) ORGANS STATUS (таблица организма)

| Орган | Статус | Evidence | Риски | Next Fix |
|-------|--------|----------|-------|----------|
| **FSM Brain** (state_manager) | **DEGRADED** | specs/fsm_kernel.json: 7 states, 7 transitions implemented; state_manager.mjs: 637 lines. Но crash в ops:life (MINE-01) | budget_ms field crash блокирует все FSM transitions | Fix MINE-01 (1 строка: budget_ms → budget_millis) |
| **Doctor OS** (doctor_v2) | **DEGRADED** | 9 фаз, 5 chaos gates, scoreboard. Но BOOT_FAIL из-за verify:fast (MINE-02+03) | Не может диагностировать организм | Fix MINE-02 (bootstrap toolchain) → doctor оживёт |
| **Immune System** | **ALIVE** | regression_immune01_integration: PASS; immune_memory в scripts/lib/ | Работает offline, проверяется регрессией | — |
| **Cockpit HUD** | **ALIVE** | ops:cockpit: PASS EC=0; HUD.md + HUD.json генерируются | Показывает fsm=CERTIFYING, readiness=NEEDS_DATA | — |
| **TimeMachine** | **ALIVE** | ops:timemachine: PASS EC=0; TIMELINE.jsonl генерируется | Нет активных эпох (NO_EPOCH) | — |
| **Autopilot Court** | **ALIVE** | ops:autopilot: PASS EC=0; DRY_RUN mode=LIFE | Работает, но не принимает решений без данных | — |
| **EventBus** | **ALIVE** | event_schema_v1.mjs + eventbus_v1.mjs; 0 events в текущем bus | Schema validator слишком агрессивен (MINE-01) | Fix MINE-01 |
| **Backtest Engine** | **DEGRADED** | engine.mjs: 183 lines, no-lookahead, parametric cost. Но determinism x2 contract мёртв (MINE-06) | Нет автоматической проверки воспроизводимости | Fix MINE-06 (обрезать ajv chain) |
| **Edge Lab** | **ALIVE** | 19-step pipeline, 13/13 courts PASS, 178 trials | Courts не wired в backtest sweep (MINE-09) | Wire courts in strategy_sweep |
| **Risk Fortress** | **ALIVE** | Vol-regime sizing, hard stops, PBO/DSR penalties | Breakpoint < 2.0x (MINE-14) | Data acquisition + expectancy validation |
| **Profit Ledger** | **ALIVE** | ledger.mjs: 240 lines, position tracking, drawdown, anomaly detection | Stale state (Nov 2023) | Refresh with live data |
| **Data Organ** | **NEEDS_DATA** | Providers exist (Binance, Bybit, Kraken, OKX), capsule builders present | Funding rates, OI, liquidations NOT ACQUIRED | Data acquisition sprint |
| **Governance FSM** | **ALIVE** | DRY_RUN → TESTNET → PRODUCTION; approval workflow | 3x direct Date.now() without injection (MINE-15) | Inject deterministic clock |
| **Net Kill** | **ALIVE** | TREASURE_NET_KILL preload in 55 files, 122 references | Покрытие полное для CERT mode | — |

---

## 7) ROADMAP

### Sprint 0 (1-2 дня): Закрыть блокеры, оживить health button

**Цели:**
1. Fix MINE-01: budget_ms → budget_millis в state_manager.mjs:460 (1 строка)
2. Fix MINE-02: bootstrap vendored toolchain (`npm run -s ops:node:toolchain:bootstrap`)
3. Fix MINE-08: regression:net-toolchain01 EC must be !=0 on FAIL

**DoD:**
- `npm run -s verify:fast` x2 = PASS
- `npm run -s ops:life` = PASS (no crash)
- `npm run -s ops:doctor` = HEALTHY
- Все 3 фикса с regression gates

**Гейты:**
- verify:fast x2 IDENTICAL PASS
- ops:life EC=0
- ops:doctor EC=0

**Риски:** Bootstrap требует сеть (одноразово). После bootstrap всё offline.

**ONE_NEXT_ACTION:**
```bash
# В state_manager.mjs:460: budget_ms → budget_millis
```

---

### Sprint 1 (3-7 дней): Организм живой + нервная система дожата

**Цели:**
1. Fix MINE-04: расширить SAN01 scan scope на core/
2. Fix MINE-05: DeterministicClock — strict mode (throw on missing initialTime in CERT)
3. Fix MINE-06: обрезать ajv chain в backtest engine
4. Fix MINE-07: npm audit fix (ajv)
5. Wire Edge Lab courts в backtest sweep (MINE-09)
6. Убрать placeholder hashes (MINE-10)

**DoD:**
- SAN01 покрывает core/ → 0 violations (или allowlist задокументирован)
- Backtest determinism x2 contract PASS
- Edge Lab courts вызываются из strategy_sweep
- Ноль placeholder SHA256

**Гейты:**
- Расширенный RG_SAN01_CORE_SCOPE: PASS
- RG_BT01_DETERMINISM_X2_ALIVE: PASS
- RG_BT02_COURTS_WIRED: PASS
- verify:fast x2 PASS (включая новые гейты)

**Риски:** Расширение SAN01 может вскрыть десятки нарушений в core/. Нужен allowlist для легитимных (live adapters, system clock).

---

### Sprint 2 (1-3 недели): Backtest organ upgrade + courts wiring

**Цели:**
1. Имплементировать square-root market impact в engine.mjs
2. Data acquisition: funding rates, OI, liquidations
3. Paper trading evidence для 4 кандидатов
4. Fill probe runner: имплементировать real fill detection
5. Обновить profit_ledger_state с свежими данными

**DoD:**
- >=2 кандидата перешли из NEEDS_DATA в ELIGIBLE_FOR_PAPER
- Paper trading evidence с реальными SHA256
- Fill probe runner возвращает реальный результат
- Breakpoint fee multiplier >= 2.0x (или задокументирован reason для lower threshold)

**Гейты:**
- verify:e108 (backtest determinism x2): PASS
- edge:profit:00:x2: PASS
- verify:regression:no-stub-promotion: PASS

**Риски:** Data acquisition требует сеть. Breakpoint может остаться < 2.0x.

---

### Sprint 3 (1-2 месяца): Profit lane (acquire → lock → offline replay → paper → micro-live)

**Цели:**
1. **Acquire**: Capsule build с реальными данными (Binance/Bybit public + private fills)
2. **Lock**: SHA256 lock + offline replay verification x2
3. **Offline Replay**: Backtest x2 → Edge Lab 7-court pipeline → determinism proof
4. **Paper**: Paper trading harness с реальным exchange data (testnet)
5. **Micro-Live**: Canary deployment с $5-25 max notional, 1 trade/day, $5 max loss

**DoD:**
- >=1 кандидат: ELIGIBLE_FOR_MICRO_LIVE
- Governance approval: DRY_RUN → LIVE_TESTNET
- Paper evidence: 30+ дней, >=100 trades
- Micro-live: 7+ дней canary без catastrophic failure

**Гейты:**
- verify:e109 (data quorum): PASS
- verify:e109 (live safety): PASS
- edge:profit:00:real:run: PASS с реальными данными
- Governance FSM transition: DRY_RUN → LIVE_TESTNET approved

**Риски:**
- Реальный expectancy может быть ниже proxy
- Exchange API changes
- Testnet vs mainnet discrepancies
- ETHUSDT показывает losses в текущем state — может не пройти court

---

## 8) TOP 20 UPGRADES

| # | Upgrade | Impact | Effort | Risk | Minimal вариант | Radical вариант | Gates needed |
|---|---------|--------|--------|------|-----------------|-----------------|-------------|
| 1 | **Fix budget_ms crash (MINE-01)** | 10 | 1 | 1 | Rename field: 1 строка diff | Allowlist mechanism в event_schema | RG_EVT03 |
| 2 | **Bootstrap vendored toolchain (MINE-02)** | 10 | 2 | 2 | `ops:node:toolchain:bootstrap` | Docker-based vendoring + SHA256 chain | RG_NET_TOOLCHAIN01 |
| 3 | **Расширить SAN01 на core/ (MINE-04)** | 9 | 3 | 3 | Добавить core/ в scan targets + allowlist | AST-based analysis вместо regex | RG_SAN01_CORE_SCOPE |
| 4 | **Fix DeterministicClock default (MINE-05)** | 8 | 1 | 2 | `??` вместо `\|\|` + assert | Убрать default полностью, require explicit time | RG_CLOCK01 |
| 5 | **Оживить backtest determinism x2 (MINE-06)** | 9 | 2 | 2 | Обрезать ajv import chain | Переписать contracts без ajv | RG_BT01 |
| 6 | **Wire Edge Lab courts в sweep (MINE-09)** | 8 | 4 | 3 | Вызвать 3 ключевых суда после backtest x2 | Полный pipeline из 7 судов | RG_BT02 |
| 7 | **Fix regression EC anomaly (MINE-08)** | 7 | 1 | 1 | `process.exit(status !== 'PASS' ? 1 : 0)` | Audit все regression gates на EC consistency | RG_EC_CONTRACT |
| 8 | **Square-root market impact в engine** | 7 | 3 | 3 | Параметрический impact: `sqrt(size/ADV) * coefficient` | Full orderbook impact model | RG_BT03_IMPACT |
| 9 | **Data acquisition sprint** | 9 | 5 | 4 | Funding rates + OI (2 feeds) | All feeds + historical + live | Data quorum gates |
| 10 | **Paper trading evidence** | 9 | 5 | 3 | 1 стратегия, 30 дней testnet | All 4 candidates, 90+ дней | edge:profit:00 pipeline |
| 11 | **Убрать placeholder hashes (MINE-10)** | 6 | 1 | 1 | Delete placeholder lines | Registry validation gate | RG_EP00_NO_PLACEHOLDERS |
| 12 | **npm audit fix (ajv ReDoS)** | 5 | 1 | 1 | `npm audit fix` | Pinned version in lockfile | npm audit clean |
| 13 | **Fill probe: real implementation** | 7 | 4 | 4 | Testnet fill detection | Full exchange fill reconciliation | verify:e125 |
| 14 | **Profit ledger state refresh** | 6 | 2 | 2 | Regenerate from latest capsule | Auto-refresh mechanism | — |
| 15 | **mode_fsm.mjs: inject clock** | 5 | 2 | 1 | Pass clock через context в 3 callsites | Refactor all governance modules to use clock | RG_SAN01_CORE |
| 16 | **Performance: parallel gate execution** | 6 | 5 | 4 | Parallel verify:fast sub-gates (Promise.allSettled) | Gate dependency DAG с parallel execution | verify:fast timing |
| 17 | **Evidence pruning automation** | 5 | 3 | 3 | Archival script для reports/evidence/ >30 дней | Auto-archive с SHA256 index | RG_PR01 |
| 18 | **Cockpit: live FSM state visualization** | 4 | 3 | 2 | ASCII state diagram в HUD.md | Web dashboard с real-time updates | ops:cockpit |
| 19 | **Canary micro-live deployment** | 8 | 7 | 5 | $5 max notional, 1 trade/day, 7-day canary | Full graduated deployment pipeline | verify:e121-e127 |
| 20 | **CI/CD pipeline** | 6 | 5 | 3 | GitHub Actions: verify:fast x2 on PR | Full: verify:fast + edge + evidence packing | — |

---

## 9) VERDICT

### Статус: **BLOCKED**

| Параметр | Значение |
|----------|----------|
| **block_reason_surface** | CONTRACT (toolchain + event schema) |
| **reason_code** | ACQ_LOCK01 + EVT_SCHEMA_ERROR |
| **first_failing_step_cmd** | `npm run -s ops:node:toolchain:ensure` (verify:fast) |
| **second_failing_cmd** | `npm run -s ops:life` (budget_ms crash) |

### Честная оценка

**Treasure Engine — это впечатляющий проект.** Архитектура "живого организма" с FSM brain, doctor, immune system, courts — это не декорация, а работающая инфраструктура с 65 закрытыми эпохами, 1002 npm scripts, 16 regression gates, 19-шаговым Edge Lab pipeline.

**Но организм сейчас "в коме":**
- verify:fast заблокирован vendored toolchain (одноразовый bootstrap)
- ops:life crash на budget_ms (1 строка fix)
- ops:doctor не может стартовать (зависит от verify:fast)

**Путь к "живому организму":** Sprint 0 (1-2 дня) из 3 минимальных фиксов. Всё остальное работает.

**Путь к profit:** Sprint 2-3 (3-8 недель) — data acquisition, paper trading, court validation. Breakpoint fee multiplier < 2.0x — ключевой риск.

---

## 10) ONE_NEXT_ACTION

```bash
# Fix MINE-01: в scripts/ops/state_manager.mjs:460 переименовать budget_ms → budget_millis
# Это разблокирует ops:life и позволит doctor, life, FSM работать
```

---

*Полные артефакты аудита: `artifacts/audit/`*
*Карта репо: `artifacts/audit/REPO_MAP.md`*
*Лог команд: `artifacts/audit/COMMAND_LOG.md`*
*Снапшот: `artifacts/audit/SNAPSHOT.md`*
*Апгрейды: `artifacts/audit/UPGRADE_BACKLOG.md`*
*Роадмэп: `artifacts/audit/ROADMAP.md`*
