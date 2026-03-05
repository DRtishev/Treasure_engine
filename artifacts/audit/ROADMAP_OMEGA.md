# ROADMAP OPTIONS — OMEGA AUDIT

**Дата:** 2026-03-05 | **Режим:** CERT (OFFLINE) | **HEAD:** 5dfb0b6

---

## ВАРИАНТ 1: MINIMAL (2–3 дня)

**Цель:** Закрыть все P1 pain points. Сделать систему safe для первого live pilot.

### Спринт 1 (День 1): Safety Critical Fixes
| Задача | Апгрейд | Файлы | DoD |
|--------|---------|-------|-----|
| Intent Idempotency | A03 | `core/exec/master_executor.mjs` | Тест: duplicate intent → rejected |
| Kill Switch Persistence | A01 | `core/risk/`, `core/live/safety_loop.mjs` | Тест: restart → state preserved |
| Kill Switch Real Metrics | PP-04 fix | `core/exec/master_executor.mjs` | Тест: getKillSwitchMetrics() returns real values |

### Спринт 2 (День 2): Operational Safety
| Задача | Апгрейд | Файлы | DoD |
|--------|---------|-------|-----|
| Double-Key HALT Reset | A02 | `core/governance/mode_fsm.mjs` | Тест: reset без файла → rejected |
| Graceful Shutdown | A12 | `core/exec/master_executor.mjs` | Тест: SIGTERM → flatten + persist |
| Pre-Flight Checklist | A06 | `scripts/ops/preflight_live.mjs` | Скрипт проверяет все P1 conditions |

### Спринт 3 (День 3): Gates + Evidence
| Задача | Файлы | DoD |
|--------|-------|-----|
| 6 regression gates для всех новых фиксов | `scripts/verify/regression_*.mjs` | verify:fast включает новые gates |
| verify:fast x2 → PASS | — | Deterministic |
| verify:deep → PASS | — | No regressions |
| Evidence pack | `reports/evidence/EPOCH-MINIMAL/` | Full evidence |

### Гейты
- verify:fast x2 (EC=0, identical)
- verify:deep (EC=0)
- All new regression gates PASS
- Pre-flight checklist PASS

### Риски
- Scope creep: строго ТОЛЬКО P1 fixes
- Regression: каждый fix с gate

### ONE_NEXT_ACTION
```bash
npm run -s verify:fast
```

---

## ВАРИАНТ 2: BALANCED (1–2 недели)

**Цель:** Все P1 + ключевые P2 + top-5 B-upgrades (profit pipeline). Система готова к paper→micro_live promotion.

### Неделя 1: Safety + Foundation

**День 1-2:** Все из MINIMAL (Спринт 1-3)

**День 3:** Clock Injection + ND Elimination
| Задача | Апгрейд | Файлы |
|--------|---------|-------|
| Clock injection | A04 | mode_fsm.mjs, truth_engine.mjs, master_executor.mjs |
| ND scan gate | A04 | `scripts/verify/regression_nd_no_raw_date_now.mjs` |

**День 4:** Canary + Promotion Hardening
| Задача | Апгрейд | Файлы |
|--------|---------|-------|
| Canary scenarios from config | A09 | canary_runner.mjs |
| Promotion cooldown | A10 | promotion_ladder.mjs |
| Burn-in gate | A10 | promotion_ladder.mjs |

**День 5:** Infra Improvements
| Задача | Апгрейд | Файлы |
|--------|---------|-------|
| Script Index Generator | C04 | scripts/ops/ |
| FSM Transition Log | A08 | mode_fsm.mjs |
| Structured Error Reporting | A07 | master_executor.mjs |

### Неделя 2: Profit Pipeline

**День 6-7:** Cost Model Realism
| Задача | Апгрейд | Файлы |
|--------|---------|-------|
| Tiered Fee Schedule | B01 | fees_model.mjs |
| Dynamic Funding Rate | B02 | funding_model.mjs |
| Orderbook Depth Calibration | B11 | cost_model.mjs |

**День 8-9:** Promotion Pipeline
| Задача | Апгрейд | Файлы |
|--------|---------|-------|
| Multi-Window Promotion | B03 | promotion_ladder.mjs |
| Walk-Forward as Promotion Gate | B04 | promotion_ladder.mjs + walk_forward.mjs |
| Expectancy Court Prerequisite | B12 | promotion_ladder.mjs |

**День 10:** Integration + Evidence
| Задача | Файлы |
|--------|-------|
| Full regression suite x2 | All gates |
| verify:deep expanded | New e2e tests |
| Evidence pack | EPOCH-BALANCED/ |
| Profit Dashboard | scripts/ops/ |

### Гейты
- verify:fast x2 (EC=0, identical) — now with ~10 new gates
- verify:deep (EC=0) — now with promotion e2e
- Pre-flight checklist PASS
- Walk-forward validation PASS on test data

### Риски
- Promotion pipeline complexity → need thorough e2e testing
- Cost model changes could shift backtest results → re-baseline needed

### ONE_NEXT_ACTION
```bash
npm run -s verify:fast
```

---

## ВАРИАНТ 3: RADICAL (1–2 месяца)

**Цель:** Production-grade trading system. Full A+B+C+D branches. Готовность к real money micro_live.

### Фаза 1 (Неделя 1-2): Safety + Foundation
Всё из BALANCED +
- Circuit Breaker (A11)
- Health Heartbeat (A13)
- Evidence Chain Integrity (A14)
- Provider Health Matrix (A15)
- Unified Runtime State Dir (D01)
- Operator Notification Channel (D03)
- Emergency Flatten Script (D15)

### Фаза 2 (Неделя 3-4): Profit Pipeline Complete
- PnL Attribution Pipeline (B05)
- Drawdown-Adjusted Sizing (B06)
- Fill Quality Monitor (B09)
- Paper↔Live Parity Scoring (B10)
- Real-Time PnL Reconciliation (B15)
- Monte Carlo CI (B14)
- Strategy Rotation Policy (B07)
- Regime Detection Integration (B08)

### Фаза 3 (Неделя 5-6): Speed + Verification
- Parallel Gate Execution (C01)
- Gate Result Caching (C02)
- verify:fast:instant tier (C08)
- Gate Dependency Graph (C07)
- Incremental Evidence Packing (C03)
- Lazy Import for Deep Gates (C05)

### Фаза 4 (Неделя 7-8): Infrastructure
- Structured Reason Code Registry (D02)
- Configuration Drift Detector (D04)
- Automated Gate Coverage Report (D05)
- Strategy Parameter Freezing (D07)
- Position State Machine (D13)
- Contract-First API Design (D10)
- Multi-Asset Support Foundation (D12)

### Milestone Gates
- **M1 (Week 2):** verify:fast ~70 gates, all new P1 regression gates, preflight PASS
- **M2 (Week 4):** Profit pipeline e2e, walk-forward validation, promotion pipeline working on test data
- **M3 (Week 6):** verify:fast < 3s parallel, gate coverage > 90% of core modules
- **M4 (Week 8):** Full integration test, paper→micro_live promotion on testnet, emergency flatten tested

### Риски
- Scope: 2 месяца — ambitious. Strict prioritization needed.
- Regression: с каждым upgrade — x2 anti-flake runs.
- Feature interaction: new components may conflict. Integration testing critical.

### ONE_NEXT_ACTION
```bash
npm run -s verify:fast
```

---

## COMPARISON TABLE

| Dimension | MINIMAL | BALANCED | RADICAL |
|-----------|---------|----------|---------|
| Duration | 2-3 days | 1-2 weeks | 1-2 months |
| P1 fixed | All 4 | All 4 | All 4 |
| P2 fixed | 0 | 5 of 6 | All 6 |
| New gates | ~6 | ~16 | ~40 |
| Profit pipeline | No | Basic | Full |
| Live readiness | Paper only | Paper→Micro eligible | Micro→Small eligible |
| Risk | Low | Medium | High |
| ROI | High (safety) | Highest (safety+profit) | Long-term |

**РЕКОМЕНДАЦИЯ:** BALANCED. Наибольший ROI за время. Safety + profit pipeline foundation. MINIMAL — если времени нет. RADICAL — если система должна быть production-grade.
