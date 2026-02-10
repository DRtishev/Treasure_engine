# TREASURE ENGINE — Roadmap (Practical)

Это не «мечты». Это ближайшие шаги, которые реально двигают к прибыльной и безопасной торговле.

## P0 — Конвейер и безотказность (сейчас)
1) **CI‑гейты без сети**: ввести единый `verify:ci` (e2 + phase2 + paper + ключевые epoch‑гейты) и сделать так, чтобы он работал без API ключей.
2) **Evidence по умолчанию**: каждый прогон гейтов пишет логи в `reports/evidence/<epoch>/...`.
3) **Determinism budget**: seed по умолчанию, запрет недетерминизма в симуляции/пейпер‑путях.
4) **Release artefacts**: скрипт сборки `FINAL_VALIDATED.zip` + `EVIDENCE_PACK.tar.gz` + sha256.

## P1 — Paper→Live мост (закрыть дыру)
1) Нормализовать `IExecutionAdapter`: строгие поля intent/result, единый статус‑enum.
2) `PaperAdapter`: повторить ключевые нюансы старой симуляции, чтобы `verify:e2` и `verify:paper` были согласованы.
3) `EventLog`: схема событий + минимальная ротация + redaction.
4) `Engine`/`EnginePaper`: убрать `Math.random` из сигналов в verify‑пути, перейти на seed.

## P2 — Live readiness (но без суицида)
1) LiveAdapter только в режиме `DRY_RUN` по умолчанию. Реальные ордера только при *двух* флагах.
2) Idempotency: ключи запросов, повторное размещение без дублей.
3) Order state machine: OPEN→PARTIAL→FILLED/REJECTED/CANCELED.
4) Таймауты/ретраи, circuit breaker на уровне execution.

## P3 — Прибыль (после того, как машина перестала врать)
1) Стратегии: портфель из 2–3 простых edge (volatility mean‑reversion, breakout, funding/volatility).
2) SIMLAB: walk‑forward, out‑of‑sample, leakage sentinel.
3) Метрики: expectancy, PF, maxDD, sharpe — без «AI‑IQ» как критерия готовности.

