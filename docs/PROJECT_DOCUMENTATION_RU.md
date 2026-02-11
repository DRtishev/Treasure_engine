# Treasure Engine — Профессиональная документация (RU)

## 1. Обзор
Treasure Engine построен как reproducible engineering system: каждое изменение должно быть проверено через детерминированные гейты и подтверждено evidence-артефактами.

## 2. Цели
1. Безопасный путь от simulation к paper/live readiness.
2. Проверяемость и воспроизводимость результатов.
3. Исключение ложноположительных "PASS" без доказательной базы.

## 3. Ключевые принципы
- **Truth Layer**: source-of-truth в `truth/*.schema.json` и evidence-манифестах.
- **Offline-first**: основной путь верификации не зависит от сети.
- **Determinism**: фиксированные seed/run contexts и run-scoped outputs.
- **Safety First**: risk/safety/governance before execution.

## 4. Подсистемы
### 4.1 Simulation
- Генерация баров, прогон сценариев, расчёт penalized метрик.

### 4.2 Execution
- Валидация intent, адаптеры исполнения, lifecycle ордеров, safety wrappers.

### 4.3 Risk
- Ограничения позиции/убытка/drawdown, kill-switch.

### 4.4 Governance
- FSM-переходы режимов, approval artifacts, transition rules.

### 4.5 Monitoring/Performance
- Канонический мониторинговый отчёт и perf-метрики.
- Детерминированная сериализация для schema-проверок.

### 4.6 Observability
- Event log (SYS/EXEC/RISK) и интеграционные отчёты.

## 5. Верификационные уровни
1. Базовые оффлайн-гейты (`verify:e2`, `verify:paper`, `verify:phase2`, `verify:integration`).
2. Эпохальные гейты (`verify:epoch17` ... `verify:epoch21`).
3. Release governor (`verify:release-governor`).

## 6. Артефакты доказательности
Для каждого цикла должны быть:
- Полные логи запусков.
- Manifest checksum (source/evidence/export).
- Summary + verdict с причинами и рисками.

## 7. Release дисциплина
Release считается безопасным только при:
- Anti-flake rerun выполнен.
- Integrity манифесты валидны.
- FINAL_VALIDATED.zip и sha256 совпадают.
- Verdict содержит явный SAFE/BLOCKED + rationale.

## 8. Операционные риски
- Дрейф манифестов после поздних правок.
- Непредсказуемые изменения окружения (npm warnings/proxy env).
- Смешение debug/persistent artifacts.

## 9. Рекомендации по развитию
- Поддерживать run-scoped outputs как единственный канонический формат для динамических результатов.
- Автоматизировать пересборку source/evidence manifests на финальном шаге pipeline.
- Регулярно пересматривать release checklist по мере расширения набора эпохальных гейтов.
