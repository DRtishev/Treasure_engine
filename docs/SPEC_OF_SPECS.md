# TREASURE ENGINE — SPEC OF SPECS (Truth Layer)

Это шаблон, по которому пишутся **все** epoch‑спеки. Он сделан так, чтобы Cloud‑агент мог работать автономно, но без иллюзий.

## 0) Header
- EPOCH-ID: `EPOCH-XX`
- Title: 6–10 слов
- Status: DRAFT / IN PROGRESS / DONE
- Date + timezone
- Baseline: ветка/коммит/архив

## 1) Reality Snapshot
- Что уже есть (факты)
- Что болит (симптомы)
- Что нельзя сломать (инварианты)

## 2) Goal
- 2–5 измеримых целей

## 3) Non-goals
- Чётко перечислить, что *не* делаем, даже если «хочется»

## 4) Constraints
- Network isolation
- Determinism expectations
- Backward compat (какие verify обязаны PASS)
- Performance budget (если есть)

## 5) Design
- Архитектура на уровне интерфейсов
- Схемы событий/логов
- Error handling / retries
- Границы ответственности модулей

## 6) Patch Plan (Minimal Diff)
- New files
- Modified files
- Migration notes
- Rollback plan

## 7) Verification Runbook
Обязательно:
- команды
- ожидаемые артефакты
- где лежат логи

Рекомендуемый шаблон:
```bash
export CI=true
node -v && npm -v
npm ci
npm run verify:e2
npm run verify:phase2
npm run verify:paper
# + любые epoch verify
```

## 8) Evidence Pack
Обязательные файлы:
- `PREFLIGHT.md`
- `GATE_PLAN.md`
- `LOGS/*`
- `DIFF.patch`
- `SHA256SUMS.txt`
- `SUMMARY.md`

## 9) Stop Rules
- PASS: какие гейты должны пройти
- FAIL: при каких условиях откатываемся

## 10) Risks
- Top‑3 рисков + mitigation

---

**Золотое правило:** если что-то не подтверждено логом/кодом — это не факт, а гипотеза.
