# Treasure Engine (RU)

**Treasure Engine** — детерминированная исследовательская торговая платформа с дисциплиной **Truth Layer**: каждое утверждение о готовности подтверждается артефактами, логами, checksum-манифестами и воспроизводимыми командами.

> Ключевая идея: никаких «кажется работает». Только проверяемый pipeline с evidence-пакетами.

## 1) Назначение проекта

Проект обеспечивает безопасный мост **Simulation → Paper → Controlled Live Readiness** без реальных live-ордеров по умолчанию. Все критические этапы валидируются через offline-first гейты и фиксируются в `reports/evidence/*`.

## 2) Архитектура (высокий уровень)

- `core/sim/*` — генерация/прогон симуляций и метрик.
- `core/exec/*` — исполнение интентов, safety/strategy/governance-обвязки.
- `core/risk/*` — риск-ограничения и kill-switch логика.
- `core/governance/*` — режимы, approval workflow, transition rules.
- `core/monitoring/*`, `core/performance/*` — мониторинг и perf-контракты.
- `core/obs/*` — event log и наблюдаемость.
- `scripts/verify/*` — верификационные гейты (основной путь контроля качества).
- `truth/*` — JSON schema и truth-контракты.
- `reports/runs/*` — run-scoped артефакты запусков (детерминированная структура).
- `reports/evidence/*` — доказательная база по эпохам (логи, summary, manifests).

Подробные документы:
- `docs/PROJECT_DOCUMENTATION_RU.md`
- `docs/VERIFICATION_PLAYBOOK_RU.md`
- `RUNBOOK.md`

## 3) Требования

- Node.js 20+
- npm 11+

## 4) Быстрый старт

```bash
npm ci
npm run verify:e2
npm run verify:paper
npm run verify:phase2
npm run verify:integration
```

## 5) Ключевые оффлайн-гейты

```bash
npm run verify:e2
npm run verify:e2:multi
npm run verify:paper
npm run verify:phase2
npm run verify:integration
npm run verify:core
```

## 6) Эпохи 17–21

```bash
npm run verify:epoch17
npm run verify:epoch18
npm run verify:epoch19
npm run verify:epoch20
npm run verify:epoch21
```

## 7) Anti-flake дисциплина

Минимум для release-цикла:

```bash
npm run verify:e2      # запуск #1
npm run verify:e2      # запуск #2
npm run verify:paper   # запуск #1
npm run verify:paper   # запуск #2
```

## 8) Truth Layer integrity

```bash
sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.SOURCE.txt
sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.EVIDENCE.txt
```

## 9) Политика сети

Сетевые тесты **не входят** в стандартный verification path и включаются только явным флагом:

```bash
ENABLE_NETWORK_TESTS=1 npm run verify:binance
ENABLE_NETWORK_TESTS=1 npm run verify:websocket
```

## 10) Evidence workflow

Обязательный минимум в `reports/evidence/<EPOCH-ID>/`:

- `PREFLIGHT.log`
- `INSTALL.log`
- `gates/*.log`
- `DIFF.patch`
- `SHA256SUMS.SOURCE.txt`
- `SHA256SUMS.EVIDENCE.txt`
- `SUMMARY.md`
- `VERDICT.md`

## 11) Безопасность и ограничения

- Никаких API-ключей в репозитории.
- Никаких live-ордеров по умолчанию.
- Детерминизм: seed-based, run-scoped outputs, без скрытой рандомности в canonical artifacts.

## 12) Troubleshooting

- Если падают schema-гейты — проверяйте конкретный run-dir в `reports/runs/...`.
- Если не сходятся checksum — пересоберите manifests после финальных правок.
- Если npm показывает `http-proxy` warning — проверьте локальную npm-конфигурацию окружения.

