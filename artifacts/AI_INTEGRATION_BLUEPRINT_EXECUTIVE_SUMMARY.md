# AI INTEGRATION BLUEPRINT — EXECUTIVE SUMMARY
## Fail-Closed Trading Engine: AI-интеграция мирового класса

**Дата:** 2026-03-04
**Статус:** RESEARCH COMPLETE
**Язык:** Русский

---

## ЧТО ЗА СИСТЕМА

AI-слой для торгового движка, построенный на принципе **fail-closed**: всё запрещено, пока не доказано обратное. Система состоит из 10 «AI-органов», каждый из которых работает в одном из трёх контуров (RESEARCH / CERT / LIVE) с жёсткими контрактами, kill-switch и полной трассируемостью.

**Ключевой принцип:** AI — это исследовательский инструмент и советник, НИКОГДА не прямой исполнитель торговых решений.

---

## ЧТО ДАСТ

| Область | Без AI | С AI-интеграцией |
|---------|--------|------------------|
| Анализ новостей/SEC | Ручной, часы | Автоматический сентимент, минуты |
| Обнаружение аномалий в данных | Post-factum | Реальное время, 25-30% точнее |
| Валидация стратегий (overfit) | Субъективная | Формальный суд с доказательствами |
| Подбор параметров | Grid search (810 итераций) | Bayesian (67 итераций, -92%) |
| Инцидент-менеджмент | Ручной разбор | Copilot сокращает MTTR на 30-70% |
| Proof packs / аудит | Ручные отчёты | Автоматическая генерация с цитатами |

---

## ГЛАВНЫЕ РИСКИ

| # | Риск | Severity | Контроль |
|---|------|----------|----------|
| R1 | Prompt injection → несанкционированные действия | CRITICAL | Layered defense + canary tokens + policy engine |
| R2 | Галлюцинации LLM → ложные торговые сигналы | CRITICAL | Всё = гипотеза, CERT-валидация обязательна |
| R3 | Model drift → деградация без уведомления | HIGH | Canary prompts + regression suite + version pinning |
| R4 | Data poisoning в RAG-корпусе | HIGH | Provenance tracking + RAGDEFENDER |
| R5 | Недетерминизм LLM → невоспроизводимые результаты | MEDIUM | Record/replay + checkpoint + structured outputs |
| R6 | Чрезмерное доверие AI → отключение критического мышления | HIGH | ONE NEXT ACTION + mandatory human gate |

---

## TOP-10 WOW-РЕШЕНИЙ (внедряемых)

1. **Overfit Court** — AI-суд из 3 агентов (прокурор/защитник/судья), формально проверяющий каждую стратегию на переподгонку
2. **Canary Prompt Injection Shield** — 3-уровневая защита от prompt injection с task-consistency канарейками
3. **Bayesian Parameter Oracle** — замена grid search на Bayesian optimization с WFO-валидацией (67 vs 810 итераций)
4. **Record/Replay Truth Machine** — полная запись всех LLM-вызовов для детерминированного воспроизведения через Temporal
5. **Offline RAG с Citation Court** — локальная RAG-система с формальной верификацией каждой цитаты
6. **Anomaly Sentinel** — потоковое обнаружение аномалий в данных с автоматической блокировкой подозрительных фидов
7. **Risk Brain с Kill-Switch Policy** — AI-советник по position sizing с аппаратным kill-switch вне контура AI
8. **Operator Cockpit** — ONE NEXT ACTION интерфейс, сводящий когнитивную нагрузку оператора к минимуму
9. **AI Regression Suite** — AgentAssay + Promptfoo для непрерывного тестирования всех AI-компонентов в CI/CD
10. **Evidence Pack Generator** — автоматическая генерация proof packs с цитатами для каждого торгового решения

---

## ПЛАН НА 30 ДНЕЙ (MINIMAL)

| Неделя | Действие | DoD |
|--------|----------|-----|
| 1 | Record/Replay инфраструктура (запись всех LLM-вызовов) | Все вызовы записываются, replay работает |
| 2 | Offline RAG + локальная модель эмбеддингов | ChromaDB + Ollama работают, поиск по SEC filings |
| 3 | Overfit Court MVP (3 агента, frozen prompts) | Суд выносит вердикт по тестовой стратегии |
| 4 | Canary Shield + regression suite в CI | Promptfoo сканирует все промпты, canary ловит инъекции |

---

## ONE NEXT ACTION

```
Развернуть Record/Replay обёртку вокруг первого LLM-вызова:
1. Обернуть один API-вызов в record-слой (сохранение request/response в SQLite)
2. Написать replay-тест, проверяющий идентичность ответа
3. Запустить дважды — если оба прохода зелёные, инфраструктура работает
```

---

## ПОЛНЫЙ ОТЧЁТ

→ [AI_INTEGRATION_BLUEPRINT_FULL_REPORT.md](./AI_INTEGRATION_BLUEPRINT_FULL_REPORT.md)

---

## ИСТОЧНИКИ (ТОП-10)

1. [Building Effective Agents — Anthropic](https://www.anthropic.com/research/building-effective-agents)
2. [OWASP Top 10 for LLM Applications 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
3. [LangGraph Persistence & Time Travel](https://docs.langchain.com/oss/python/langgraph/persistence)
4. [Practical Security Guidance for Sandboxing — NVIDIA](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/)
5. [TradeTrap: Are LLM Trading Agents Reliable?](https://arxiv.org/html/2512.02261v1)
6. [MarketSenseAI 2.0 — Frontiers in AI](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1608365/full)
7. [OpenAI Agents SDK — Safety](https://platform.openai.com/docs/guides/agent-builder-safety)
8. [AgentAssay: Regression Testing for Agents](https://arxiv.org/abs/2603.02601)
9. [PoisonedRAG — USENIX Security 2025](https://www.usenix.org/system/files/usenixsecurity25-zou-poisonedrag.pdf)
10. [Temporal for Durable Agent Execution](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal)
