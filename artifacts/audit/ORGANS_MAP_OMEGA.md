# КАРТА ОРГАНОВ — OMEGA AUDIT

**Дата:** 2026-03-05 | **Режим:** CERT (OFFLINE) | **HEAD:** 5dfb0b6

---

## 1. POLICY / MODE KERNEL

**Статус: GREEN**

| Компонент | Файл | Назначение |
|-----------|------|------------|
| AGENTS.md | `AGENTS.md` | SSOT для всех AI-рулей |
| CLAUDE.md | `CLAUDE.md` | Точка входа + quick-ref |
| VERIFY_MODE.md | `VERIFY_MODE.md` | Режимы верификации |
| Mode FSM | `core/governance/mode_fsm.mjs` | OFF→PAPER→LIVE_SMALL→LIVE, HALT=terminal |
| Rules Engine | `core/governance/rules_engine.mjs` | Движок правил |
| Governance Engine | `core/governance/governance_engine.mjs` | Интеграция governance |

**Evidence:** verify:fast gates fsm01_no_skip, fsm02_consciousness → PASS
**Risks:** GovernanceFSM.transition() использует `Date.now()` напрямую (line 78) — не через DeterministicClock. В рамках governance это допустимо (real-time timestamps), но отмечаем как YELLOW-minor.
**What breaks first:** Если кто-то добавит новый mode без обновления TRANSITIONS dict → silent reject.
**Hardening:** Добавить exhaustive-mode test, все пары from→to покрыты.

---

## 2. EVIDENCE / CANON / FINGERPRINTS

**Статус: GREEN**

| Компонент | Файл | Назначение |
|-----------|------|------------|
| Evidence write mode | `core/evidence/evidence_write_mode.mjs` | Режим записи evidence |
| Canonicalize | `core/truth/canonicalize.mjs` | Каноническая сериализация |
| SHA256 fingerprints | `SHA256SUMS.DATA`, `.foundation-seal/` | Целостность артефактов |
| Evidence packs | `reports/evidence/EPOCH-*/**` | Цикловая evidence |

**Evidence:** verify:fast gates pr01_evidence_bloat_guard, ec01_reason_context → PASS; RG_ND_BYTE02 manifest stable x2 → PASS
**Risks:** Evidence pack'и живут в `reports/evidence/` — при массовом чтении могут стать тяжёлыми.
**What breaks first:** Если SHA256SUMS.DATA рассинхронится с реальными файлами → silent drift.
**Hardening:** Автоматический checksum verification в verify:fast (уже есть частично).

---

## 3. VERIFY CHAIN (fast/deep/victory)

**Статус: GREEN**

| Уровень | Скрипт | Гейтов | Время |
|---------|--------|--------|-------|
| fast | `scripts/ops/verify_fast.sh` or npm script | 58 | <5s |
| deep | `scripts/verify/e2e/*.mjs` | 18 | <10s |
| victory:seal | `scripts/executor/executor_epoch_victory_seal*.mjs` | 1 | <3s |
| Epochs | `verify:e66` — `verify:e137` | 70+ | variable |

**Evidence:** verify:fast x2 (EC=0, deterministic), verify:deep (EC=0), victory:seal (EC=0)
**Risks:** 500+ npm scripts в package.json — поиск нужного скрипта затруднён. Многие epoch scripts одноразовые.
**What breaks first:** Если verify:fast станет медленным (>30s) → developer friction → bypass.
**Hardening:** Speed budget contract уже есть (e105_speed_budget_contract).

---

## 4. DOCTOR / COCKPIT / OPERATOR UX

**Статус: GREEN**

| Компонент | Скрипт |
|-----------|--------|
| Doctor | `npm run doctor` → `scripts/verify/e142m_doctor.mjs` |
| Cockpit | `npm run -s ops:cockpit` |
| TimeMachine | `npm run -s ops:timemachine` |
| Autopilot | `npm run -s ops:autopilot` |
| Triage | `npm run -s epoch:victory:triage` |

**Evidence:** verify:fast gate doctor_score01_confidence, cockpit_dynamic_next01 → PASS
**Risks:** Cockpit и Doctor — отдельные entry points, operator должен знать какой запускать.
**What breaks first:** Если ONE_NEXT_ACTION в cockpit рассогласуется с doctor → confusion.
**Hardening:** Единая entry point `npm run status` → doctor + cockpit + triage.

---

## 5. NERVOUS SYSTEM / FSM

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Mode FSM | `core/governance/mode_fsm.mjs` |
| FSM deadlock detection | gate fsm_deadlock01 |
| State transitions | TRANSITIONS dict: OFF↔PAPER↔LIVE_SMALL↔LIVE, DIAGNOSTIC |

**Evidence:** fsm01_no_skip, fsm02_consciousness, fsm_deadlock01 → PASS
**Risks:** HALT — terminal, но manual reset через `requestManualReset()` не требует ничего кроме вызова метода. Нет double-key для reset.
**What breaks first:** Deadlock при одновременном HALT + manual reset request.
**Hardening:** Добавить double-key unlock для выхода из HALT (аналогично APPLY_AUTOPILOT).

---

## 6. EXECUTION / MASTER EXECUTOR

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Master Executor | `core/exec/master_executor.mjs` |
| Mode-aware Executor | `core/exec/mode_aware_executor.mjs` |
| Safety Integrated | `core/exec/safety_integrated_executor.mjs` |
| Signal Converter | `core/exec/signal_converter.mjs` |
| Strategy-aware | `core/exec/strategy_aware_executor.mjs` |
| Adapters | `core/exec/adapters/` (paper, live, dryrun, mock, binance, bybit) |

**Evidence:** pr05_executor_ssot_stable, pr07_runid_immutable, pr08_stable_only → PASS
**Risks:**
- `_checkIntentIdempotency` — PLACEHOLDER (line 367-371): "assume no duplicates". В prod это рискованно.
- `_persistOrder` fallback `Date.now()` на line 394 если нет ctx.bar?.t_ms.
- `getKillSwitchMetrics()` возвращает hardcoded 0 для max_drawdown, exchange_error_rate, consecutive_losses (lines 447-451) — "caller must provide".
**What breaks first:** Дублирование ордеров в prod из-за placeholder idempotency check.
**Hardening:** Реализовать idempotency check через RepoState; eliminate Date.now() fallbacks.

---

## 7. RISK BRAIN (kill switch, sizer)

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Kill Switch | `core/risk/kill_switch.mjs` |
| Position Sizer | `core/risk/position_sizer.mjs` |
| Risk Governor | `core/risk/risk_governor.mjs` + wrapper |
| Risk Fortress | `core/edge/risk_fortress.mjs` |
| Safety Loop | `core/live/safety_loop.mjs` |

**Evidence:** kill_switch01_triggers → PASS
**Risks:** Kill switch = pure function, хорошо. Но нет persistent state — если процесс рестартнётся, kill switch state теряется.
**What breaks first:** Process crash → restart → kill switch state lost → orders resume before evaluation.
**Hardening:** Persist kill switch state to disk; require explicit "resume" after restart.

---

## 8. COST MODEL (fees/slippage/funding/partials)

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Cost Model (SSOT) | `core/cost/cost_model.mjs` |
| Fees | `core/cost/fees_model.mjs` |
| Slippage | `core/cost/slippage_model.mjs` |
| Funding | `core/cost/funding_model.mjs` |

**Evidence:** realism01_cost_contract, realism02_no_proxy_metrics → PASS; deep: realism03-07 → PASS
**Risks:** Default config uses `fee_taker_bps: 4` — реалистично для крипто (Binance taker ~4.5bps), но не учитывает tier-based fee schedule.
**What breaks first:** Если реальные fees меняются (e.g. Binance update) → cost model drifts.
**Hardening:** Tiered fee schedule support; periodic fee refresh from exchange API (с гейтом).

---

## 9. PROMOTION LADDER

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Promotion Ladder | `core/promotion/promotion_ladder.mjs` |
| Canary Policy | `core/promotion/canary_policy.mjs` |

**Evidence:** promo01_contract_valid → PASS; deep: promo_e2e01-03 → PASS
**Risks:** Fail-closed: missing metrics → INSUFFICIENT_DATA. Правильно. Но нет cooldown между попытками promotion (можно спамить evaluatePromotion).
**What breaks first:** Promotion без burnin period → premature live exposure.
**Hardening:** Mandatory cooldown + burnin gate перед promotion.

---

## 10. CANARY POLICY

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Canary Runner | `core/canary/canary_runner.mjs` |
| Canary Config Contract | `core/canary/canary_config_contract.mjs` |
| Fitness Suite | `core/canary/fitness_suite.mjs` |
| Reason Codes | `core/canary/reason_codes.mjs` |

**Evidence:** canary01_policy_contract → PASS; deep: canary_e2e01-02, canary_session01 → PASS
**Risks:** Canary runner содержит hardcoded scenario multipliers (SCENARIO_MUL). Если рынок выходит за пределы scenarios → blind spot.
**What breaks first:** Novel regime не покрытый сценариями.
**Hardening:** Adaptive scenario generation на основе реальных market stats.

---

## 11. DATA LANES (acquire/locks/replay)

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Data Organ Controller | `core/data/data_organ_controller.mjs` |
| Dataset IO | `core/data/dataset_io.mjs` |
| Provider Interface | `core/data/provider_interface.mjs` |
| Replay Engine | `core/data/replay_engine.mjs` |
| Bar Validator | `core/data/bar_validator.mjs` |
| Freshness Sentinel | `core/data/freshness_sentinel.mjs` |
| Providers | binance, bybit, kraken (public + ws) |

**Evidence:** data_locks01 → PASS; various data-related regression gates → PASS
**Risks:** Multiple provider implementations (binance, bybit, kraken) — each with different API contracts. Provider maps need to stay in sync.
**What breaks first:** Provider API change → silent data corruption if bar_validator doesn't catch it.
**Hardening:** Provider-level health checks; automated parity tests between providers.

---

## 12. SUPPLY CHAIN / DEPS / INTEGRITY

**Статус: GREEN**

| Компонент | Деталь |
|-----------|--------|
| package.json deps | `undici@^6.23.0`, `ws@^8.18.0` — ТОЛЬКО 2 зависимости |
| Node version | SSOT 22.22.0, enforced via `.node-version`, `.nvmrc`, `NODE_TRUTH.md` |
| Foundation seal | `.foundation-seal/` — frozen integrity checksums |
| Offline install | `verify:deps:offline` gate |

**Evidence:** regression_node_truth_alignment, regression_node_vendor01, regression_node_nvm01 → PASS; san01_global_forbidden_apis → PASS
**Risks:** Минимальный dep tree (2 deps!) — отлично. `undici` — HTTP client, `ws` — WebSocket. Оба зрелые.
**What breaks first:** Если `undici` или `ws` получат CVE → manual update needed.
**Hardening:** lock file integrity check; periodic CVE scan (когда network enabled).

---

## 13. EDGE LAB / COURT PIPELINE

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Pipeline | `core/edge_lab/pipeline.mjs` |
| Manifest | `core/edge_lab/manifest.mjs` |
| Verdicts | `core/edge_lab/verdicts.mjs` |
| Courts | dataset, execution, execution_sensitivity, risk, overfit, red_team, sre_reliability |

**Evidence:** court_wiring01-02 → PASS; Various edge gates → PASS
**Risks:** Pipeline has built-in double-run determinism verification — excellent. 7 courts in fixed order, fail-closed.
**What breaks first:** Adding a new court without registering in COURT_RUNNERS → COURT_OMISSION error (correctly caught).
**Hardening:** Court registration contract test.

---

## 14. TRUTH ENGINE

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Truth Engine | `core/truth/truth_engine.mjs` |
| Canonicalize | `core/truth/canonicalize.mjs` |

**Evidence:** verify:fast trust01-02 → PASS
**Risks:** `evaluate()` uses `Date.now()` directly (line 82) — not DeterministicClock. For live use this is OK, but for tests it's a determinism surface.
**What breaks first:** Tests running at boundary conditions (midnight, DST change) could see different results.
**Hardening:** Accept clock injection in evaluate().

---

## 15. METRICS / SHARPE SSOT

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Unified Sharpe | `core/edge/unified_sharpe.mjs` |
| Metric Contract | `core/metrics/metric_contract.mjs` |
| Overfit Defense | `core/edge/overfit_defense.mjs` |
| Bayesian Sharpe | `core/edge/bayesian_sharpe.mjs` |

**Evidence:** sharpe_ssot01_no_inline, metric_parity01-03 → PASS
**Risks:** unified_sharpe.mjs is zero-dependency, pure — excellent. DSR implementation follows Bailey & Lopez de Prado correctly.
**What breaks first:** If someone adds inline Sharpe elsewhere → parity violation (caught by sharpe_ssot01).
**Hardening:** Already hardened via regression gate.

---

## 16. SIMULATION ENGINE

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Sim Engine | `core/sim/engine.mjs` |
| Paper Engine | `core/sim/engine_paper.mjs` |
| Bar Generator | `core/sim/bar_generator.mjs` |
| Seeded RNG | `core/sim/rng.mjs` |
| Penalized | `core/sim/penalized.mjs` |
| Order Lifecycle | `core/sim/order_lifecycle.mjs` |
| Metrics | `core/sim/metrics.mjs` |

**Evidence:** Various sim-related epoch tests → PASS; determinism x2 tests → PASS
**Risks:** SeededRNG uses xorshift128+ — adequate for simulation, NOT cryptographic. This is correct usage.
**What breaks first:** Если seed не передаётся явно → default 12345 → hidden correlation between runs.
**Hardening:** Enforce explicit seed passing (no default).

---

## 17. NETWORK / TRANSPORT

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Network Guard | `core/net/network_guard.mjs` |
| Transport | `core/net/transport.mjs` |
| Transport Dialer | `core/net/e129_transport_dialer.mjs` |
| Proxy Dispatcher | `core/transport/e134_proxy_dispatcher.mjs` |

**Evidence:** netkill_ledger_enforcement, net_unlock01-03, san01_global_forbidden_apis → PASS
**Risks:** Network kill implemented via env var check (`ENABLE_NETWORK === '1'`). Preload-based kill also exists.
**What breaks first:** If someone sets ENABLE_NETWORK=1 without PROVIDER_ALLOWLIST → open access.
**Hardening:** Already hardened with double-key (env + file). Net kill preload tested.

---

## 18. BACKTEST ENGINE

**Статус: GREEN**

| Компонент | Файл |
|-----------|------|
| Backtest Engine | `core/backtest/engine.mjs` |
| Backtest scripts | `scripts/backtest/e108_backtest_run.mjs` |

**Evidence:** backtest01_organ_health → PASS; e108 determinism x2 contract → PASS
**Risks:** Backtest determinism enforced via x2 contract — good.
**What breaks first:** If backtest uses real time or unsorted data → nondeterminism.
**Hardening:** Already covered by e108 contracts.

---

## SUMMARY TABLE

| # | Орган | Статус | Key Risk |
|---|-------|--------|----------|
| 1 | Policy/Mode Kernel | GREEN | FSM Date.now() minor |
| 2 | Evidence/Canon | GREEN | SHA256 drift |
| 3 | Verify Chain | GREEN | 500+ scripts navigation |
| 4 | Doctor/Cockpit/UX | GREEN | ONE_NEXT_ACTION alignment |
| 5 | Nervous System/FSM | GREEN | HALT exit без double-key |
| 6 | Execution/MasterExecutor | GREEN | Idempotency placeholder |
| 7 | Risk Brain | GREEN | Kill switch state не persistent |
| 8 | Cost Model | GREEN | Static fee schedule |
| 9 | Promotion Ladder | GREEN | No cooldown between attempts |
| 10 | Canary Policy | GREEN | Hardcoded scenarios |
| 11 | Data Lanes | GREEN | Multi-provider sync |
| 12 | Supply Chain | GREEN | 2 deps only — excellent |
| 13 | Edge Lab Pipeline | GREEN | Well-gated |
| 14 | Truth Engine | GREEN | Date.now() in evaluate() |
| 15 | Metrics/Sharpe SSOT | GREEN | Zero-dep, excellent |
| 16 | Simulation Engine | GREEN | Default seed |
| 17 | Network/Transport | GREEN | Double-key enforced |
| 18 | Backtest Engine | GREEN | Determinism x2 enforced |
