# EPOCH-64 — FOUNDATION SEAL (PLATINUM POLISH + RU README DOCTRINE)

## REALITY SNAPSHOT
- Корневые документы конфликтовали по SSOT: часть материалов содержала устаревшие инструкции и hype.
- `verify:docs` не покрывал `README.md` и не гарантировал истинность canonical entrypoints.
- В ACTIVE области встречались placeholder-маркеры, что нарушало жёсткую политику чистоты.

## GOALS
- Зафиксировать канонический RU-набор документации и очистить root от устаревшего SSOT.
- Расширить верификацию документации до `README.md` и canonical docs.
- Добавить gate против placeholder-маркеров в ACTIVE.
- Добавить gate `docs truth` против hype и обязательных секций README.
- Обновить индекс/ledger и выпустить E64 evidence pack.

## NON-GOALS
- Keep legacy gate topology unchanged unless required for deterministic compliance.

## CONSTRAINTS
- Offline PASS path is mandatory.
- Deterministic outputs only for required gates.
- Minimal diff over ACTIVE runtime.

## DESIGN / CONTRACTS
- Gate outputs remain machine-readable JSON under `reports/truth/` and evidence folders.
- Ledger/index updates must keep monotonic epoch ordering.

## NON-GOALS
- Без изменения торговых стратегий и рыночной логики.
- Без обязательных online проверок для PASS.

## PATCH PLAN
- Обновить `README.md` в RU-first доктрину (operator-friendly).
- Добавить `docs/START_HERE.md`, `docs/RUNBOOK_RU.md`, `docs/DOCTRINE.md`.
- Переместить устаревшие root-era документы в `archive/cemetery_docs/` с архивным баннером.
- Обновить `verify:docs` для проверки `README.md`.
- Добавить `verify:no_placeholders` и `verify:docs:truth`.
- Встроить новые гейты в `verify:repo`.
- Обновить `specs/epochs/INDEX.md` и `specs/epochs/LEDGER.json`.

## VERIFY
- `npm ci`
- `npm run verify:repo` (run1/run2, with CI=true)
- `npm run verify:specs` (run1/run2, with CI=true)
- `CI=true npm run verify:docs` (run1/run2)
- `CI=true npm run verify:ledger` (run1/run2)
- `CI=true npm run verify:edge` (run1/run2)
- `CI=true npm run verify:treasure` (run1/run2)
- `CI=true npm run verify:phoenix` (run1/run2)
- `npm run release:build`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release` (run1/run2)

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-64/` стандартный пак с логами gate-run.
- `reports/evidence/EPOCH-64/gates/manual/docs_truth_report.json`.
- `reports/evidence/EPOCH-64/gates/manual/no_placeholders_report.json`.
- `reports/evidence/EPOCH-64/gates/manual/verify_epoch64_result.json`.

## STOP RULES
- Stop if any critical gate fails twice without clear root cause.
- Do not set DONE/PASS without x2 evidence.

## RISK REGISTER
- Risk: stale manifest hash drift after doc edits.
- Risk: hidden legacy doc links break canonical path.
- Risk: gate flake masked by single-run verification.

## ACCEPTANCE CRITERIA (FALSIFIABLE)
- [ ] README содержит обязательные RU секции и команды истины/релиза.
- [ ] Root-era устаревшие документы перенесены в `archive/cemetery_docs/` с явным баннером.
- [ ] `verify:docs` покрывает `README.md` и canonical docs.
- [ ] `verify:no_placeholders` падает при placeholder-маркерах в ACTIVE и PASS на чистом дереве.
- [ ] `verify:docs:truth` запрещает hype-фразы и валидирует README секции.
- [ ] `verify:repo` включает `verify:manifest`, `verify:no_placeholders`, `verify:docs:truth`.
- [ ] Все required gates E64 проходят x2 в `CI=true` режиме.


## NOTES
- This epoch is evidence-driven; claims are valid only with logs and machine reports.
