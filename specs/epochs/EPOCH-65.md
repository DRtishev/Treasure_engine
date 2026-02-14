# EPOCH-65 — FOUNDATION SEAL v1.0 (Baseline + Repro + Run-Scope Isolation)

## REALITY SNAPSHOT
- E65 оставался в `BLOCKED` из-за незавершённого `verify:phoenix` x2, при уже внедрённых baseline/repro/run-scope компонентах.
- Требуется только closeout-доказательство без feature-расширений.

## GOALS
- Завершить `verify:phoenix` двумя последовательными PASS-прогонами.
- Подтвердить baseline/release-repro и run-scope изоляцию в evidence.
- Перевести E65 в `DONE/PASS` после выполнения обязательных gates.

## NON-GOALS
- Без новых торговых/продуктовых фич.
- Без изменения risk/live-политик.

## CONSTRAINTS
- Offline-first PASS path.
- Детерминизм и run-scope через `TREASURE_RUN_DIR`.
- Канонический evidence не должен мутироваться вне явного pack/update цикла.

## DESIGN / CONTRACTS
- Canonical baseline хранится в `truth/BASELINE.json` и валидируется `verify:baseline`.
- Repro release проверяется через изолированные build-выводы (`verify:release:repro`).
- Heavy verifiers используют run-scope helper `core/sys/run_dir.mjs`.

## PATCH PLAN
- Завершить preflight + `verify:phoenix` run1/run2 с fresh `TREASURE_RUN_DIR`.
- Обновить ledger/index до `DONE/PASS`.
- Пересобрать pack E65 и проверить `pack:verify`.

## VERIFY
- `npm run verify:phoenix`
- `npm ci`
- `CI=true npm run verify:repo`
- `CI=true npm run verify:specs`
- `CI=true npm run verify:phoenix` (run1)
- `CI=true npm run verify:phoenix` (run2)
- `CI=true npm run verify:ledger` (run1/run2)
- `npm run release:build`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release` (run1/run2)

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-65/gates/verify_phoenix_run1.log`
- `reports/evidence/EPOCH-65/gates/verify_phoenix_run2.log`
- `reports/evidence/EPOCH-65/gates/manual/verify_epoch65_result.json`
- `reports/evidence/EPOCH-65/pack_index.json`

## STOP RULES
- Остановиться при падении критичного gate 2 раза подряд без root cause.
- Не ставить DONE/PASS без machine-readable logs.

## RISK REGISTER
- Риск: незавершённый long-run `verify:phoenix` из-за прерывания процесса.
- Риск: drift в repo manifest после обновления evidence.
- Риск: release hash drift при непоследовательном baseline update.

## ACCEPTANCE CRITERIA
- [ ] `verify:phoenix` run1 PASS.
- [ ] `verify:phoenix` run2 PASS.
- [ ] `verify:ledger` run1/run2 PASS после промоушена E65.
- [ ] `verify:release` run1/run2 PASS после `release:build`.
- [ ] `pack:epoch --id 65` и `pack:verify --id 65` PASS.

## NOTES
- Этот epoch — closeout-only: подтверждение уже внесённых foundation изменений и завершение доказательного контура.
