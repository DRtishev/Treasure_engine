# SPRINT_2_FSM_HEALING_SPEC.md — FSM Goal-Seeker + Healing Loop + Operator Calm

**Finding:** Architectural improvement (нет прямого finding — enhancement)
**WOW Ref:** W7.3, W7.8, W5.1, W5.7, W6.4
**Prerequisite:** Нет (параллелен с Sprint 1)

---

## 1. GOAL

Сделать FSM активным "стремителем к цели", а не пассивным автоматом.
Добавить автоматическое восстановление из DEGRADED, confidence score в Doctor,
и приоритизацию ONE_NEXT_ACTION в Cockpit.

**Текущее состояние:**
- `state_manager.mjs:294` — `findPathToGoal()` уже реализован (BFS shortest path)
- `state_manager.mjs:579` — `runToGoal()` уже реализован (goal-seeking loop)
- `doctor_v2.mjs` — уже имеет 8-phase architecture с scoreboard
- `cockpit.mjs:585-588` — ONE_NEXT_ACTION всегда hardcoded `npm run -s verify:fast`

**Что нужно:**
1. Deadlock detection (FSM stuck в одном состоянии N ticks)
2. Healing loop с max retries (prevent infinite cycling)
3. Doctor confidence score (0-100) на основе scoreboard
4. Cockpit dynamic ONE_NEXT_ACTION (не hardcoded)

## 2. NON-GOALS

- НЕ меняем FSM kernel (specs/fsm_kernel.json) — transitions/states fixed
- НЕ добавляем новые FSM states
- НЕ трогаем candidate_fsm (отдельный FSM)
- НЕ трогаем court logic или metrics
- НЕ добавляем interactive TUI

## 3. SCOPE

| Файл | Действие | Описание |
|---|---|---|
| `scripts/ops/state_manager.mjs:579-684` | MODIFY | Добавить deadlock detection + max_retries enforcement |
| `scripts/ops/doctor_v2.mjs:630-700` | MODIFY | Добавить confidence_score (0-100) в scoreboard |
| `scripts/ops/cockpit.mjs:585-588` | MODIFY | Dynamic ONE_NEXT_ACTION из FSM state + doctor verdict |
| `scripts/ops/doctor_history.mjs` | CREATE | JSONL append ledger для doctor runs |
| `scripts/verify/regression_fsm_deadlock01_detection.mjs` | CREATE | Gate: deadlock detection works |
| `scripts/verify/regression_doctor_score01_confidence.mjs` | CREATE | Gate: doctor outputs confidence |
| `scripts/verify/regression_cockpit_dynamic_next01.mjs` | CREATE | Gate: cockpit next_action not hardcoded |

## 4. INVARIANTS

**INV-S2-1:** `state_manager.mjs:runToGoal()` exits с BLOCKED если тот же state повторяется > `max_cycles` (из kernel) раз подряд без forward progress.
- Проверка: unit test в regression gate

**INV-S2-2:** Doctor v2 scoreboard содержит `confidence_score` (integer 0-100).
- Проверка: `grep "confidence_score" reports/evidence/EXECUTOR/DOCTOR_V2_SCOREBOARD.json`

**INV-S2-3:** Cockpit HUD.md первая строка после заголовка — `ONE_NEXT_ACTION: <command>`.
`<command>` зависит от FSM state + doctor verdict (не hardcoded).
- Проверка: `head -5 reports/evidence/EPOCH-COCKPIT-*/HUD.md | grep ONE_NEXT_ACTION`

**INV-S2-4:** Doctor history ledger — append-only JSONL.
- Проверка: файл существует, каждая строка — valid JSON

**INV-S2-5:** verify:fast x2 PASS.

## 5. FAILURE MODES

| Failure | Как обнаружим | Митигация |
|---|---|---|
| Deadlock detection false positive (normal pause = deadlock) | regression test с normal transitions | Threshold = max_goal_attempts из kernel (10) |
| Confidence score drift (different scores on same state) | x2 anti-flake | Score based on deterministic scoreboard only |
| Dynamic next_action wrong command | regression gate checks valid commands | Whitelist valid next_action commands |
| Doctor history JSONL corruption | JSON.parse each line on read | Append-only, never modify existing lines |
| Infinite healing loop | max_cycles from kernel = 3 | Already enforced by runToGoal() L651 |

## 6. IMPLEMENTATION PLAN

### Шаг 1: Deadlock detection в state_manager.mjs

**Файл:** `scripts/ops/state_manager.mjs`

В `runToGoal()` (строка 579+), добавить tracking:
```javascript
// After each transition attempt:
const stuckThreshold = kernel.max_goal_attempts ?? 10;
if (sameStateCount >= stuckThreshold) {
  return {
    status: 'BLOCKED',
    reason_code: 'FSM_DEADLOCK',
    detail: `State ${currentState} repeated ${sameStateCount} times without forward progress`,
    stuck_state: currentState,
    attempts: sameStateCount,
  };
}
```

**Контекст:** `runToGoal()` уже имеет `cycleCount` (L651) и `totalFailures` (L646).
Deadlock = `sameStateCount > threshold` где sameStateCount считает последовательные attempts
в одном state без transition to different state.

### Шаг 2: Doctor confidence score

**Файл:** `scripts/ops/doctor_v2.mjs`

В секции SCOREBOARD (строка 630+), добавить:
```javascript
// Confidence score: weighted average of phase results
const weights = {
  startup: 20,    // Phase 1
  liveness: 30,   // Phase 2
  readiness: 15,  // Phase 3
  chaos: 15,      // Phase 4
  provenance: 10, // Phase 5
  intelligence: 10, // Phase 6
};

let score = 0;
if (startupOk) score += weights.startup;
if (livenessAlive) score += weights.liveness;
if (x2Identical) score += weights.liveness * 0.5; // bonus for determinism
if (readiness.ok) score += weights.readiness;
if (chaosAllPass) score += weights.chaos;
if (provenanceSealed) score += weights.provenance;
// Intelligence: proportional to recovered/trending signals
score += Math.min(weights.intelligence, weights.intelligence * (intelligenceScore / 100));

scoreboard.confidence_score = Math.round(Math.min(100, Math.max(0, score)));
```

### Шаг 3: Dynamic cockpit ONE_NEXT_ACTION

**Файл:** `scripts/ops/cockpit.mjs:585-588`

**BEFORE:**
```javascript
'## NEXT_ACTION',
'',
'npm run -s verify:fast',
```

**AFTER:**
```javascript
'## ONE_NEXT_ACTION',
'',
computeNextAction(fsmState, doctorVerdict, readinessStatus),
```

Где `computeNextAction` — pure function:
```javascript
function computeNextAction(fsm, doctor, readiness) {
  // Priority order: doctor sick → fsm degraded → readiness → default
  if (doctor === 'SICK') return 'npm run -s ops:doctor';
  if (fsm === 'DEGRADED') return 'npm run -s ops:heal-runner';
  if (fsm === 'HEALING') return 'npm run -s ops:doctor';
  if (fsm === 'BOOT') return 'npm run -s verify:fast';
  if (fsm === 'CERTIFYING') return 'npm run -s verify:fast';
  if (fsm === 'CERTIFIED' && readiness === 'NEEDS_DATA') return 'npm run -s ops:node:toolchain:bootstrap';
  if (fsm === 'RESEARCHING') return 'npm run -s ops:candidates';
  if (fsm === 'EDGE_READY') return 'npm run -s ops:cockpit';
  return 'npm run -s verify:fast'; // safe default
}
```

### Шаг 4: Doctor history ledger

**Файл:** `scripts/ops/doctor_history.mjs`

```javascript
export function appendDoctorHistory(scoreboard) {
  const historyPath = path.join(ROOT, 'reports/evidence/EXECUTOR/DOCTOR_HISTORY.jsonl');
  const entry = JSON.stringify({
    ...scoreboard,
    appended_at_tick: scoreboard.run_id || 'UNKNOWN',
  });
  fs.appendFileSync(historyPath, entry + '\n');
}
```

Вызвать из `doctor_v2.mjs` после scoreboard computation.

### Шаг 5: Создать 3 regression gates

**regression_fsm_deadlock01_detection.mjs:**
- Simulate: FSM in same state 15 times → assert BLOCKED/FSM_DEADLOCK
- Evidence: `gates/manual/regression_fsm_deadlock01.json`

**regression_doctor_score01_confidence.mjs:**
- Run ops:doctor → read scoreboard → assert confidence_score exists and 0-100
- Evidence: `gates/manual/regression_doctor_score01.json`

**regression_cockpit_dynamic_next01.mjs:**
- Run ops:cockpit → read HUD.md → assert first content line after header = ONE_NEXT_ACTION
- Assert: value is valid npm command from whitelist
- Evidence: `gates/manual/regression_cockpit_dynamic_next01.json`

## 7. GATES & REGRESSIONS

| Gate ID | Что проверяет | Evidence |
|---|---|---|
| `regression_fsm_deadlock01` | Deadlock detection triggers at threshold | `regression_fsm_deadlock01.json` |
| `regression_doctor_score01` | Doctor outputs confidence_score 0-100 | `regression_doctor_score01.json` |
| `regression_cockpit_dynamic_next01` | Cockpit ONE_NEXT_ACTION dynamic (not hardcoded) | `regression_cockpit_dynamic_next01.json` |

## 8. EVIDENCE ARTIFACTS

| Артефакт | Путь |
|---|---|
| 3 regression gate results | `reports/evidence/EXECUTOR/gates/manual/regression_{name}.json` |
| Doctor history ledger | `reports/evidence/EXECUTOR/DOCTOR_HISTORY.jsonl` |

## 9. TEST PLAN

```bash
# 1. Pre-change baseline
npm run -s verify:fast

# 2. Apply changes

# 3. Post-change verification (x2)
npm run -s verify:fast  # Run 1
npm run -s verify:fast  # Run 2

# 4. Doctor with confidence score
npm run -s ops:doctor
cat reports/evidence/EXECUTOR/DOCTOR_HISTORY.jsonl | tail -1 | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).confidence_score))"

# 5. Cockpit with dynamic next_action
npm run -s ops:cockpit
head -10 reports/evidence/EPOCH-COCKPIT-*/HUD.md

# 6. Regen + final x2
npm run -s regen:manifests
npm run -s verify:fast
npm run -s verify:fast
```

## 10. DEFINITION OF DONE

- [ ] `runToGoal()` returns BLOCKED/FSM_DEADLOCK при threshold stuck
- [ ] Doctor v2 scoreboard содержит `confidence_score` (0-100)
- [ ] Cockpit HUD.md содержит dynamic ONE_NEXT_ACTION (не hardcoded verify:fast)
- [ ] Doctor history JSONL append-only ledger работает
- [ ] 3 regression gates PASS standalone
- [ ] 3 regression gates зарегистрированы в verify:fast
- [ ] `npm run -s verify:fast` x2 PASS
- [ ] git status clean

## 11. ROLLBACK PLAN

Откатить 3 модифицированных файла. Удалить 4 созданных файла.
`npm run -s verify:fast` для baseline confirmation.

## 12. ONE NEXT ACTION

```bash
# Добавить deadlock detection в state_manager.mjs:runToGoal()
```
