# DOCTOR ENGINE — Тотальный Аудит & Гениальная Архитектура v3

> Дата: 2026-03-02 | Роль: АРХИТЕКТОР
> Исследовано: 22 файла Doctor-экосистемы, 8 фаз, 3 chaos probes, 4 healers, 7 FSM guards

---

## 1. ТЕКУЩЕЕ СОСТОЯНИЕ — ПОЛНАЯ КАРТА

### 1.1 Экосистема Doctor (22 файла)

```
╔══════════════════════════════════════════════════════════════════════╗
║                       DOCTOR ECOSYSTEM v2                           ║
║                                                                      ║
║  SCRIPTS:                                                            ║
║    scripts/ops/doctor.mjs         — v1 legacy (life x2 + policy)    ║
║    scripts/ops/doctor_v2.mjs      — v2 ЖИВОЙ (8 фаз)               ║
║    scripts/ops/data_health_doctor — per-lane SHA + lock verify      ║
║    scripts/ops/node_truth_doctor  — node version truth              ║
║    scripts/verify/e139-e142       — doctor evolution (node/proxy)    ║
║                                                                      ║
║  IMMUNE SYSTEM (EPOCH-71):                                          ║
║    scripts/lib/immune_memory.mjs  — failure_count, chaos, heals     ║
║    scripts/lib/self_heal.mjs      — 4 infra healers                 ║
║    scripts/verify/chaos_mode_lie  — mode:CERT injection probe       ║
║    scripts/verify/chaos_orphan    — orphan dir injection probe      ║
║    scripts/verify/chaos_fp01_trap — forbidden field injection probe ║
║                                                                      ║
║  STANDALONE (НЕ ПОДКЛЮЧЕНЫ к Doctor v2):                            ║
║    core/resilience/self_healing.mjs — CircuitBreaker + AutoRepair   ║
║    core/testing/chaos_engineer.mjs  — 10 сценариев (6 = stubs)     ║
║                                                                      ║
║  REGRESSION GATES:                                                   ║
║    regression_doctor01_output_stable_x2.mjs — x2 determinism       ║
║    regression_doctor02_no_net.mjs            — net_kill enforcement ║
║    regression_immune01_integration.mjs       — 7 integration checks║
║                                                                      ║
║  SPECS:                                                              ║
║    specs/doctor_manifest.json — declarative probe/chaos/heal config ║
║                                                                      ║
║  ORGANISM WIRING:                                                    ║
║    FSM: guard_probe_failure → reads EPOCH-DOCTOR receipt            ║
║    FSM: guard_healable → checks doctor_verdict context              ║
║    FSM: guard_heal_complete → reads EPOCH-HEAL receipt              ║
║    Life: T6 ops:doctor in TELEMETRY_STEPS                           ║
║    Life: immune_reflex in REFLEX_REGISTRY                           ║
║    EventBus: PROBE_FAIL, DOCTOR_VERDICT events                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 1.2 Фазы Doctor v2 — оценка

| Фаза | Что делает | Оценка |
|------|-----------|--------|
| **0: SELF-HEAL** | healAll() — 4 infra healers (executor/git/npm/orphans) | Узко: только infra |
| **1: STARTUP** | baseline:restore + verify:fast — abort on fail | Работает |
| **2: LIVENESS** | verify:fast x2 + ops:life x2 + determinism compare | Сильно |
| **3: READINESS** | verify:doctor:policy — policy + SAN | Одна проверка |
| **4: CHAOS** | 3 пробы: mode_lie, orphan, fp01 — все в tmpdir | Мало проб |
| **5: PROVENANCE** | Merkle seal evidence | Работает |
| **6: IMMUNE MEMORY** | failure_count + recurring (threshold=3) | Считает, не предсказывает |
| **7: SCOREBOARD** | 9 checks / 100 points → verdict | Статичен |

### 1.3 Scoreboard v2 (текущий)

| Check | Weight | Что проверяет |
|-------|--------|--------------|
| startup_boot | 10 | baseline + verify:fast boot |
| liveness_alive | 15 | verify:fast x2 + ops:life pass |
| liveness_deterministic | 15 | life_summary x2 identical |
| readiness_policy | 20 | verify:doctor:policy |
| readiness_san | 10 | (=policy, дублирует) |
| chaos_mode_lie | 10 | SAN regex catches mode:'CERT' |
| chaos_orphan | 10 | Mutation scanner catches orphan |
| chaos_fp01 | 5 | writeJsonDeterministic throws on forbidden field |
| provenance_sealed | 5 | Merkle root computed |
| **TOTAL** | **100** | |

### 1.4 Immune Memory — текущая структура

```
IMMUNE_MEMORY.json:
  runs: N
  last_failures: [...]        ← какие checks упали в последнем прогоне
  failure_count: { check: N } ← СБРАСЫВАЕТСЯ в 0 при pass (!)
  chaos_history: { probe: PASS/FAIL }
  heal_history: [...last 20]  ← только action names, без деталей
```

### 1.5 Self-Heal — текущие 4 healer'а

| Healer | Что лечит | Scope |
|--------|----------|-------|
| healExecutorDir | Создаёт EXECUTOR/gates/manual/ | INFRASTRUCTURE |
| healGitDir | git init + add + commit | INFRASTRUCTURE |
| healNodeModules | npm ci --ignore-scripts | INFRASTRUCTURE |
| healOrphansInEvidence | Quarantine non-EPOCH dirs | INFRASTRUCTURE |

### 1.6 Chaos Probes — текущие 3

| Probe | Инъекция | Проверка |
|-------|---------|---------|
| CHAOS_MODE_LIE | Файл с mode:'CERT' в RESEARCH зоне | SAN regex ловит |
| CHAOS_ORPHAN | Orphan dir в temp evidence root | Mutation scanner ловит |
| CHAOS_FP01 | JSON с created_at полем | writeJsonDeterministic throws |

### 1.7 Невостребованные ресурсы

| Файл | Что содержит | Статус |
|------|-------------|--------|
| `core/resilience/self_healing.mjs` | CircuitBreaker (CLOSED→OPEN→HALF_OPEN), SelfHealingSystem (retry+breaker+health+autoRepair+degradation) | **НЕ ПОДКЛЮЧЁН к Doctor** |
| `core/testing/chaos_engineer.mjs` | 10 сценариев (network_failure, exchange_down, rate_limit, partial_outage, slow_response, data_corruption, memory_pressure, cpu_throttle, rejection_spike, position_desync) | **6 из 10 = stubs** |
| `scripts/ops/data_health_doctor.mjs` | per-lane SHA verify + EventBus events (DATA_HEALTH_SCAN/RESULT) | **НЕ вызывается из Doctor v2** |

---

## 2. КРИТИЧЕСКИЕ РАЗРЫВЫ

### TIER-1: Философские (определяют вектор)

| # | Gap | Суть |
|---|-----|------|
| **D1** | **Реактивен** | Doctor обнаруживает проблемы ПОСЛЕ их возникновения. Не предсказывает, не предотвращает |
| **D2** | **Нет root cause** | verify:fast FAIL — но КАКОЙ gate? ПОЧЕМУ? Доктор не знает |
| **D3** | **Память без аналитики** | failure_count считает, но не анализирует тренды, корреляции, паттерны |

### TIER-2: Архитектурные

| # | Gap | Суть |
|---|-----|------|
| **D4** | **readiness_san = readiness_policy** | Дублирует check, оба привязаны к одному `results.policy.ok` |
| **D5** | **CircuitBreaker не подключён** | `core/resilience/self_healing.mjs` имеет готовый CircuitBreaker — не используется |
| **D6** | **ChaosEngineer — 6 stubs** | 10 сценариев, 6 возвращают `{ recovered: true }` без реальной проверки |
| **D7** | **data_health_doctor изолирован** | Не вызывается из Doctor v2 — параллельная вселенная |
| **D8** | **failure_count сбрасывается** | При PASS → count = 0. Теряется ИСТОРИЯ. Нет "этот gate падал 5 раз за последний месяц" |

### TIER-3: Coverage gaps

| # | Gap | Описание |
|---|-----|---------|
| **D9** | Нет chaos для DATA | Что если raw.jsonl corrupt? |
| **D10** | Нет chaos для EventBus | Что если events.jsonl overflow? |
| **D11** | Нет chaos для FSM | Что если guard ложно пропустит? |
| **D12** | Нет chaos для Network | ALLOW_NETWORK без net_kill? |
| **D13** | Нет performance probe | verify:fast замедлился 10x — Doctor не заметит |
| **D14** | Нет strategy health probe | CandidateFSM candidates stuck — Doctor не знает |
| **D15** | Scoreboard статичен | Не адаптируется к новым компонентам |

---

## 3. ГЕНИАЛЬНАЯ АРХИТЕКТУРА: DOCTOR v3 — ПРЕДИКТИВНЫЙ ОРАКУЛ

### 3.1 Философия

```
Doctor v2: "Ты болен. Вот диагноз."
Doctor v3: "Ты здоров, но через 3 запуска заболеешь.
            Вот превентивное лечение. Применяю."
```

**Принцип**: Лучший Доктор — тот, у которого нет пациентов.

### 3.2 Архитектура 5 слоёв

```
╔═══════════════════════════════════════════════════════════════════════╗
║                   DOCTOR v3 — 5-LAYER ARCHITECTURE                    ║
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ LAYER 1: SENTINEL — непрерывный мониторинг                      │ ║
║  │                                                                  │ ║
║  │  File Sentinel:  SHA diff EXECUTOR/ vs прошлый запуск           │ ║
║  │  Data Sentinel:  per-lane TTL check (интеграция data_health)    │ ║
║  │  Perf Sentinel:  timing каждого gate (baseline → drift detect)  │ ║
║  │  FSM Sentinel:   текущий state, stuck detection, transition age │ ║
║  │                                                                  │ ║
║  │  Выход: sentinel_report { changes[], risks[], stale_items[] }   │ ║
║  └──────────────────────────────┬──────────────────────────────────┘ ║
║                                 ▼                                     ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ LAYER 2: DIAGNOSTICIAN — глубокий анализ                        │ ║
║  │                                                                  │ ║
║  │  Root Cause Engine:                                              │ ║
║  │    Gate FAIL → parse stdout/stderr → extract reason_code        │ ║
║  │    → map reason_code to taxonomy → identify root cause          │ ║
║  │    → suggest fix → classify safety (SAFE/RISKY/MANUAL)          │ ║
║  │                                                                  │ ║
║  │  Diff Engine:                                                    │ ║
║  │    This run vs last run:                                        │ ║
║  │    - New failures (first time broken)                           │ ║
║  │    - Resolved failures (was broken, now fixed)                  │ ║
║  │    - Persistent failures (broken N runs in a row)               │ ║
║  │    - Flaky gates (alternating pass/fail)                        │ ║
║  │                                                                  │ ║
║  │  Correlation Engine:                                             │ ║
║  │    Co-occurrence matrix over 50 runs:                           │ ║
║  │    "When A fails, B fails 85% of time → single root cause"     │ ║
║  │    3 failures clustered → 1 diagnosis                           │ ║
║  │                                                                  │ ║
║  │  Выход: diagnosis { root_causes[], correlations[], diff }       │ ║
║  └──────────────────────────────┬──────────────────────────────────┘ ║
║                                 ▼                                     ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ LAYER 3: PREDICTOR — предсказание                               │ ║
║  │                                                                  │ ║
║  │  Trend Analyzer (window = 50 runs):                             │ ║
║  │    score_trend:          RISING / STABLE / DECLINING            │ ║
║  │    failure_count_trend:  RISING / STABLE / DECLINING            │ ║
║  │    chaos_coverage_trend: RISING / STABLE / DECLINING            │ ║
║  │                                                                  │ ║
║  │  Confidence Score: P(healthy next run) =                        │ ║
║  │    w1 × consecutive_passes_ratio    (0..1)                      │ ║
║  │    w2 × score_stability             (0..1)                      │ ║
║  │    w3 × chaos_probe_coverage        (0..1)                      │ ║
║  │    w4 × heal_success_rate           (0..1)                      │ ║
║  │    w5 × data_freshness_ratio        (0..1)                      │ ║
║  │    w = [0.3, 0.2, 0.2, 0.15, 0.15]                            │ ║
║  │                                                                  │ ║
║  │  Risk Score per Component:                                      │ ║
║  │    [verify=0.1, data=0.6, strategy=0.3, network=0.0]           │ ║
║  │    → "data is most likely to break next"                        │ ║
║  │                                                                  │ ║
║  │  Early Warnings:                                                │ ║
║  │    SCORE_DECLINING:  score dropped ≥20 pts over 5 runs          │ ║
║  │    NEW_FAILURE:      gate failed for first time ever            │ ║
║  │    PERSISTENT:       gate failed ≥4 of last 5 runs             │ ║
║  │    FLAKY:            gate alternated pass/fail ≥3 times         │ ║
║  │    NEAR_TTL:         data lane at ≥75% of TTL                  │ ║
║  │                                                                  │ ║
║  │  Выход: prediction { confidence, trends, risks[], warnings[] } │ ║
║  └──────────────────────────────┬──────────────────────────────────┘ ║
║                                 ▼                                     ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ LAYER 4: PREVENTIVE FIXER — превентивное исцеление              │ ║
║  │                                                                  │ ║
║  │  Pre-Flight Checks (ПЕРЕД probes):                              │ ║
║  │    PRE_DATA_FRESH:    lanes near TTL → re-enrich               │ ║
║  │    PRE_DISK_SPACE:    evidence > 500MB → archive old epochs    │ ║
║  │    PRE_EPOCH_CLEANUP: > 100 EPOCH dirs → archive to 50         │ ║
║  │    PRE_BASELINE_DRIFT:baseline age > 24h → restore             │ ║
║  │                                                                  │ ║
║  │  Post-Diagnosis Fixes (ПОСЛЕ probes):                           │ ║
║  │    For each diagnosed failure:                                  │ ║
║  │      SAFE   → auto-fix → verify → log                         │ ║
║  │      RISKY  → log recommendation, DON'T apply                  │ ║
║  │      MANUAL → flag for human, emit WARNING event               │ ║
║  │                                                                  │ ║
║  │  Fix-Verify Loop:                                               │ ║
║  │    detect → classify safety → fix → verify → log → memory      │ ║
║  │    Max 3 attempts per reason_code per run                       │ ║
║  │    CircuitBreaker per healer (prevent death spiral)             │ ║
║  │                                                                  │ ║
║  │  Root Cause → Fix Mapping:                                      │ ║
║  │    RDY01 → healStaleEnrichment (SAFE)                          │ ║
║  │    RDY02 → healCorruptLock (RISKY)                              │ ║
║  │    STARTUP_FAIL → healExecutorDir + healNodeModules (SAFE)      │ ║
║  │    RG_DOCTOR01 → ops:baseline:restore (SAFE)                    │ ║
║  │    POLICY_FAIL → null (MANUAL)                                  │ ║
║  │    NON_DETERMINISTIC → baseline:restore + clear epochs (RISKY)  │ ║
║  │                                                                  │ ║
║  │  Выход: fixes_applied[], recommendations[], manual_flags[]     │ ║
║  └──────────────────────────────┬──────────────────────────────────┘ ║
║                                 ▼                                     ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ LAYER 5: CHAOS FORGE — расширенный chaos engineering            │ ║
║  │                                                                  │ ║
║  │  Existing Probes (3):                                           │ ║
║  │    MODE_LIE:     mode:CERT injection → SAN detection           │ ║
║  │    ORPHAN:        orphan dir injection → mutation detection     │ ║
║  │    FP01:          forbidden field → writeJson rejection         │ ║
║  │                                                                  │ ║
║  │  New Probes (7):                                                │ ║
║  │    DATA_CORRUPT:  inject bad SHA in temp lock → verify rejected │ ║
║  │    LANE_VANISH:   hide raw.jsonl → verify NEEDS_DATA exit      │ ║
║  │    GATE_POISON:   temp gate always-FAIL → verify caught         │ ║
║  │    BUS_OVERFLOW:  10000 events → verify bus handles gracefully  │ ║
║  │    FSM_STUCK:     missing registry → verify guard rejects       │ ║
║  │    MEMORY_LEAK:   1000 entries → verify heal_history bounded    │ ║
║  │    NETWORK_LIE:   ALLOW_NETWORK + net_kill → verify kill wins  │ ║
║  │                                                                  │ ║
║  │  Schedule:                                                      │ ║
║  │    Every run:      3 random probes (rotation)                   │ ║
║  │    Every 5th run:  all 10 probes (full suite)                   │ ║
║  │                                                                  │ ║
║  │  All probes: tmpdir only, cleanup in finally{}, zero side-fx   │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### 3.3 Полная фазовая последовательность Doctor v3

```
Phase 0:  SENTINEL SCAN          (NEW)    — diff, freshness, perf, FSM state
Phase 1:  PREVENTIVE FIX PRE     (NEW)    — 4 pre-flight checks, SAFE auto-fix
Phase 2:  SELF-HEAL              (ENHANCED)— 8 healers (4 infra + 4 data) + CircuitBreaker
Phase 3:  STARTUP PROBE          (EXISTING)— baseline:restore + verify:fast
Phase 4:  LIVENESS PROBE         (ENHANCED)— + root cause parsing per gate
Phase 5:  READINESS PROBE        (ENHANCED)— + data_health_doctor + strategy readiness
Phase 6:  CHAOS FORGE            (ENHANCED)— 10 probes (3 old + 7 new) + rotation
Phase 7:  DIAGNOSTICS            (NEW)    — root cause, diff engine, correlations
Phase 8:  PREDICTION             (NEW)    — trends, confidence, risk scores, warnings
Phase 9:  PREVENTIVE FIX POST    (NEW)    — auto-fix SAFE, recommend RISKY, flag MANUAL
Phase 10: PROVENANCE SEAL        (EXISTING)— merkle
Phase 11: SCOREBOARD v3          (ENHANCED)— dynamic weights, component checks, bonus
Phase 12: IMMUNE MEMORY v2       (ENHANCED)— 50-run history, trends, correlations
Phase 13: VERDICT                (ENHANCED)— + PREDICTED_DECLINE status
```

---

## 4. 8 GENIUS FEATURES — ДЕТАЛЬНОЕ ОПИСАНИЕ

### G-DOC-01: Root Cause Engine

**Что**: Каждый gate FAIL парсится. Из stdout/stderr извлекается reason_code. Reason_code маппится на taxonomy → root cause → suggested fix.

**Почему genius**: Doctor v2 говорит "FAIL". Doctor v3 говорит "FAIL потому что SHA mismatch в lock.json для lane liq_bybit, причина: raw.jsonl обновлён но lock не перегенерирован, fix: healCorruptLock, safety: RISKY".

**Маппинг**: Каждый reason_code из taxonomy → (cause_description, fix_function_name, safety_class, verify_command).

---

### G-DOC-02: Failure Trend Predictor

**Что**: immune_memory хранит историю 50 runs (score, failures, chaos). Trend analyzer вычисляет: score rising/stable/declining, failure frequency rising/stable/declining.

**Почему genius**: Можно предсказать проблему ДО её возникновения. Score 100→95→88→82→75 = DECLINING trend = Early Warning: "система деградирует, investigate СЕЙЧАС пока не FAIL".

**Новый вердикт**: PREDICTED_DECLINE — система сейчас HEALTHY но трендом идёт к SICK.

---

### G-DOC-03: Failure Correlation Engine

**Что**: Матрица совместных отказов за 50 runs. Если gate A и gate B падают вместе в >70% случаев — это один root cause.

**Почему genius**: Вместо "3 failures" Doctor говорит "1 root cause manifesting as 3 failures → fix one thing → all resolve". Устраняет шум, фокусирует внимание.

---

### G-DOC-04: Preventive Fix Engine

**Что**: Pre-flight checks ПЕРЕД probes. Post-diagnosis fixes ПОСЛЕ. Safety classification (SAFE/RISKY/MANUAL). CircuitBreaker per healer (max 3 attempts).

**Почему genius**: Если data lane at 90% TTL — re-enrich ПЕРЕД тем как gate увидит stale data и выдаст FAIL. Результат: gate видит свежие данные → PASS. Doctor предотвратил failure которого ещё не было.

---

### G-DOC-05: Chaos Forge (10 probes)

**Что**: 7 новых проб к 3 существующим. DATA_CORRUPT (SHA injection), LANE_VANISH (missing data), GATE_POISON (always-fail gate), BUS_OVERFLOW (10K events), FSM_STUCK (missing registry), MEMORY_LEAK (1K entries), NETWORK_LIE (contradictory flags).

**Rotation**: 3 random per run, full suite every 5th. Все в tmpdir, zero side-effects.

**Почему genius**: Chaos engineering покрывает ВСЕ подсистемы (data, events, FSM, network, memory), а не только SAN regex.

---

### G-DOC-06: Dynamic Scoreboard v3

**Что**: Adaptive weights — недавно сломанные checks получают weight ×1.5 (больше внимания), стабильные >10 runs → weight ×0.8. Component checks (conditional — run only if component exists). Bonus points (confidence, zero warnings).

**Почему genius**: Scoreboard фокусирует внимание на том, что ЛОМАЕТСЯ, а не тратит ресурсы на проверку того, что ГОДАМИ работает. Новые компоненты автоматически получают свой check.

---

### G-DOC-07: CircuitBreaker Integration

**Что**: Подключить готовый CircuitBreaker из `core/resilience/self_healing.mjs` к каждому probe. Если probe падает N раз подряд → circuit OPENS → probe skipped → после timeout → HALF_OPEN → retry.

**Почему genius**: Предотвращает "Doctor death spiral" — когда broken gate заставляет Doctor бесконечно heal→probe→fail→heal. CircuitBreaker разрывает петлю.

---

### G-DOC-08: Confidence Score

**Что**: Количественная оценка P(healthy next run) = weighted sum of 5 factors: consecutive_passes, score_stability, chaos_coverage, heal_success_rate, data_freshness.

**Почему genius**: Вместо бинарного "HEALTHY/SICK" → числовое "confidence = 0.73 = вероятно healthy, но data freshness снижается". Можно принимать решения: confidence < 0.5 → не запускать strategy graduation.

---

## 5. IMMUNE MEMORY v2 — РАСШИРЕННАЯ МОДЕЛЬ

```
IMMUNE_MEMORY_V2.json:
  runs: 42

  history: [                              ← НОВОЕ: последние 50 runs
    { run: 38, score: 85, failures: ["policy"], chaos_pass: true },
    { run: 39, score: 100, failures: [], chaos_pass: true },
    ...
  ]

  failure_count: { check: N }             ← НЕ сбрасывается, АККУМУЛИРУЕТСЯ
  consecutive_passes: { check: N }        ← НОВОЕ: сколько подряд PASS

  trends: {                               ← НОВОЕ: computed каждый run
    score_trend: "DECLINING",
    failure_count_trend: "RISING",
    confidence: 0.73
  }

  correlations: {                          ← НОВОЕ: co-occurrence matrix
    "policy↔chaos_mode_lie": 0.85
  }

  warnings: [                              ← НОВОЕ: early warnings
    { type: "SCORE_DECLINING", detail: "..." },
    { type: "PERSISTENT", gate: "policy", runs: 4 }
  ]

  risk_per_component: {                    ← НОВОЕ: where next failure?
    verify: 0.1,
    data: 0.6,
    strategy: 0.3,
    network: 0.0
  }
```

---

## 6. DOCTOR v3 VERDICT LEVELS

| Verdict | Score | Condition |
|---------|-------|-----------|
| **HEALTHY** | ≥ 90 | No blockers, no warnings |
| **PREDICTED_DECLINE** | ≥ 90 | Healthy but score_trend = DECLINING (NEW) |
| **DEGRADED** | 60-89 | Non-blocker failures |
| **SICK** | < 60 | Blocker failures or liveness FAIL |
| **BLOCKED** | - | Startup FAIL, abort |

**PREDICTED_DECLINE** — ключевая инновация: система СЕЙЧАС здорова, но тренд показывает что через N runs будет DEGRADED. Превентивное действие возможно.

---

## 7. МАТРИЦА ГЕНИАЛЬНЫХ РЕШЕНИЙ

| # | Feature | Проблема которую решает | Уникальность |
|---|---------|------------------------|-------------|
| **G-DOC-01** | Root Cause Engine | "Что именно сломалось и почему?" | reason_code → cause → fix → verify chain |
| **G-DOC-02** | Trend Predictor | "Система деградирует до того как упадёт" | 50-run window, PREDICTED_DECLINE verdict |
| **G-DOC-03** | Correlation Engine | "3 failures = 1 root cause" | Co-occurrence matrix, noise elimination |
| **G-DOC-04** | Preventive Fixer | "Лечи до болезни" | Pre-flight + post-diagnosis, SAFE/RISKY/MANUAL |
| **G-DOC-05** | Chaos Forge (×10) | "3 проб мало" | 7 new probes, rotation schedule, full coverage |
| **G-DOC-06** | Dynamic Scoreboard | "Scoreboard не адаптируется" | Adaptive weights, conditional components, bonus |
| **G-DOC-07** | CircuitBreaker | "Doctor death spiral" | Per-probe CLOSED→OPEN→HALF_OPEN |
| **G-DOC-08** | Confidence Score | "Бинарно vs количественно" | P(healthy) = weighted 5-factor model |

---

## 8. ВЕРДИКТ

Doctor v2 — **solid reactive system**. Doctor v3 с 8 Genius Features превращает его в **предиктивный оракул**:

| Capability | v2 | v3 |
|-----------|----|----|
| Обнаружение проблем | AFTER failure | BEFORE failure |
| Root cause | "FAIL" | "FAIL because X, fix with Y" |
| Prediction | Нет | Trend analysis + confidence |
| Chaos coverage | 3 probes | 10 probes + rotation |
| Self-heal scope | Infra only | Infra + Data + preventive |
| Scoreboard | Static 9 checks | Dynamic, adaptive weights |
| Memory | Counter only | 50-run history + analytics |
| Death spiral protection | Нет | CircuitBreaker per probe |

**Метафора**: Doctor v2 — рентген. Doctor v3 — МРТ + генетический анализ + предиктивная модель + превентивная терапия + вакцинация (chaos probes).

---

*Готов к SDD-проработке Doctor v3 по одобрению.*
