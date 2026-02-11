# Treasure Engine (RU)

**Treasure Engine** — детерминированная исследовательская торговая платформа с дисциплиной Truth Layer.

## Быстрый старт
```bash
npm ci
npm run verify:wall
```

## Ключевые команды
- `npm run verify:specs` — проверка полноты и структуры spec-suite (`specs/`).
- `npm run regen:manifests` — каноническая регенерация манифестов в порядке EVIDENCE -> SOURCE -> EXPORT.
- `npm run export:validated` — детерминированный экспорт `FINAL_VALIDATED.zip` + `.sha256`.
- `npm run verify:clean-clone` — bootstrap clean-clone evidence и прогоняет wall + release-governor x2.
- `npm run verify:release-governor` — release-gate по ledger + machine-readable wall artifacts (`WALL_RESULT.json`, `WALL_MARKERS.txt`) + checksums export.
- `npm run verify:epoch22` — AI Validation Harness drift/invariant gate (offline).
- `npm run verify:epoch23` — AI -> Signals -> Intents contract gate (offline).
- `npm run verify:epoch24` — Walk-forward + reality-gap drift-budget gate (offline).
- `npm run verify:epoch25` — Testnet campaign profiling gate (offline baseline + optional network path).
- `npm run verify:epoch26` — Micro-live governance rehearsal gate (approval/FSM/kill-switch/rollback, offline).

## Offline-first политика
- По умолчанию verification path не требует сети.
- Сетевые тесты включаются только `ENABLE_NETWORK_TESTS=1`.
- Live path по умолчанию отключён.

## Детерминизм
- Default seed: `SEED=12345`.
- Run artifacts: `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- Anti-flake: повторные прогоны критических gates + multi-seed контроль.

## Evidence
Для каждого цикла — `reports/evidence/<EPOCH-ID>/` с логами, DIFF.patch, manifests, summary/verdict.
