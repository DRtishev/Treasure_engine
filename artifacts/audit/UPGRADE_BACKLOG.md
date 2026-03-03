# UPGRADE BACKLOG — Treasure Engine
Дата: 2026-03-03
Ранжирование: ROI = Impact / (Effort × Risk)

## Формат: Impact (1-10) · Effort (1-10) · Risk (1-10) · Time-to-evidence

---

### TIER 1 — НЕМЕДЛЕННЫЕ (ROI > 5.0)

| # | Upgrade | Impact | Effort | Risk | ROI | Time | Minimal | Radical | Gates |
|---|---------|--------|--------|------|-----|------|---------|---------|-------|
| 1 | Fix budget_ms → budget_millis (MINE-01) | 10 | 1 | 1 | 10.0 | 5 мин | 1-line rename в state_manager.mjs:460 | Allowlist mechanism в event_schema_v1.mjs | RG_EVT03_BUDGET_FIELD |
| 2 | Fix regression EC anomaly (MINE-08) | 7 | 1 | 1 | 7.0 | 10 мин | Fix exit code в net-toolchain01 regression | Audit все regression gates на EC consistency | RG_EC_CONTRACT |
| 3 | Fix DeterministicClock default (MINE-05) | 8 | 1 | 2 | 4.0 | 15 мин | `??` вместо `\|\|`, assert in CERT mode | Remove default entirely | RG_CLOCK01 |
| 4 | Убрать placeholder hashes (MINE-10) | 6 | 1 | 1 | 6.0 | 10 мин | Delete placeholder lines | Добавить registry validation gate | RG_EP00_NO_PLACEHOLDERS |
| 5 | npm audit fix (ajv ReDoS, MINE-07) | 5 | 1 | 1 | 5.0 | 5 мин | `npm audit fix` | Pin exact version | npm audit clean |

---

### TIER 2 — КРИТИЧЕСКАЯ ИНФРАСТРУКТУРА (ROI 2.0-5.0)

| # | Upgrade | Impact | Effort | Risk | ROI | Time | Minimal | Radical | Gates |
|---|---------|--------|--------|------|-----|------|---------|---------|-------|
| 6 | Bootstrap vendored toolchain (MINE-02) | 10 | 2 | 2 | 2.5 | 30 мин | `ops:node:toolchain:bootstrap` | Docker vendoring + SHA256 chain | RG_NET_TOOLCHAIN01 |
| 7 | Оживить backtest determinism x2 (MINE-06) | 9 | 2 | 2 | 2.25 | 1 час | Обрезать ajv import chain | Переписать contracts без ajv | RG_BT01_DETERMINISM_X2 |
| 8 | Расширить SAN01 на core/ (MINE-04) | 9 | 3 | 3 | 1.0 | 2-4 часа | Добавить core/ в scan targets + allowlist | AST-based analysis | RG_SAN01_CORE_SCOPE |
| 9 | Wire Edge Lab courts в sweep (MINE-09) | 8 | 4 | 3 | 0.67 | 1-2 дня | Вызвать 3 ключевых суда | Full 7-court pipeline | RG_BT02_COURTS_WIRED |
| 10 | mode_fsm.mjs inject clock (MINE-15) | 5 | 2 | 1 | 2.5 | 30 мин | Clock injection в 3 callsites | Full governance clock refactor | RG_SAN01_CORE |

---

### TIER 3 — ПРОДВИЖЕНИЕ К PROFIT (ROI зависит от данных)

| # | Upgrade | Impact | Effort | Risk | ROI | Time | Minimal | Radical | Gates |
|---|---------|--------|--------|------|-----|------|---------|---------|-------|
| 11 | Data acquisition: funding rates | 9 | 4 | 3 | 0.75 | 3-5 дней | 1 feed (Binance funding) | Multi-exchange + historical | data quorum |
| 12 | Data acquisition: OI + liquidations | 8 | 5 | 4 | 0.40 | 5-7 дней | Binance only | Multi-exchange aggregate | data quorum |
| 13 | Paper trading evidence (1 strategy) | 9 | 5 | 3 | 0.60 | 2-4 недели | s1_breakout_atr, 30 дней testnet | All 4 candidates, 90+ дней | edge:profit:00 |
| 14 | Square-root market impact в engine | 7 | 3 | 3 | 0.78 | 1-2 дня | Parametric: `sqrt(size/ADV) * coeff` | Full orderbook model | RG_BT03_IMPACT |
| 15 | Fill probe: real implementation | 7 | 4 | 4 | 0.44 | 3-5 дней | Testnet fill detection | Full exchange reconciliation | verify:e125 |
| 16 | Profit ledger state refresh | 6 | 2 | 2 | 1.5 | 2-4 часа | Regenerate from latest capsule | Auto-refresh mechanism | — |

---

### TIER 4 — ОПЕРАЦИОННОЕ СОВЕРШЕНСТВО

| # | Upgrade | Impact | Effort | Risk | ROI | Time | Minimal | Radical | Gates |
|---|---------|--------|--------|------|-----|------|---------|---------|-------|
| 17 | Performance: parallel gate execution | 6 | 5 | 4 | 0.30 | 3-5 дней | Parallel sub-gates в verify:fast | Gate DAG с auto-parallelism | timing budget |
| 18 | Evidence pruning automation | 5 | 3 | 3 | 0.56 | 1-2 дня | Archive script >30 дней | Auto-archive + SHA256 index | RG_PR01 |
| 19 | CI/CD pipeline | 6 | 5 | 3 | 0.40 | 3-5 дней | GitHub Actions: verify:fast x2 | Full: edge + evidence pack | — |
| 20 | Cockpit: live FSM visualization | 4 | 3 | 2 | 0.67 | 1-2 дня | ASCII state diagram в HUD | Web dashboard + websocket | ops:cockpit |
| 21 | Canary micro-live deployment | 8 | 7 | 5 | 0.23 | 2-4 недели | $5 max, 1 trade/day, 7-day | Full graduated deployment | verify:e121-e127 |
| 22 | Orphan artifact detection | 4 | 2 | 2 | 1.0 | 4-8 часов | Scan artifacts/incoming/ для orphans | Provenance chain tracking | RG_ORPHAN01 |
| 23 | Event schema allowlist mechanism | 5 | 2 | 2 | 1.25 | 2-4 часа | Explicit allowlist массив | Config-driven allowlist from JSON | RG_EVT04 |
| 24 | ctx fallback elimination | 6 | 3 | 2 | 1.0 | 1-2 дня | Remove `\|\| Date.now()` fallbacks в master_executor | Mandatory ctx in all execution paths | RG_CTX01 |
| 25 | perf_engine Math.random → deterministic | 4 | 2 | 1 | 2.0 | 30 мин | Use ctx.rng for ID generation | UUID v5 (namespace-based) | RG_SAN01_CORE |

---

### TIER 5 — СТРАТЕГИЧЕСКОЕ РАЗВИТИЕ

| # | Upgrade | Impact | Effort | Risk | ROI | Time | Minimal | Radical | Gates |
|---|---------|--------|--------|------|-----|------|---------|---------|-------|
| 26 | Multi-exchange data normalization | 7 | 6 | 4 | 0.29 | 1-2 недели | Binance + Bybit unified schema | 5+ exchanges + cross-venue | data quorum v3 |
| 27 | Walk-forward optimization pipeline | 8 | 6 | 4 | 0.33 | 1-2 недели | WFO lite (already exists) | Full anchored WFO с purge | verify:e24 |
| 28 | Monte Carlo confidence intervals | 6 | 4 | 3 | 0.50 | 3-5 дней | Bootstrap CI для Sharpe | Full MC: drawdown, ruin prob | edge:expectancy |
| 29 | Regime-aware position sizing | 7 | 5 | 4 | 0.35 | 1-2 недели | Vol-regime thresholds (already exists) | HMM-driven dynamic allocation | risk fortress |
| 30 | Real-time risk monitoring | 7 | 6 | 5 | 0.23 | 2-3 недели | Polling-based risk checker | Event-driven с circuit breaker | ops:risk |
| 31 | Execution quality analytics | 6 | 5 | 3 | 0.40 | 1-2 недели | Slippage/fill rate tracking | Full TCA (transaction cost analysis) | verify:e80 |
| 32 | Strategy rotation mechanism | 6 | 5 | 4 | 0.30 | 1-2 недели | Manual rotation via governance | Auto-rotation via Kelly allocation | governance |
| 33 | Distributed evidence storage | 4 | 6 | 4 | 0.17 | 2-3 недели | Git LFS для evidence packs | IPFS/S3 с merkle verification | gov:merkle |
| 34 | Doc site auto-generation | 3 | 4 | 2 | 0.38 | 3-5 дней | Markdown → static site | Live API docs + interactive examples | — |
| 35 | Operator mobile alerts | 5 | 5 | 3 | 0.33 | 1-2 недели | Telegram/Discord webhook | Full mobile app + push notifications | — |

---

## Приоритизация по спринтам

**Sprint 0 (1-2 дня):** #1, #2, #3, #4, #5, #6
**Sprint 1 (3-7 дней):** #7, #8, #9, #10, #23, #24, #25
**Sprint 2 (1-3 недели):** #11, #12, #14, #15, #16
**Sprint 3 (1-2 месяца):** #13, #17, #18, #19, #20, #21
