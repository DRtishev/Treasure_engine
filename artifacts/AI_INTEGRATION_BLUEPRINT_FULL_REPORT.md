# AI INTEGRATION BLUEPRINT — ПОЛНЫЙ ОТЧЁТ
## Fail-Closed Trading Engine: AI-интеграция мирового класса

**Дата:** 2026-03-04 | **Версия:** 1.0 | **Статус:** RESEARCH COMPLETE

---

# I. THREAT MODEL (RED TEAM)

## 1.1 Prompt Injection

**Вектор:** Прямая инъекция (пользователь переопределяет системный промпт) и косвенная (вредоносные инструкции в обрабатываемых данных — новости, SEC-файлы, изображения).

**Severity:** CRITICAL. OWASP LLM Top 10 2025 — уязвимость #1. 35% инцидентов безопасности AI в 2025 году вызваны простыми промптами, некоторые с ущербом >$100K.

**Атаки 2025-2026:**
- Мультимодальные инъекции (скрытые промпты в изображениях)
- Multi-turn crescendo (постепенная эскалация давления через серию сообщений)
- 82.4% LLM выполняют вредоносные tool calls от «peer agents» (vs 41.2% от прямой инъекции)

**Контроли (fail-closed):**
- Все внешние данные маркируются как UNTRUSTED и отделяются от системных инструкций
- Canary tokens в каждом промпте — утечка = детекция инъекции
- Task-consistency канарейки: before/after проверки вокруг критических действий
- Policy engine (OPA/Cedar) гейтит каждый tool call ДО выполнения
- Structured outputs: AI извлекает только typed-поля (enum, validated JSON), не произвольный текст
- CERT-контур: сеть запрещена, промпты заморожены, инъекция невозможна по конструкции

**Источники:**
- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [Promptfoo OWASP LLM Top 10](https://www.promptfoo.dev/docs/red-team/owasp-llm-top-10/)

---

## 1.2 Data Poisoning

**Вектор:** Отравление RAG-корпуса, fine-tuning данных, или memory агентов.

**Severity:** HIGH. PoisonedRAG достигает 97% успеха атаки при инъекции всего 5 вредоносных текстов на 2.6M чистых (USENIX Security 2025). RAGPoison внедряет отравленные эмбеддинги в конкретные точки семантического пространства.

**Контроли:**
- Provenance tracking для всех документов в RAG-корпусе (SHA-256, источник, дата)
- RAGDEFENDER: защита от database poisoning, retrieval poisoning, и prompt manipulation
- ReliabilityRAG: graph-theoretic consistency checking с учётом доверия к источникам
- Версионирование корпуса: каждое обновление = новая версия с diff
- CERT-контур использует только замороженные «truth packs» — ни одного неверифицированного документа

**Источники:**
- [PoisonedRAG — USENIX Security 2025](https://www.usenix.org/system/files/usenixsecurity25-zou-poisonedrag.pdf)
- [ReliabilityRAG (arXiv)](https://arxiv.org/pdf/2509.23519)
- [RAGDEFENDER (ACSAC 2025)](https://kevinkoo001.github.io/assets/pdf/acsac25-ragdefender.pdf)

---

## 1.3 Exfiltration (утечка данных)

**Вектор:** AI-агент манипулируется для отправки чувствительных данных наружу через tool calls, API-запросы, или кодирование в выходных данных. В декабре 2025 обнаружено 30+ CVE в AI-платформах, включая CamoLeak (CVSS 9.6).

**Контроли:**
- Сетевая изоляция: CERT и LIVE контуры не имеют произвольного egress
- Whitelist исходящих подключений (только биржевые API)
- Application-level контроли НЕДОСТАТОЧНЫ для недетерминированных LLM — необходима сетевая изоляция
- Data privacy vault: токенизация PII до передачи агенту
- Audit trail каждого tool call с immutable storage

**Источники:**
- [5 Ways LLMs Enable Data Exfiltration (BlackFog)](https://www.blackfog.com/5-ways-llms-enable-data-exfiltration/)
- [AI Agent Vulnerabilities Part III (Trend Micro)](https://www.trendmicro.com/vinfo/us/security/news/threat-landscape/unveiling-ai-agent-vulnerabilities-part-iii-data-exfiltration)

---

## 1.4 Tool Misuse (Excessive Agency)

**Вектор:** Агент вызывает инструменты за пределами разрешённого scope. OWASP LLM06.

**Контроли:**
- Policy-as-Code: каждый tool call проходит через policy engine ДО выполнения
- Per-tool permissions: whitelist разрешённых инструментов для каждого агента
- Rate-limit на tool calls (per-minute, per-task)
- Kill-switch вне контура AI (аппаратный или OS-level)

---

## 1.5 Model Drift / Nondeterminism

**Вектор:** Провайдер обновляет веса модели без уведомления. Temperature=0 НЕ гарантирует детерминизм (GPU floating-point drift, batch layout). OpenAI явно заявляет: детерминизм = «best effort».

**Severity:** MEDIUM-HIGH для торгового движка — тот же промпт может дать разные торговые сигналы.

**Контроли:**
- Version pinning: фиксация конкретной версии модели (model ID + system_fingerprint)
- Canary prompts: набор контрольных промптов с известными ответами, проверяемых при каждом запуске
- Record/replay: запись всех LLM-ответов для воспроизведения
- Dual-run gate: каждый критический вызов выполняется дважды, расхождение = BLOCKED
- Structured outputs: constrained decoding гарантирует формат (но не содержание)

**Источники:**
- [SGLang Deterministic Inference (NeurIPS 2025)](https://lmsys.org/blog/2025-09-22-sglang-deterministic/)
- [Why Deterministic LLM Output is Nearly Impossible (Unstract)](https://unstract.com/blog/understanding-why-deterministic-output-from-llms-is-nearly-impossible/)

---

## 1.6 Overfit / Self-Deception

**Вектор:** AI-компонент валидирует стратегию, которая переподогнана под исторические данные. «Silent strategy migration» — модель постепенно меняет поведение без формального ревью.

**Контроли:**
- Overfit Court (раздел IV, O5): формальный суд из 3 агентов
- Walk-Forward Efficiency < 0.4 → автоматический BLOCK
- Параметрическая стабильность: скачок параметра между окнами WFO → красный флаг
- Мета-overfit защита: запрет подбора параметров WFO (размер окна, fitness function)

**Источники:**
- [Interactive Brokers: Future of Backtesting](https://www.interactivebrokers.com/campus/ibkr-quant-news/the-future-of-backtesting-a-deep-dive-into-walk-forward-analysis/)
- [TradeTrap: LLM Trading Agent Stress Test](https://arxiv.org/html/2512.02261v1)

---

# II. AI ARCHITECTURE OPTIONS (ДВА КОНКУРИРУЮЩИХ ДИЗАЙНА)

## Option A: Supervisor-Led Forum

```
┌─────────────────────────────────────┐
│           SUPERVISOR AGENT          │
│  (LangGraph state machine + HITL)   │
├─────────┬──────────┬───────────────┤
│ Research│ Data QA  │ Strategy      │
│ Agent   │ Agent    │ Hypothesis    │
│         │          │ Agent         │
├─────────┼──────────┼───────────────┤
│ Param   │ Overfit  │ Risk Brain    │
│ Tuner   │ Court    │ Agent         │
├─────────┼──────────┼───────────────┤
│ Exec    │ Operator │ Governance    │
│ Safety  │ Copilot  │ Agent         │
├─────────┴──────────┴───────────────┤
│        EVAL / CANARY AGENT          │
└─────────────────────────────────────┘
```

**Механизм:** Центральный Supervisor-агент (на LangGraph) координирует 10 специализированных агентов. Supervisor решает, какого агента вызвать, на основе текущего состояния и задачи. Все решения проходят через typed state machine с checkpoint на каждом шаге.

**Плюсы:**
- Checkpoint + Time Travel: полная воспроизводимость workflow
- Один контрольный центр — легче аудит и kill-switch
- Typed state предотвращает некорректные мутации
- HITL встроен как first-class паттерн

**Минусы:**
- Single point of failure (Supervisor)
- Высокая сложность state machine для 10 агентов
- Supervisor consumption: каждый шаг = LLM-вызов Supervisor'а
- Латентность: последовательная координация

**Determinism:** HIGH (workflow-level через checkpointing)
**Safety:** HIGH (все действия через один gate)
**Complexity:** HIGH
**ROI:** MEDIUM-HIGH (максимальная безопасность, но высокие затраты на разработку)

---

## Option B: Event-Driven Agents

```
┌──────────────────────────────────────┐
│          EVENT BUS / GATES           │
│   (Temporal + Policy Engine)          │
├──────┬──────┬──────┬──────┬─────────┤
│ DATA │SIGNAL│PAPER │MICRO │ SCALE   │
│ GATE │ GATE │ GATE │ GATE │ GATE    │
├──────┴──────┴──────┴──────┴─────────┤
│                                      │
│  [Research]  [DataQA]  [Hypothesis]  │
│  [ParamTune] [OverfitCourt] [Risk]   │
│  [ExecSafe]  [Copilot] [Governance]  │
│  [Eval]                              │
│                                      │
│  Каждый агент подписан на события    │
│  Каждый gate = fail-closed контракт  │
└──────────────────────────────────────┘
```

**Механизм:** Агенты реагируют на события (data_ready, signal_generated, paper_result, etc.). Между этапами стоят gate-контракты (fail-closed). Каждый агент работает независимо. Temporal обеспечивает durable execution и record/replay.

**Плюсы:**
- Нет single point of failure
- Агенты работают параллельно — ниже латентность
- Temporal обеспечивает crash-recovery и replay без LangGraph
- Каждый gate — независимый контракт, легко тестировать
- Масштабируется горизонтально

**Минусы:**
- Сложнее координация между агентами
- Event ordering может быть неочевидным
- Debugging distributed workflow сложнее
- Нет единого state snapshot (каждый агент — свой state)

**Determinism:** HIGH (через Temporal event history)
**Safety:** HIGH (gate-контракты + policy engine)
**Complexity:** MEDIUM-HIGH
**ROI:** HIGH (проще масштабировать, лучше отказоустойчивость)

---

## ВЕРДИКТ: Option B (Event-Driven) с элементами Option A

**Обоснование:**
1. Fail-closed gate-контракты между этапами — естественный паттерн для торгового движка
2. Temporal обеспечивает replay без тяжёлого LangGraph state machine
3. Параллельная работа агентов критична для latency
4. Supervisor-паттерн используется ВНУТРИ сложных органов (например, Overfit Court)
5. Kill-switch проще реализовать на уровне event bus, чем внутри Supervisor

ASSUMPTION: Event bus предполагает наличие message broker (Kafka/RabbitMQ/Redis Streams). Для MVP достаточно Redis Streams.

---

# III. LANES & CONTRACTS

## 3.1 RESEARCH Lane

| Параметр | Значение |
|----------|----------|
| Сеть | РАЗРЕШЕНА (whitelist доменов) |
| Вывод | proposals ONLY (не proofs, не действия) |
| Инструменты | Web search, RAG, API финансовых данных |
| Контракт | Каждый proposal содержит: источники, confidence, assumptions |
| Kill-switch | Rate-limit: max N запросов/час |
| Пример | «Анализ новостей показывает негативный сентимент по AAPL. Confidence: 0.72. Источники: [1,2,3]. ASSUMPTION: модель сентимента не дрейфовала.» |

## 3.2 CERT Lane

| Параметр | Значение |
|----------|----------|
| Сеть | ЗАПРЕЩЕНА. Полная изоляция |
| Вывод | proofs + deterministic artifacts |
| Инструменты | Только замороженные модели, truth packs, локальный RAG |
| Контракт | Вывод воспроизводим: dual-run с идентичным результатом |
| Kill-switch | Автоматический BLOCK при расхождении dual-run |
| Пример | «WFO результат по стратегии X: WFE=0.62, 8/10 окон прибыльны, параметры стабильны. Proof pack: [hash]. Dual-run: PASS.» |

## 3.3 LIVE Lane

| Параметр | Значение |
|----------|----------|
| Сеть | Только whitelist биржевых API |
| Вывод | micro-live ордера ТОЛЬКО через reconcile gate |
| Инструменты | Execution engine, risk monitor, reconcile |
| Контракт | Max позиция, max drawdown, kill-switch latency < 100ms |
| Kill-switch | Аппаратный (вне контура AI). AI НЕ МОЖЕТ отключить |
| Автономия | МИНИМАЛЬНАЯ. Human gate для каждого нового решения |

## 3.4 Контракт между lanes

```
RESEARCH --[proposal]--> CERT --[proof]--> LIVE
                                              │
         BLOCKED <─────────────── если proof не пройден
```

**Правило:** Ни одно решение из RESEARCH не попадает в LIVE без прохождения CERT.
**ASSUMPTION:** Это создаёт задержку. Для time-sensitive сигналов нужен fast-path с ужесточёнными контрактами.

---

# IV. AI ORGANS — 10 ОРГАНОВ × WOW-РЕШЕНИЯ

---

## O1: Research / Intel Agent

### WOW #1: Adversarial Source Triangulation

**Title:** Триангуляция источников с адверсарным скептиком

**Mechanism:** Три sub-агента: Collector (собирает данные), Validator (проверяет источники), Skeptic (ищет контрпримеры). Каждый факт должен подтвердиться минимум 2 из 3 независимых источников. Skeptic активно ищет опровержения.

**Why it matters:** Устраняет confirmation bias — основную причину ложных торговых сигналов из новостей. MarketSenseAI 2.0 показал 125.9% cumulative returns с RAG + multi-agent верификацией vs 73.5% для индекса.

**Failure modes:** Все 3 источника могут быть отравлены одной кампанией дезинформации. Skeptic может быть подвержен prompt injection через обрабатываемые тексты.

**Controls:** Источники из whitelist-доменов. Skeptic работает в sandboxed environment. Все выводы маркированы confidence score.

**Offline proof plan:** Запуск на исторических новостях с известными исходами. Сравнение accuracy триангуляции vs single-source.

**Minimal MVP:** 3 промпта (collector/validator/skeptic) + 1 orchestrator. Тест на 10 исторических событиях.

**Gates:** Accuracy > 70% на held-out наборе. False positive rate < 15%.

**Cost: 4 | Impact: 7 | Risk: 3**

---

### WOW #2: Domain-Knowledge Chain-of-Thought (DK-CoT)

**Title:** Финансовый CoT с доменным знанием

**Mechanism:** Промпт содержит встроенные финансовые аксиомы (P/E интерпретация, макро-связи, сезонность). LLM рассуждает через эти аксиомы, а не «с нуля». Исследование показало значительное улучшение accuracy и снижение стоимости.

**Why it matters:** Устраняет типичные ошибки LLM в финансовом контексте (неверная интерпретация P/E, путаница bull/bear).

**Failure modes:** Аксиомы могут устареть при смене рыночного режима. Перегруженный промпт → деградация.

**Controls:** Аксиомы версионируются и ревьюятся квартально. A/B тест: DK-CoT vs vanilla на holdout.

**Offline proof plan:** Сравнение на Financial PhraseBank с метриками: accuracy, F1, portfolio return.

**Minimal MVP:** 1 промпт с 10 финансовыми аксиомами. Тест на 100 новостях.

**Gates:** F1 improvement > 5pp vs vanilla. Cost per query < 2x vanilla.

**Cost: 2 | Impact: 6 | Risk: 2**

---

## O2: Data QA & Anomaly Detection

### WOW #3: Streaming Anomaly Sentinel

**Title:** Потоковый детектор аномалий с автоматической блокировкой

**Mechanism:** Статистические методы (Z-score, IQR, Isolation Forest) + LLM-классификатор аномалий. При обнаружении аномалии: (1) блокировка фида, (2) оповещение оператора, (3) запись evidence. AI увеличивает точность fraud detection на 25-30% vs rule-based.

**Why it matters:** Кривые данные = кривые сигналы = убытки. Nasdaq ML-платформа выполняет risk metrics до 100x быстрее.

**Failure modes:** False positive → блокировка валидных данных в volatile рынке. Adversarial data crafted to evade detection.

**Controls:** Порог аномалии настраиваемый per-feed. Dual-detector (statistical + LLM) — блокировка только при согласии обоих. Override mechanism для оператора.

**Offline proof plan:** Запуск на исторических данных с injected аномалиями (known ground truth). Precision/Recall.

**Minimal MVP:** Z-score detector на OHLCV + LLM-классификатор на аномальные свечи.

**Gates:** Precision > 80%, Recall > 70% на синтетических аномалиях.

**Cost: 3 | Impact: 8 | Risk: 3**

---

### WOW #4: Data Lineage Tracker

**Title:** Полная генеалогия каждой точки данных

**Mechanism:** Каждый datapoint получает metadata: источник, timestamp, hash, трансформации. AI-агент проверяет lineage при любом расхождении. Совместим с AI BOM (CycloneDX 1.6).

**Why it matters:** Без lineage невозможно отличить ошибку данных от реального события.

**Failure modes:** Overhead на metadata storage. Hash collision (теоретический).

**Controls:** SHA-256 для integrity. Immutable append-only log.

**Offline proof plan:** Inject ошибку в pipeline, проверить что lineage tracker её находит.

**Minimal MVP:** Wrapper вокруг data ingestion, добавляющий metadata dict к каждому batch.

**Gates:** 100% traceability: любой datapoint → его источник за < 10 секунд.

**Cost: 3 | Impact: 6 | Risk: 1**

---

## O3: Strategy Hypothesis Generator

### WOW #5: Hypothesis-Driven Signal Factory

**Title:** AI генерирует торговые гипотезы (НЕ торговые решения)

**Mechanism:** LLM анализирует: (1) рыночные условия, (2) research intel, (3) исторические паттерны. Выход: формальная гипотеза в структурированном формате {условие, ожидание, falsification_criteria, required_data}. Каждая гипотеза обязана содержать критерии фальсификации.

**Why it matters:** Преобразует неструктурированные «идеи» в тестируемые гипотезы. Alpha-GPT показал перспективность подхода.

**Failure modes:** LLM генерирует нефальсифицируемые гипотезы. Overfitting к историческим паттернам. Hallucinated correlations.

**Controls:** Structured output schema (Pydantic): гипотеза без falsification_criteria → REJECTED. Duplicates detector. Human review gate.

**Offline proof plan:** Генерация 100 гипотез на исторических данных, валидация через WFO.

**Minimal MVP:** 1 промпт + Pydantic schema + тест на 5 рыночных условиях.

**Gates:** > 50% гипотез проходят формальную валидацию. 0% без falsification criteria.

**Cost: 3 | Impact: 7 | Risk: 4**

---

## O4: Parameter Tuning Advisor

### WOW #6: Bayesian Parameter Oracle с WFO-guard

**Title:** Замена grid search на Bayesian optimization с защитой от мета-переподгонки

**Mechanism:** Optuna/Ax для Bayesian optimization параметров стратегии. Каждый набор параметров ОБЯЗАН пройти Walk-Forward Optimization. BayGA (Scientific Reports 2025) превзошёл индексы на 10-16% annualized. 67 итераций vs 810 для grid search.

**Why it matters:** Grid search нерабочий при >3 параметрах. Bayesian находит оптимум при экспоненциально меньших затратах.

**Failure modes:** Мета-overfit: подбор параметров самого оптимизатора (acquisition function, prior) до «хорошего» результата. Bayesian не всегда улучшает AUC.

**Controls:** WFO параметры ЗАМОРОЖЕНЫ (размер окна, fitness). WFE threshold < 0.4 → BLOCK. Параметрическая стабильность: max допустимый drift между окнами.

**Offline proof plan:** Сравнение grid vs Bayesian на 5 стратегиях, метрика: WFE + compute time.

**Minimal MVP:** Optuna wrapper вокруг одной стратегии + WFO validation.

**Gates:** Compute reduction > 50% vs grid. WFE не ухудшается.

**Cost: 4 | Impact: 8 | Risk: 3**

**Источники:**
- [BayGA — Nature/Scientific Reports](https://www.nature.com/articles/s41598-025-29383-7)
- [WFO + XGBoost (QuantInsti)](https://blog.quantinsti.com/walk-forward-optimization-python-xgboost-stock-prediction/)

---

## O5: Overfit Court / Robustness Judge

### WOW #7: AI-суд из трёх агентов

**Title:** Формальный суд по каждой стратегии: прокурор, защитник, судья

**Mechanism:**
- **Прокурор:** Ищет признаки overfit (unstable params, curve-fitting, low WFE, narrow profit windows, survivorship bias)
- **Защитник:** Аргументирует робастность (stable params, high WFE, multiple regimes, economic rationale)
- **Судья:** Выносит вердикт на основе формальных критериев + arguments. Output: {verdict: PASS|FAIL|REVIEW, evidence: [...], score: 0-100}

**Why it matters:** Устраняет cognitive bias трейдера («моя стратегия точно работает»). Формализует то, что обычно делается интуитивно.

**Failure modes:** Все три агента используют один LLM → correlated failure. Судья может быть biased промптом. Нефальсифицируемые аргументы защитника.

**Controls:** Каждый агент использует frozen prompt (CERT lane). Вердикт FAIL при любом сомнении (fail-closed). Dual-run: суд запускается дважды, расхождение → REVIEW. Human override с обоснованием.

**Offline proof plan:** 20 стратегий (10 overfit, 10 robust), blind test. Accuracy > 80%.

**Minimal MVP:** 3 промпта + orchestrator + structured output. Тест на 5 стратегиях.

**Gates:** Accuracy > 80% на blind test. False negative rate < 10% (пропуск overfit).

**Cost: 4 | Impact: 9 | Risk: 3**

---

## O6: Risk Brain

### WOW #8: Dynamic Position Sizer с Policy-Driven Kill-Switch

**Title:** AI-советник по position sizing + аппаратный kill-switch

**Mechanism:**
- AI анализирует: текущую волатильность, корреляции, drawdown history, exposure limits
- Выход: **рекомендация** по position size (НЕ ордер)
- Kill-switch: аппаратный, вне контура AI, с latency < 100ms
- Policy engine: max position, max drawdown, max daily loss — hard-coded, AI НЕ МОЖЕТ изменить

**Why it matters:** RL-based position sizing адаптируется к рыночному режиму. Но AI никогда не контролирует kill-switch.

**Failure modes:** AI рекомендует oversized position в volatile рынок. Kill-switch ложное срабатывание.

**Controls:** Risk limits = hard-coded policy (OPA/Cedar), AI = advisory only. Operator confirms sizing для позиций > threshold. Kill-switch тестируется ежедневно (dry-run).

**Offline proof plan:** Backtest position sizing через COVID + нормальный рынок. Max drawdown сравнение.

**Minimal MVP:** Правило Kelly + volatility-adjusted sizing. AI = объяснение «почему этот размер».

**Gates:** Max drawdown < threshold. Kill-switch latency < 100ms в тесте.

**Cost: 5 | Impact: 9 | Risk: 4**

---

## O7: Execution Safety

### WOW #9: Reconcile-First Execution с Anomaly Circuit Breaker

**Title:** Каждый ордер проходит reconcile ДО подтверждения + circuit breaker на аномальное поведение

**Mechanism:**
- Pre-trade reconcile: проверка что ордер соответствует сигналу, position limits, и risk policy
- Post-trade reconcile: сверка fill с ожиданием (slippage monitoring)
- Circuit breaker: если pattern detector видит аномальное поведение (loop, rapid-fire orders, deviation от плана) → halt + оповещение
- Safe RL для execution: Constrained RL достигает лучшего исполнения с НУЛЕВЫМИ нарушениями vs TWAP/VWAP

**Why it matters:** Knight Capital потерял $440M за 45 минут из-за отсутствия reconcile. Flash Crash 2010: $1T market value.

**Failure modes:** Reconcile добавляет latency. False positive circuit breaker в volatile рынке.

**Controls:** Reconcile latency budget: max 50ms. Circuit breaker thresholds калиброваны на исторических данных. Manual override с audit trail.

**Offline proof plan:** Replay исторических торговых сессий через reconcile + circuit breaker. Ложные срабатывания < 1%.

**Minimal MVP:** Pre-trade check (position limit + signal match) + slippage monitor.

**Gates:** Zero policy violations. Latency < 50ms. False positive < 1%.

**Cost: 5 | Impact: 9 | Risk: 3**

**Источники:**
- [Safe Constrained RL (arXiv)](https://arxiv.org/html/2510.04952v1)
- [DRL Execution Optimization (arXiv)](https://arxiv.org/pdf/2601.04896)

---

## O8: Operator Copilot

### WOW #10: ONE NEXT ACTION Cockpit

**Title:** Интерфейс оператора, сводящий когнитивную нагрузку к одному действию

**Mechanism:**
- Cockpit показывает ровно ONE NEXT ACTION: самое важное действие прямо сейчас
- AI агрегирует: alerts, pending reviews, system status, gate results
- Приоритизация: CRITICAL → HIGH → MEDIUM
- Explainability: каждое действие сопровождается «почему это важно» + evidence
- Cognitive Load Theory: working memory ограничена, >4 параллельных задач → деградация

**Why it matters:** Incident response: AI copilots сокращают MTTR на 30-70% (SolarWinds 2025). Оператор не тонет в алертах.

**Failure modes:** AI неверно приоритизирует (скрывает критический алерт). Operator develops «alert fatigue» и игнорирует AI.

**Controls:** CRITICAL alerts всегда показываются (bypass AI prioritization). Audit trail: что показано, что скрыто, когда. Weekly review of hidden alerts.

**Offline proof plan:** Симуляция 50 инцидентов разной severity. Время реакции оператора с Copilot vs без.

**Minimal MVP:** Dashboard: статус всех gates + top-1 action + evidence. CLI: `npm run cockpit`.

**Gates:** Operator response time improvement > 20%. Zero missed CRITICAL alerts.

**Cost: 3 | Impact: 8 | Risk: 2**

**Источники:**
- [Cognitive Load Framework (Springer 2026)](https://link.springer.com/article/10.1007/s10462-026-11510-z)
- [Microsoft Security Copilot](https://www.microsoft.com/en-us/security/business/ai-machine-learning/microsoft-security-copilot)

---

## O9: Governance & Evidence

### WOW #11: Automated Proof Pack Generator

**Title:** Автоматическая генерация evidence packs с верифицированными цитатами

**Mechanism:**
- Для каждого торгового решения автоматически собирается proof pack: входные данные, AI-анализ, gate results, WFO metrics, overfit court verdict
- Citation discipline: каждый факт → источник с page/line reference (VeriFact-CoT)
- Immutable storage: proof packs подписываются (SHA-256) и хранятся append-only
- EU AI Act compliance: полная трассируемость кто/что/когда

**Why it matters:** EU AI Act (полное соблюдение к августу 2026): штраф до 30M EUR или 6% annual turnover. Proof packs = юридическая защита.

**Failure modes:** LLM цитирует несуществующие источники (hallucinated citations). Storage overflow.

**Controls:** VeriCite: формальная валидация каждой цитаты против source document. Citation-aware RAG с spatial metadata. Storage retention policy.

**Offline proof plan:** Генерация 10 proof packs, ручная проверка: все цитаты валидны, структура полная.

**Minimal MVP:** Template proof pack + auto-population из gate results + citation check.

**Gates:** 100% citations verified. Proof pack structure complete. Dual-signature (AI + human).

**Cost: 4 | Impact: 7 | Risk: 2**

**Источники:**
- [EU AI Act Compliance (Systima)](https://systima.ai/blog/eu-ai-act-engineering-compliance-guide)
- [VeriFact-CoT (arXiv)](https://arxiv.org/pdf/2509.05741)
- [VeriCite (SIGIR-AP 2025)](https://arxiv.org/html/2510.11394v1)

---

## O10: Continuous Evaluation

### WOW #12: AI Regression Suite в CI/CD

**Title:** Непрерывное тестирование всех AI-компонентов: canary prompts + AgentAssay + Promptfoo

**Mechanism:**
- **Canary prompts:** Набор контрольных промптов с известными ответами. Запускаются при каждом деплое. Drift → BLOCK.
- **AgentAssay:** Stochastic regression testing: 78-100% снижение стоимости, трёхзначные вердикты (Pass/Fail/Inconclusive). 86% behavioral detection power.
- **Promptfoo:** 50+ vulnerability scans, OWASP LLM Top 10 presets, CI/CD integration.
- **Red-team rotation:** Garak (NVIDIA) для automated vulnerability scanning, PyRIT (Microsoft) для adaptive multi-turn attacks.

**Why it matters:** UK AISI challenge: каждая из 22 тестированных frontier моделей была взломана (1.8M атак). Без continuous evaluation — вопрос времени.

**Failure modes:** Test suite не покрывает новые атаки. Regression tests flaky из-за LLM nondeterminism.

**Controls:** AgentAssay: stochastic semantics с порогом. Multi-run testing (минимум 3 прогона). Red-team schedule: weekly automated + monthly manual.

**Offline proof plan:** Запуск full suite offline. 100% canary prompts pass. 0% false negatives на known attacks.

**Minimal MVP:** 10 canary prompts + Promptfoo config + CI hook.

**Gates:** Canary pass rate = 100%. Promptfoo scan: 0 CRITICAL findings. AgentAssay: 0 regressions.

**Cost: 4 | Impact: 8 | Risk: 2**

**Источники:**
- [AgentAssay (arXiv, Mar 2026)](https://arxiv.org/abs/2603.02601)
- [Promptfoo Red Team](https://www.promptfoo.dev/docs/red-team/)
- [Garak (NVIDIA)](https://github.com/NVIDIA/garak)
- [PyRIT (Microsoft)](https://github.com/Azure/PyRIT)

---

# V. ROADMAP (30 / 60 / 90 ДНЕЙ)

## MINIMAL Plan (30 дней) — «Фундамент без риска»

| Неделя | Задача | DoD | Риски |
|--------|--------|-----|-------|
| 1 | Record/Replay инфраструктура | SQLite store для LLM request/response. Replay test проходит. Dual-run gate работает | Overhead на запись. Mitigation: async write |
| 2 | Offline RAG + локальные эмбеддинги | ChromaDB + EmbeddingGemma (308M params). Поиск по 100 документам работает | Качество эмбеддингов ниже cloud. Mitigation: тест quality на benchmark |
| 3 | Overfit Court MVP | 3 frozen промпта + orchestrator. Тест на 5 стратегиях: accuracy > 80% | LLM hallucinations в вердикте. Mitigation: structured output |
| 4 | Canary Shield + Promptfoo в CI | 10 canary prompts. Promptfoo scan. CI hook | Flaky tests. Mitigation: multi-run (3x) |

**Критерий продвижения:** Все 4 недели GREEN. Dual-run расхождений < 5%.

## BALANCED Plan (60 дней) — «Полный CERT-контур»

| Неделя | Задача | DoD |
|--------|--------|-----|
| 5-6 | Bayesian Parameter Oracle + WFO | Optuna wrapper. WFO validation. Compute savings > 50% |
| 7-8 | Data QA Sentinel + Lineage | Streaming anomaly detector. Precision > 80%. Lineage tracking |
| 9-10 | Risk Brain Advisory | Position sizing рекомендации. Kill-switch dry-run daily |
| 11-12 | Operator Cockpit v1 | ONE NEXT ACTION dashboard. Gate status. Evidence links |

**Критерий продвижения:** CERT-контур end-to-end: hypothesis → overfit court → paper result. Все gates pass.

## RADICAL Plan (90 дней) — «Micro-Live с AI-support»

| Неделя | Задача | DoD |
|--------|--------|-----|
| 13-14 | Execution Safety + Reconcile | Pre/post-trade reconcile. Circuit breaker. Latency < 50ms |
| 15-16 | Proof Pack Generator | Auto-generated proof packs. Citations verified. EU AI Act structure |
| 17-18 | Full Red-Team Cycle | Garak + PyRIT + manual. All CRITICAL fixed. Report published |
| 19-20 | Micro-Live Pilot | $100-$1000. AI = advisory only. Human gate. Full telemetry |

**Критерий продвижения:** 50+ paper trades → micro-live. Zero policy violations. Proof packs complete.

---

# VI. TOOLING & IMPLEMENTATION NOTES

## 6.1 Фреймворки

| Потребность | Рекомендация | Альтернатива | Обоснование |
|-------------|-------------|--------------|-------------|
| Agent orchestration | LangGraph (для сложных органов) | Anthropic composable patterns (для простых) | Checkpoint + HITL vs простота |
| Durable execution | Temporal | — | Record/replay, crash recovery. OpenAI Codex использует |
| Policy engine | Cedar (AWS) | OPA | 42-60x быстрее Rego, formal verification |
| Structured outputs | Instructor (API) + Outlines (local) | Guidance (Microsoft) | Instructor для cloud, Outlines для self-hosted |
| Vector DB (offline) | ChromaDB | LanceDB (для edge/embedded) | Chroma: Rust-core, 4x faster в 2025 |
| Embeddings (offline) | EmbeddingGemma (308M) | nomic-embed-text (Ollama) | On-device, 100+ languages, <200MB |
| Local LLM | Ollama | llama.cpp | Простота деплоя |
| Red-teaming | Promptfoo (CI) + Garak (scanning) | PyRIT (adaptive attacks) | Complementary toolset |
| Regression testing | AgentAssay | Custom (Docker Cagent pattern) | Stochastic semantics, 86% detection |
| Prompt management | Langfuse | Braintrust | A/B testing, versioning, analytics |
| Tracing | OpenAI Agents SDK tracing | LangSmith | Built-in, provider-agnostic |
| Sandboxing | Firecracker microVMs | E2B (hosted), gVisor | Hardware isolation, <125ms boot |
| Message broker | Redis Streams (MVP) | Kafka (scale) | Minimal для начала |

## 6.2 Deterministic Agent Runs

**Рецепт (composite approach, отраслевой консенсус 2025-2026):**

1. **Freeze prompts:** Content-addressed versioning (SHA-256 hash). Любое изменение = новая версия
2. **Pin model version:** Конкретный model ID. `system_fingerprint` мониторинг
3. **Structured outputs:** Pydantic schema через Instructor (API) или Outlines (local). Формат гарантирован
4. **Temperature=0:** Снижает variance, но НЕ гарантирует детерминизм
5. **Record everything:** Каждый LLM request/response → SQLite с timestamp, model_id, all params
6. **Replay for debugging:** Temporal event history или custom replay engine
7. **Dual-run gate:** Критические вызовы выполняются 2x. Расхождение = BLOCKED
8. **Accept bounded nondeterminism:** Содержание может варьироваться; структура и критические решения — нет

**ASSUMPTION:** Полный bit-perfect детерминизм невозможен без SGLang deterministic mode (значительная потеря производительности). Для торгового движка достаточно «behavioral determinism» (одинаковое решение при одинаковых входах с допуском на формулировку).

## 6.3 Truth Packs (Offline Citation Bundles)

**Структура truth pack:**

```
truth_pack_v{VERSION}/
├── manifest.json          # SHA-256 hashes всех файлов, дата, автор
├── documents/             # Замороженные документы (SEC filings, research)
│   ├── {hash}.pdf
│   └── {hash}.txt
├── embeddings/            # Pre-computed embeddings (ChromaDB snapshot)
│   └── chroma_snapshot/
├── ground_truth/          # Labeled Q&A pairs для валидации RAG
│   └── qa_pairs.jsonl
├── model_weights/         # Frozen model weights (если self-hosted)
│   └── model_config.json
└── prompts/               # Frozen prompts с version hashes
    └── {organ}_{version}.txt
```

**Контракт:**
- Truth pack = immutable. Изменения = новая версия
- CERT lane использует ТОЛЬКО truth packs
- Каждый truth pack подписан (SHA-256 manifest)
- Валидация: RAG accuracy на ground_truth > threshold

---

# VII. FINAL VERDICT

## МОЖНО ДЕЛАТЬ ПРЯМО СЕЙЧАС (БЕЗ РИСКА)

1. **Record/Replay:** Обернуть LLM-вызовы в record-слой. Ноль влияния на существующую логику
2. **Canary prompts:** Добавить 10 контрольных промптов в CI. Ноль влияния
3. **Promptfoo scan:** Настроить сканирование промптов на уязвимости. Ноль влияния
4. **Offline RAG:** ChromaDB + локальные эмбеддинги для research. Изолировано
5. **Overfit Court:** 3 промпта для оценки стратегий. Только advisory, ноль влияния на торговлю
6. **Data lineage:** Metadata wrapper вокруг data ingestion. Минимальный overhead
7. **Kill-switch dry-run:** Ежедневный тест kill-switch без реального срабатывания

## КАТЕГОРИЧЕСКИ НЕЛЬЗЯ (ДО ЗАВЕРШЕНИЯ FAIL-CLOSED КОНТУРОВ)

1. **AI принимает торговые решения** — пока не пройден полный CERT-контур (Court + WFO + reconcile)
2. **LLM-вывод как ground truth** — каждый вывод = гипотеза до CERT-верификации
3. **Сетевой доступ в CERT/LIVE контурах** — изоляция = фундамент
4. **Деплой без canary проверки** — drift обнаруживается только canary промптами
5. **AI контролирует kill-switch** — kill-switch ВСЕГДА вне контура AI
6. **Fine-tuning без provenance** — data poisoning = 97% success rate (PoisonedRAG)
7. **Single-run validation** — минимум dual-run для любого критического решения

---

# SOURCES APPENDIX

## Multi-Agent Orchestration
1. [LangGraph Official](https://www.langchain.com/langgraph) — production-grade graph-based orchestration
2. [LangGraph Supervisor (GitHub)](https://github.com/langchain-ai/langgraph-supervisor-py) — supervisor pattern library
3. [AutoGen (GitHub)](https://github.com/microsoft/autogen) — Microsoft, переходит в maintenance
4. [MS Agent Framework Migration](https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/) — стратегический преемник AutoGen
5. [CrewAI](https://crewai.com/) — role-based agent teams
6. [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) — production successor to Swarm
7. [Building Effective Agents — Anthropic](https://www.anthropic.com/research/building-effective-agents) — composable patterns

## Determinism & Replay
8. [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) — checkpoint + time travel
9. [Temporal for AI Agents](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal) — durable execution, replay
10. [SGLang Deterministic Inference](https://lmsys.org/blog/2025-09-22-sglang-deterministic/) — NeurIPS 2025, true determinism at perf cost
11. [AgentRR (arXiv)](https://arxiv.org/abs/2505.17716) — record/replay framework
12. [Instructor](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms) — structured outputs for APIs
13. [Outlines (vLLM)](https://docs.vllm.ai/en/v0.8.2/features/structured_outputs.html) — constrained decoding
14. [Langfuse Prompt Management](https://langfuse.com/docs/prompt-management/data-model) — versioning + A/B

## Safety & Security
15. [OWASP LLM Top 10 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/) — #1 vulnerability ranking
16. [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
17. [NVIDIA Sandboxing Guidance](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/)
18. [Firecracker microVMs](https://firecracker-microvm.github.io/) — AWS, hardware-level isolation
19. [E2B Sandboxed Runtime](https://e2b.dev/) — Firecracker-based cloud sandbox
20. [OPA (Open Policy Agent)](https://www.openpolicyagent.org/) — CNCF graduated policy engine
21. [OpenSSF Model Signing](https://openssf.org/blog/2025/06/25/an-introduction-to-the-openssf-model-signing-oms-specification/) — model supply chain

## Trading & Quant
22. [MarketSenseAI 2.0 — Frontiers in AI](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1608365/full) — 125.9% returns с RAG
23. [TradeTrap (arXiv)](https://arxiv.org/html/2512.02261v1) — LLM trading agent stress test
24. [BayGA — Scientific Reports](https://www.nature.com/articles/s41598-025-29383-7) — Bayesian optimization для trading
25. [WFO + XGBoost (QuantInsti)](https://blog.quantinsti.com/walk-forward-optimization-python-xgboost-stock-prediction/)
26. [QuantAgent (arXiv)](https://arxiv.org/html/2509.09995v3) — LLMs unsuited for HFT
27. [PHANTOM NeurIPS 2025](https://openreview.net/forum?id=5YQAo0S3Hm) — financial hallucination benchmark
28. [Constrained RL Execution (arXiv)](https://arxiv.org/html/2510.04952v1) — zero compliance violations
29. [DRL Execution Optimization (arXiv)](https://arxiv.org/pdf/2601.04896) — RL > TWAP/VWAP

## Evaluation & HITL
30. [AgentAssay (arXiv)](https://arxiv.org/abs/2603.02601) — stochastic regression testing
31. [Promptfoo Red Team](https://www.promptfoo.dev/docs/red-team/) — CI/CD red-teaming
32. [Garak (NVIDIA)](https://github.com/NVIDIA/garak) — vulnerability scanner
33. [PyRIT (Microsoft)](https://github.com/Azure/PyRIT) — adaptive red-teaming
34. [Anthropic Eval Guide](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
35. [EU AI Act Compliance (Systima)](https://systima.ai/blog/eu-ai-act-engineering-compliance-guide)

## RAG & Citations
36. [PoisonedRAG — USENIX Security 2025](https://www.usenix.org/system/files/usenixsecurity25-zou-poisonedrag.pdf)
37. [RAGDEFENDER (ACSAC 2025)](https://kevinkoo001.github.io/assets/pdf/acsac25-ragdefender.pdf)
38. [ReliabilityRAG (arXiv)](https://arxiv.org/pdf/2509.23519)
39. [VeriFact-CoT (arXiv)](https://arxiv.org/pdf/2509.05741)
40. [VeriCite (SIGIR-AP 2025)](https://arxiv.org/html/2510.11394v1)
41. [RAG for Finance — CFA Institute](https://rpc.cfainstitute.org/research/the-automation-ahead-content-series/retrieval-augmented-generation)

## Cognitive Load & UX
42. [Cognitive Load Framework (Springer 2026)](https://link.springer.com/article/10.1007/s10462-026-11510-z)
43. [Microsoft Security Copilot](https://www.microsoft.com/en-us/security/business/ai-machine-learning/microsoft-security-copilot)
44. [Agentic Design Patterns — UI/UX](https://agentic-design.ai/patterns/ui-ux-patterns)

---

*Конец отчёта. ONE NEXT ACTION: развернуть Record/Replay обёртку вокруг первого LLM-вызова.*
