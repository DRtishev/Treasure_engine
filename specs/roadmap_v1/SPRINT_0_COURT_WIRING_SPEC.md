# SPRINT_0_COURT_WIRING_SPEC.md — Подключение Edge Lab Courts к операционному pipeline

**Finding:** FINDING-B (P1, ПОДТВЕРЖДЕНО)
**WOW Ref:** W3.1, W9.1
**Pre-sprint SHA:** `34cdf27` (branch: claude/audit-harden-treasure-engine-68ZkR)

---

## 1. GOAL

Сделать невозможным переход кандидата из DRAFT → BACKTESTED без прохождения Edge Lab courts.
Текущее состояние: 7 courts реализованы (`core/edge_lab/courts/`), pipeline orchestrator существует
(`core/edge_lab/pipeline.mjs`), но `scripts/edge/strategy_sweep.mjs` вызывает `runBacktest()` напрямую
и продвигает кандидата через `CT01_DRAFT_TO_BACKTESTED` без вызова courts.

**Цена бездействия:** Система claims "fail-closed, evidence-driven" но operates "permit-by-default".
Кандидат проходит весь lifecycle без единой court validation.

## 2. NON-GOALS

- НЕ модифицируем сами courts (overfit_court, risk_court, etc.)
- НЕ меняем FSM kernel (specs/candidate_fsm_kernel.json)
- НЕ добавляем новые courts
- НЕ трогаем e108 determinism contract
- НЕ модифицируем core/backtest/engine.mjs

## 3. SCOPE

| Файл | Действие | Описание |
|---|---|---|
| `scripts/edge/strategy_sweep.mjs` | MODIFY | Import и вызов `runEdgeLabPipeline()` (Вариант A — minimal diff) |
| `scripts/ops/candidate_fsm.mjs:37-60` | MODIFY | guard_backtest_pass: REQUIRE court_verdicts (не optional) |
| `core/edge_lab/pipeline.mjs` | READ-ONLY | Проверить court orchestration (runEdgeLabPipeline) |
| `core/edge_lab/pipeline.mjs` | READ-ONLY | Проверить court orchestration |
| `scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs` | CREATE | Regression gate #1 |
| `scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs` | CREATE | Regression gate #2 |
| `scripts/verify/verify_fast.mjs` | MODIFY | Добавить 2 новых regression gates |
| `package.json` | MODIFY | Добавить 2 npm scripts |

## 4. INVARIANTS

После завершения Sprint 0, следующие инварианты ОБЯЗАНЫ быть истинными:

**INV-S0-1:** `strategy_sweep.mjs` IMPORTS `runEdgeLabPipeline` из `core/edge_lab/pipeline.mjs` (Вариант A).
- Проверка: `grep -c "runEdgeLabPipeline" scripts/edge/strategy_sweep.mjs` >= 1
- РЕАЛИЗОВАНО: Вариант A (minimal diff) — sweep вызывает court pipeline напрямую

**INV-S0-2:** `strategy_sweep.mjs` НЕ вызывает `runBacktest()` напрямую для финального candidate pipeline.
- Проверка: strategy_sweep.mjs может использовать runBacktest для determinism x2 check,
  но court validation MUST go through `runEdgeLabPipeline()`.

**INV-S0-3:** `guard_backtest_pass()` возвращает `{pass: false}` если `court_verdicts` пуст или отсутствует.
- Проверка: вызвать guard с `{metrics: {backtest_sharpe: 1.0}, court_verdicts: []}` → `{pass: false}`

**INV-S0-4:** verify:fast x2 PASS с новыми regression gates.

**INV-S0-5:** e108_backtest_determinism_x2 PASS (нет регрессии в backtest engine).

## 5. FAILURE MODES

| Failure | Как обнаружим | Митигация |
|---|---|---|
| runCandidatePipeline() requires network для courts | Import error при CERT boot | Проверить все courts offline-compatible ПЕРЕД изменением sweep |
| runCandidatePipeline() меняет формат metrics | regression_backtest01_organ_health FAIL | Adapter layer в sweep для нормализации |
| guard_backtest_pass reject валидных кандидатов (false negative) | sweep → 0 BACKTESTED | Проверить что runCandidatePipeline() populates court_verdicts корректно |
| Existing BACKTESTED кандидаты без court_verdicts → STUCK | FSM transition FAIL | Migration: existing candidates marked GRANDFATHERED |
| Performance regression (courts добавляют время) | AUDIT_AFTER_SPRINT_0 performance check | Courts lightweight; budget 500ms per candidate |

## 6. IMPLEMENTATION PLAN

### Шаг 1: Верификация candidate_pipeline.mjs (read-only)

```bash
node -e "import('./core/edge/candidate_pipeline.mjs').then(m => console.log(Object.keys(m)))"
```

Проверить:
- Функция `runCandidatePipeline()` существует и экспортируется
- Принимает параметры совместимые с тем, что strategy_sweep может предоставить
- Вызывает `core/edge_lab/pipeline.mjs` для court orchestration
- Возвращает объект с `court_verdicts` массивом

### Шаг 2: Модификация strategy_sweep.mjs

**Файл:** `scripts/edge/strategy_sweep.mjs`

**КРИТИЧЕСКОЕ УТОЧНЕНИЕ:** `candidate_pipeline.mjs:119` hardcodes `fsm_state: 'BACKTESTED'`
минуя CandidateFSM. Есть 2 варианта интеграции:

**Вариант A (рекомендуемый — minimal diff):** НЕ вызывать runCandidatePipeline целиком,
а только court pipeline (`runEdgeLabPipeline` из `core/edge_lab/pipeline.mjs`), чтобы
strategy_sweep сохранил контроль над CandidateFSM transition (CT01).

**Вариант B (radical):** Полностью заменить sweep logic на runCandidatePipeline,
но тогда нужно рефакторить candidate_pipeline.mjs чтобы использовал CandidateFSM.

**Реализуем Вариант A:**

**Изменение 1** (строка 16): Добавить import:
```javascript
import { runEdgeLabPipeline } from '../../core/edge_lab/pipeline.mjs';
import { backtestToEdge } from '../../core/edge/backtest_to_edge.mjs';
```

**Изменение 2** (строки 54-103): После determinism x2 check (runBacktest x2), ПЕРЕД CT01 transition:
```javascript
// Run Edge Lab courts on backtest result
const edge = backtestToEdge(r1, bars, { strategy_name: name, config_id: configId });
const courtResult = runEdgeLabPipeline(edge, {}, { fail_fast: true, double_run: true, edge_id: configId });

// Attach court verdicts to candidate data BEFORE CT01 transition
candidateData.court_verdicts = courtResult.courts
  ? [{ verdict: courtResult.verdict, courts: courtResult.courts, evidence_manifest: courtResult.evidence_manifest }]
  : [];
candidateData.pipeline_evidence = courtResult.evidence_manifest ?? [];
```

**Важно:** НЕ удалять runBacktest x2 — он нужен для determinism check.
Courts ДОПОЛНЯЮТ backtest x2, а не заменяют.
CandidateFSM CT01 transition остаётся под контролем sweep (строка 103).

### Шаг 3: Модификация guard_backtest_pass

**Файл:** `scripts/ops/candidate_fsm.mjs`
**Строки:** 37-60

**Текущий код (строка 45):**
```javascript
const verdicts = _candidate.court_verdicts ?? [];
const edgeLabVerdict = verdicts.find(v => v.courts && v.courts.length > 0);
if (edgeLabVerdict) {  // <-- ПРОБЛЕМА: checks only IF present
```

**Замена (fail-closed):**
```javascript
const verdicts = _candidate.court_verdicts ?? [];
if (verdicts.length === 0) {
  return { pass: false, detail: 'FAIL_CLOSED: court_verdicts required but empty' };
}
const edgeLabVerdict = verdicts.find(v => v.courts && v.courts.length > 0);
if (!edgeLabVerdict) {
  return { pass: false, detail: 'FAIL_CLOSED: no edge_lab verdict in court_verdicts' };
}
const blocked = ['BLOCKED', 'NOT_ELIGIBLE'];
if (blocked.includes(edgeLabVerdict.verdict)) {
  return { pass: false, detail: `edge_lab_verdict=${edgeLabVerdict.verdict}` };
}
```

### Шаг 4: Создать regression gate #1

**Файл:** `scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs`

**Логика:**
1. Прочитать `scripts/edge/strategy_sweep.mjs`
2. Assert: содержит `import.*runCandidatePipeline.*from.*candidate_pipeline`
3. Assert: содержит вызов `runCandidatePipeline(`
4. Write evidence: `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring01.json`
5. EC=0 если оба assert PASS, EC=1 если FAIL

### Шаг 5: Создать regression gate #2

**Файл:** `scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs`

**Логика:**
1. Import `guard_backtest_pass` (или инлайн-копия логики)
2. Вызвать с candidate: `{metrics: {backtest_sharpe: 1.5}, court_verdicts: []}`
3. Assert: result.pass === false
4. Вызвать с candidate: `{metrics: {backtest_sharpe: 1.5}}` (без court_verdicts)
5. Assert: result.pass === false
6. Write evidence: `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring02.json`
7. EC=0 если все assert PASS

### Шаг 6: Регистрация gates в verify:fast

**Файл:** `scripts/verify/verify_fast.mjs`
Добавить в секцию regression gates (после существующих):
```javascript
{ name: 'regression_court_wiring01_sweep_uses_pipeline', script: 'scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs' },
{ name: 'regression_court_wiring02_guard_rejects_empty', script: 'scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs' },
```

**Файл:** `package.json`
Добавить:
```json
"verify:regression:court-wiring01-sweep-uses-pipeline": "node scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs",
"verify:regression:court-wiring02-guard-rejects-empty": "node scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs"
```

## 7. GATES & REGRESSIONS

### Новые gates

| Gate ID | Script | Что проверяет | Evidence |
|---|---|---|---|
| `regression_court_wiring01` | `regression_court_wiring01_sweep_uses_pipeline.mjs` | strategy_sweep imports + calls runCandidatePipeline | `gates/manual/regression_court_wiring01.json` |
| `regression_court_wiring02` | `regression_court_wiring02_guard_rejects_empty.mjs` | guard_backtest_pass rejects empty court_verdicts | `gates/manual/regression_court_wiring02.json` |

### Существующие gates (must remain PASS)

| Gate | Почему важен |
|---|---|
| `verify:fast` (38 gates) | Нет регрессии |
| `e108_backtest_determinism_x2` | Backtest engine не сломан |
| `regression_backtest01_organ_health` | Backtest organ здоров |
| `regression_fsm01_no_skip_states` | FSM transitions не нарушены |

## 8. EVIDENCE ARTIFACTS

| Артефакт | Путь |
|---|---|
| Regression gate #1 result | `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring01.json` |
| Regression gate #2 result | `reports/evidence/EXECUTOR/gates/manual/regression_court_wiring02.json` |
| Regression gate #1 MD | `reports/evidence/EXECUTOR/REGRESSION_COURT_WIRING01.md` |
| Regression gate #2 MD | `reports/evidence/EXECUTOR/REGRESSION_COURT_WIRING02.md` |

## 9. TEST PLAN

```bash
# 1. Pre-change baseline
npm run -s verify:fast                                    # → PASS (baseline)
node scripts/verify/e108_backtest_determinism_x2_contract.mjs  # → PASS

# 2. Apply changes (steps 2-6)

# 3. Post-change verification (x2 anti-flake)
npm run -s verify:fast                                    # Run 1 → PASS expected
npm run -s verify:fast                                    # Run 2 → PASS expected (identical)

# 4. Determinism confirmation
node scripts/verify/e108_backtest_determinism_x2_contract.mjs  # Run 1
node scripts/verify/e108_backtest_determinism_x2_contract.mjs  # Run 2

# 5. New gates standalone
node scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs
node scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs

# 6. Regen manifests
npm run -s regen:manifests

# 7. Final verify:fast x2
npm run -s verify:fast
npm run -s verify:fast
```

## 10. DEFINITION OF DONE

- [ ] `strategy_sweep.mjs` imports `runCandidatePipeline` из `core/edge/candidate_pipeline.mjs`
- [ ] `strategy_sweep.mjs` вызывает `runCandidatePipeline()` и прикрепляет `court_verdicts` к candidate
- [ ] `guard_backtest_pass()` возвращает `{pass: false}` при пустых `court_verdicts`
- [ ] `guard_backtest_pass()` возвращает `{pass: false}` при отсутствующих `court_verdicts`
- [ ] `regression_court_wiring01` PASS standalone
- [ ] `regression_court_wiring02` PASS standalone
- [ ] Оба gate зарегистрированы в `verify:fast` chain
- [ ] `npm run -s verify:fast` x2 PASS (оба run EC=0, идентичные results)
- [ ] `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` x2 PASS
- [ ] `npm run -s regen:manifests` EC=0
- [ ] git status clean (all changes committed)
- [ ] Evidence artifacts exist at specified paths

## 11. ROLLBACK PLAN

```bash
# Откат к pre-sprint SHA
git stash                           # сохранить текущие изменения
git checkout 34cdf27                # вернуться к pre-sprint commit
npm run -s verify:fast              # подтвердить baseline health
# Если нужно вернуть работу:
git stash pop                       # восстановить изменения
```

Файлы для отката (только эти 4 файла были изменены):
1. `scripts/edge/strategy_sweep.mjs` — откатить к версии без runCandidatePipeline
2. `scripts/ops/candidate_fsm.mjs` — откатить guard_backtest_pass к optional verdicts
3. `scripts/verify/verify_fast.mjs` — удалить 2 gate entries
4. `package.json` — удалить 2 script entries

Файлы для удаления (были созданы):
1. `scripts/verify/regression_court_wiring01_sweep_uses_pipeline.mjs`
2. `scripts/verify/regression_court_wiring02_guard_rejects_empty.mjs`

## 12. ONE NEXT ACTION

```bash
# Проверить совместимость runCandidatePipeline с strategy_sweep
node -e "import('./core/edge/candidate_pipeline.mjs').then(m => console.log('exports:', Object.keys(m)))"
```
