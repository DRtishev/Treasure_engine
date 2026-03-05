# WOW UPGRADES — OMEGA AUDIT

**Дата:** 2026-03-05 | **Режим:** CERT (OFFLINE) + RESEARCH (идеи) | **HEAD:** 5dfb0b6

---

## ВЕТКА A: RELIABILITY HARDCORE (нулевой сюрприз)

### A01. Persistent Kill Switch State
- **Organ:** Risk Brain
- **Mechanism:** Записывать kill switch state в `artifacts/runtime/kill_switch_state.json` при каждом evaluate(). При старте — загружать и требовать explicit `--resume-trading` если state=HALTED.
- **Why it matters:** Process crash → restart → ордера НЕ должны возобновляться без ревалидации.
- **Failure modes:** Corrupted JSON → fail-closed (refuse to trade). Disk full → fail-closed.
- **Proof plan:** Тест: kill → write state → restart process → assert orders blocked without --resume.
- **Minimal MVP:** 30 строк: JSON.write in SafetyLoop.evaluate, JSON.read in constructor.
- **Gates:** regression_kill_switch_survives_restart
- **Cost/Impact/Risk:** 2/9/1
- **Hard NO:** Не делать если нет plans для live trading.

### A02. Double-Key HALT Reset
- **Organ:** Nervous System/FSM
- **Mechanism:** Для выхода из HALT: файл `artifacts/incoming/HALT_RESET` + флаг `--confirm-halt-exit`.
- **Why it matters:** HALT — серьёзное событие. Программный вызов `requestManualReset()` без оператора — опасен.
- **Failure modes:** Operator забыл создать файл → заблокирован (correct behavior).
- **Proof plan:** Тест: HALT → requestManualReset() без файла → assert rejected. С файлом → assert accepted.
- **Minimal MVP:** 15 строк в mode_fsm.mjs.
- **Gates:** regression_halt_exit_requires_double_key
- **Cost/Impact/Risk:** 1/8/1
- **Hard NO:** Если FSM используется только в тестах.

### A03. Intent Idempotency via Hash
- **Organ:** Execution/MasterExecutor
- **Mechanism:** hash(intent + context.bar_idx + context.hack_id) → check in Set/Map before order placement.
- **Why it matters:** Дублирование ордеров = двойной exposure = двойной loss.
- **Failure modes:** Hash collision → missed dedup (astronomically rare with SHA-256).
- **Proof plan:** Тест: submit same intent twice → second returns {created: true, idempotent: true}.
- **Minimal MVP:** 20 строк: Map + crypto.createHash.
- **Gates:** regression_idempotency_no_duplicate_orders
- **Cost/Impact/Risk:** 2/9/1
- **Hard NO:** Никогда. Это must-have.

### A04. Clock Injection Everywhere
- **Organ:** Multiple (FSM, TruthEngine, MasterExecutor)
- **Mechanism:** Все `Date.now()` → `(opts.clock || ctx.clock || {now: Date.now}).now()`.
- **Why it matters:** Determinism guarantee для тестов. Elimination of ND* surface.
- **Failure modes:** Если clock не передан → fallback на Date.now() (existing behavior).
- **Proof plan:** Grep `Date.now()` в core/ → count должен = 0 (кроме clock.mjs и SystemClock).
- **Minimal MVP:** ~50 строк изменений, разбросанных по 5-6 файлам.
- **Gates:** regression_nd_no_raw_date_now (расширение san01)
- **Cost/Impact/Risk:** 3/7/2
- **Hard NO:** Если все тесты и так детерминистичны.

### A05. Reconciliation Alert Pipeline
- **Organ:** Execution/MasterExecutor
- **Mechanism:** При reconciliation failure → write event to `artifacts/runtime/alerts/recon_YYYY-MM-DD.jsonl` + increment kill switch metric.
- **Why it matters:** Reconciliation failure = reality gap. Молчаливый fail → undetected losses.
- **Failure modes:** Too many alerts → disk pressure. Solution: rotation (keep last 7 days).
- **Proof plan:** Тест: inject recon mismatch → assert alert file written + kill switch metric incremented.
- **Minimal MVP:** 25 строк.
- **Gates:** regression_recon_alert_writes_file
- **Cost/Impact/Risk:** 2/8/1

### A06. Pre-Flight Checklist Before Live
- **Organ:** Doctor/Cockpit
- **Mechanism:** `npm run preflight:live` — runs все P1 checks в один шот: kill switch state, idempotency active, HALT reset clear, fees calibrated, data fresh.
- **Why it matters:** Оператор не должен помнить 10 проверок. Одна команда.
- **Failure modes:** False PASS (covered by individual gate tests).
- **Proof plan:** Тест: simulate каждый failure → assert preflight blocks.
- **Minimal MVP:** 40 строк orchestrator script.
- **Gates:** Сам скрипт является гейтом.
- **Cost/Impact/Risk:** 3/8/1

### A07. Structured Error Reporting (No console.error)
- **Organ:** Execution/MasterExecutor
- **Mechanism:** Replace all `console.error` → structured JSON to event log or error file.
- **Why it matters:** console.error goes to stderr, may be missed. Structured → searchable, alertable.
- **Failure modes:** Event log itself fails → double-fault. Solution: write to stderr as last resort.
- **Proof plan:** Grep `console.error` in core/ → count = 0.
- **Minimal MVP:** 10 строк.
- **Gates:** regression_no_console_error_in_core
- **Cost/Impact/Risk:** 1/5/1

### A08. FSM Transition Audit Log to Disk
- **Organ:** Nervous System/FSM
- **Mechanism:** Every FSM transition → append to `artifacts/runtime/fsm_transitions.jsonl`.
- **Why it matters:** Post-mortem analysis. "Why were we in PAPER?" → check log.
- **Failure modes:** File grows unbounded → rotation (keep last 1000 transitions).
- **Proof plan:** Тест: 5 transitions → assert file has 5 lines.
- **Minimal MVP:** 10 строк.
- **Gates:** regression_fsm_transition_log_written
- **Cost/Impact/Risk:** 1/6/1

### A09. Automatic Canary Scenario Expansion
- **Organ:** Canary Policy
- **Mechanism:** Generate additional scenarios from market data statistics (percentiles of vol, gap, dd).
- **Why it matters:** Hardcoded 5 scenarios → blind spot для novel regimes.
- **Failure modes:** Too many scenarios → slow. Solution: keep max 10.
- **Proof plan:** Feed historical data → assert generated scenarios cover 95th percentile.
- **Minimal MVP:** 30 строк: stats → scenario multipliers.
- **Gates:** regression_canary_scenarios_cover_percentiles
- **Cost/Impact/Risk:** 4/7/2

### A10. Burn-In Gate Before Promotion
- **Organ:** Promotion Ladder
- **Mechanism:** Require minimum N days + M trades at current stage before evaluatePromotion returns eligible.
- **Why it matters:** Prevents premature promotion based on lucky streak.
- **Failure modes:** Clock manipulation → bypass. Solution: use monotonic evidence timestamps.
- **Proof plan:** Тест: 13 days (< 14 min) → BLOCKED. 15 days → check criteria.
- **Minimal MVP:** 15 строк in evaluatePromotion.
- **Gates:** regression_promo_burnin_enforced
- **Cost/Impact/Risk:** 2/8/1

### A11. Circuit Breaker Pattern for Exchange Adapters
- **Organ:** Execution/Adapters
- **Mechanism:** After N consecutive exchange errors → adapter enters CIRCUIT_OPEN state → all orders rejected for cooldown period.
- **Why it matters:** Exchange outage → hammering with orders → rate limit → ban.
- **Failure modes:** Stuck in OPEN → miss opportunities. Solution: half-open probe.
- **Proof plan:** Inject 5 errors → assert OPEN. Wait cooldown → assert half-open → probe succeeds → CLOSED.
- **Minimal MVP:** 40 строк in adapter base class.
- **Gates:** regression_circuit_breaker_triggers
- **Cost/Impact/Risk:** 3/7/2

### A12. Graceful Shutdown Protocol
- **Organ:** Execution/MasterExecutor
- **Mechanism:** On SIGTERM/SIGINT → cancel all pending orders → flatten positions → persist state → exit.
- **Why it matters:** Ungraceful shutdown → orphaned orders on exchange.
- **Failure modes:** Exchange unreachable → timeout → force exit with warning.
- **Proof plan:** Send SIGTERM → assert cancel+flatten+persist called.
- **Minimal MVP:** 30 строк signal handler.
- **Gates:** regression_graceful_shutdown_protocol
- **Cost/Impact/Risk:** 3/9/2

### A13. Health Heartbeat File
- **Organ:** Doctor/Cockpit
- **Mechanism:** Every 60s write `artifacts/runtime/heartbeat.json` with timestamp + state summary.
- **Why it matters:** External monitoring can detect process death (stale heartbeat).
- **Failure modes:** Disk full → fail-closed (safe).
- **Proof plan:** Start system → wait 120s → assert 2+ heartbeat updates.
- **Minimal MVP:** 15 строк setInterval.
- **Gates:** regression_heartbeat_fresh
- **Cost/Impact/Risk:** 1/6/1

### A14. Evidence Chain Integrity Hash
- **Organ:** Evidence/Canon
- **Mechanism:** Each evidence file → SHA256 → chain hash (prev_hash + current_hash). Merkle tree for epoch.
- **Why it matters:** Tamper detection. "Someone edited evidence after the fact."
- **Failure modes:** Hash computation error → chain breaks → loud failure (good).
- **Proof plan:** Modify evidence file → verify chain → assert BROKEN.
- **Minimal MVP:** 30 строк. (Partially exists in foundation-seal).
- **Gates:** regression_evidence_chain_intact
- **Cost/Impact/Risk:** 3/7/2

### A15. Provider Health Matrix
- **Organ:** Data Lanes
- **Mechanism:** Track per-provider health: latency, error rate, last success ts. Auto-failover to backup provider.
- **Why it matters:** Single provider failure → data gap → stale data → HALT.
- **Failure modes:** All providers down → correct HALT.
- **Proof plan:** Mock provider failure → assert failover to backup.
- **Minimal MVP:** 40 строк health tracker + failover logic.
- **Gates:** regression_provider_failover_works
- **Cost/Impact/Risk:** 4/8/2

---

## ВЕТКА B: PROFIT PIPELINE HARDCORE (реализм/промоушен/данные)

### B01. Tiered Fee Schedule
- **Organ:** Cost Model
- **Mechanism:** Accept `fee_schedule: [{volume_usd_min, volume_usd_max, maker_bps, taker_bps}]` in config.
- **Why it matters:** Real exchanges have volume-based tiers. Fixed 4bps overestimates cost at high volume.
- **Failure modes:** Wrong tier → wrong cost → wrong PnL. Solution: conservative fallback to highest tier.
- **Proof plan:** Same trade at different volume tiers → assert different fees.
- **Minimal MVP:** 20 строк in fees_model.mjs.
- **Gates:** regression_cost_tiered_fees
- **Cost/Impact/Risk:** 2/7/1

### B02. Time-Varying Funding Rate
- **Organ:** Cost Model
- **Mechanism:** Accept funding rate time series instead of single rate.
- **Why it matters:** Funding rate varies ±50bps between periods. Static rate hides cost variance.
- **Failure modes:** Missing rate → use last known (with staleness warning).
- **Proof plan:** Feed varying rates → assert funding cost varies per holding period.
- **Minimal MVP:** 15 строк.
- **Gates:** regression_cost_dynamic_funding
- **Cost/Impact/Risk:** 2/7/1

### B03. Multi-Window Promotion Criteria
- **Organ:** Promotion Ladder
- **Mechanism:** Require criteria met across multiple independent windows (e.g., 3 of 4 weekly windows).
- **Why it matters:** Single window → lucky streak → premature promotion.
- **Failure modes:** Too strict → never promotes. Solution: configurable window count.
- **Proof plan:** 4 windows, criteria met in 2/4 → BLOCKED. Met in 3/4 → ELIGIBLE.
- **Minimal MVP:** 30 строк.
- **Gates:** regression_promo_multiwindow
- **Cost/Impact/Risk:** 3/8/2

### B04. Walk-Forward Validation as Promotion Gate
- **Organ:** Promotion Ladder + Edge Lab
- **Mechanism:** Before any promotion, run walk-forward validation on last N periods. If degraded → BLOCKED.
- **Why it matters:** In-sample performance ≠ out-of-sample. Walk-forward detects overfitting.
- **Failure modes:** Expensive computation → budget. Solution: lightweight rolling WF.
- **Proof plan:** Overfit strategy → WF fails → promotion blocked.
- **Minimal MVP:** Integrate existing WFO (core/wfo/walk_forward.mjs) into promotion gate.
- **Gates:** regression_promo_wf_required
- **Cost/Impact/Risk:** 4/9/2

### B05. PnL Attribution Pipeline
- **Organ:** Profit/Metrics
- **Mechanism:** Decompose PnL into: alpha + fees + slippage + funding + timing. Track each component.
- **Why it matters:** "We made money" is not enough. "We made money DESPITE 15bps slippage" is actionable.
- **Failure modes:** Decomposition doesn't sum to total PnL → reconciliation error.
- **Proof plan:** Assert: alpha + fees + slippage + funding + timing = total_pnl (within epsilon).
- **Minimal MVP:** 40 строк: decompose in cost model, aggregate in ledger.
- **Gates:** regression_pnl_attribution_sums
- **Cost/Impact/Risk:** 3/8/2

### B06. Drawdown-Adjusted Position Sizing
- **Organ:** Risk Brain
- **Mechanism:** Reduce position size proportionally to current drawdown. At 50% of max_dd → 50% position size.
- **Why it matters:** Fixed position size during drawdown → recovery takes too long or hits kill switch.
- **Failure modes:** Over-reduction → miss recovery. Solution: floor at 25% of normal size.
- **Proof plan:** Simulate drawdown → assert position sizes decrease linearly.
- **Minimal MVP:** 10 строк in position_sizer.mjs.
- **Gates:** regression_dd_adjusted_sizing
- **Cost/Impact/Risk:** 2/7/1

### B07. Strategy Rotation Policy
- **Organ:** Portfolio
- **Mechanism:** Track per-strategy performance. Auto-rotate underperformers to paper. Outperformers get more allocation.
- **Why it matters:** Static allocation → dead strategies consume capital.
- **Failure modes:** Too aggressive rotation → thrashing. Solution: cooldown between rotations.
- **Proof plan:** Strategy underperforms for N days → assert rotated to paper.
- **Minimal MVP:** 30 строк in multi_strategy.mjs or portfolio_allocator.mjs.
- **Gates:** regression_strategy_rotation
- **Cost/Impact/Risk:** 4/7/3

### B08. Regime Detection Integration
- **Organ:** Data Lanes + Strategy
- **Mechanism:** Feed regime detector output (vol_regime_detector.mjs) into strategy selection and position sizing.
- **Why it matters:** Different regimes need different strategies. Trading trend-following in mean-reversion regime = losses.
- **Failure modes:** Regime detector lag → wrong regime → wrong strategy.
- **Proof plan:** Simulate regime change → assert strategy switch within N bars.
- **Minimal MVP:** 20 строк: wire vol_regime_detector output to strategy_orchestrator.
- **Gates:** regression_regime_aware_strategy
- **Cost/Impact/Risk:** 4/8/3

### B09. Fill Quality Monitor
- **Organ:** Execution/Recon
- **Mechanism:** Track execution quality: fill rate, slippage vs expected, latency distribution. Alert on degradation.
- **Why it matters:** Execution quality = hidden cost. 10bps worse fills = 10bps less profit.
- **Failure modes:** Not enough data → unreliable stats. Solution: minimum sample size.
- **Proof plan:** Inject bad fills → assert quality score degrades → alert triggered.
- **Minimal MVP:** 30 строк.
- **Gates:** regression_fill_quality_monitored
- **Cost/Impact/Risk:** 3/7/2

### B10. Paper↔Live Parity Scoring
- **Organ:** Canary Policy
- **Mechanism:** Run same signals through paper and live in parallel. Score parity. Alert on divergence.
- **Why it matters:** Paper results ≠ live results is normal. But GROWING gap = systematic issue.
- **Failure modes:** Data timing differences → false divergence. Solution: tolerance window.
- **Proof plan:** Simulate parallel paper+live → inject divergence → assert alert.
- **Minimal MVP:** 40 строк.
- **Gates:** regression_paper_live_parity
- **Cost/Impact/Risk:** 5/8/3

### B11. Orderbook Depth Calibration
- **Organ:** Cost Model
- **Mechanism:** Use real orderbook snapshots to calibrate depth_usd and slippage model parameters.
- **Why it matters:** Default `depth_default_usd: 1_000_000` may be wildly wrong for thin markets.
- **Failure modes:** Stale orderbook → wrong calibration. Solution: freshness check.
- **Proof plan:** Calibrate with real orderbook → assert slippage estimate closer to reality.
- **Minimal MVP:** 20 строк: parse orderbook → compute depth → update config.
- **Gates:** regression_orderbook_calibrated
- **Cost/Impact/Risk:** 3/8/2

### B12. Expectancy Court as Promotion Pre-Requisite
- **Organ:** Edge Lab
- **Mechanism:** No promotion unless expectancy court gives POSITIVE verdict with DSR > 0.5.
- **Why it matters:** Promoting strategy with negative/uncertain expectancy → guaranteed losses.
- **Failure modes:** DSR too strict → never promotes. Solution: configurable threshold.
- **Proof plan:** Strategy with DSR < 0.5 → assert promotion blocked.
- **Minimal MVP:** 10 строк in evaluatePromotion (check DSR).
- **Gates:** regression_promo_requires_dsr
- **Cost/Impact/Risk:** 2/9/1

### B13. Profit Ledger Dashboard
- **Organ:** Doctor/Cockpit
- **Mechanism:** `npm run profit:dashboard` — shows running PnL, attribution, strategy breakdown, drawdown chart (ASCII).
- **Why it matters:** Operator needs to see performance at a glance. Currently requires reading JSON files.
- **Failure modes:** Dashboard shows stale data → misleading. Solution: show data freshness.
- **Proof plan:** Generate ledger data → run dashboard → assert all sections present.
- **Minimal MVP:** 50 строк: read ledger → format table → output.
- **Gates:** N/A (UX improvement).
- **Cost/Impact/Risk:** 3/6/1

### B14. Monte Carlo Confidence Intervals
- **Organ:** Metrics/Sharpe
- **Mechanism:** Bootstrap PnL series → compute CI for Sharpe, max DD, expectancy. Include in promotion evaluation.
- **Why it matters:** Point estimate of Sharpe is unreliable. CI gives "with 95% confidence, Sharpe > X".
- **Failure modes:** Too few samples → wide CI → never promotes. Solution: minimum sample size gate.
- **Proof plan:** 1000 bootstrap iterations → assert CI contains true Sharpe.
- **Minimal MVP:** 40 строк: bootstrap loop + percentile calculation. (core/edge/monte_carlo.mjs already exists)
- **Gates:** regression_ci_included_in_promotion
- **Cost/Impact/Risk:** 3/8/2

### B15. Real-Time PnL Reconciliation
- **Organ:** Execution/Recon
- **Mechanism:** Periodically reconcile internal PnL with exchange account balance. Alert on divergence.
- **Why it matters:** Internal ledger drift from exchange reality → false confidence in PnL.
- **Failure modes:** Exchange API returns partial data → false alarm. Solution: retry + tolerance.
- **Proof plan:** Inject PnL drift → assert reconciliation catches it.
- **Minimal MVP:** 30 строк.
- **Gates:** regression_pnl_reconciliation
- **Cost/Impact/Risk:** 3/9/2

---

## ВЕТКА C: SPEED / COST HARDCORE (ускорение verify без потери суда)

### C01. Parallel Gate Execution in verify:fast
- **Organ:** Verify Chain
- **Mechanism:** Group independent gates → run in parallel (Promise.all). Sequential only for dependencies.
- **Why it matters:** 58 gates sequentially = N seconds. Parallel = N/cores seconds.
- **Failure modes:** Race condition between gates. Solution: gates must be independent (already are — pure functions).
- **Proof plan:** verify:fast parallel → same results as sequential. Measure speedup.
- **Minimal MVP:** 40 строк orchestrator.
- **Gates:** regression_fast_parallel_same_results
- **Cost/Impact/Risk:** 4/7/3

### C02. Gate Result Caching (Content-Addressable)
- **Organ:** Verify Chain
- **Mechanism:** Hash(gate_source + input_files_hash) → cache result. Skip if unchanged.
- **Why it matters:** Most verify:fast runs after code change affect only 1-2 files. 56 gates re-run unnecessarily.
- **Failure modes:** Stale cache → false PASS. Solution: conservative invalidation + cache_policy_check gate.
- **Proof plan:** Run twice without changes → second run uses cache → 10x faster.
- **Minimal MVP:** 60 строк: hash computation + cache store (already partially exists: cacheable_stage.mjs).
- **Gates:** verify:cache:policy (already exists!)
- **Cost/Impact/Risk:** 5/8/3

### C03. Incremental Evidence Packing
- **Organ:** Evidence/Canon
- **Mechanism:** Pack only changed/new evidence files. Maintain manifest of what's packed.
- **Why it matters:** Full evidence pack = slow on large repos. Incremental = fast.
- **Failure modes:** Missed file → incomplete evidence. Solution: full pack as validation.
- **Proof plan:** Change 1 file → incremental pack → assert only that file packed. Full pack → assert same contents.
- **Minimal MVP:** 30 строк.
- **Gates:** regression_incremental_pack_complete
- **Cost/Impact/Risk:** 3/6/2

### C04. Script Index Generator
- **Organ:** Doctor/Cockpit/UX
- **Mechanism:** Auto-generate categorized script index from package.json → `docs/SCRIPTS_INDEX.md`.
- **Why it matters:** 500+ scripts → impossible to navigate. Index = searchable documentation.
- **Failure modes:** Index drifts from package.json. Solution: generate on verify:fast.
- **Proof plan:** Add script → run generator → assert new script in index.
- **Minimal MVP:** 30 строк: parse package.json → categorize by prefix → write markdown.
- **Gates:** regression_script_index_fresh
- **Cost/Impact/Risk:** 2/6/1

### C05. Lazy Import for Deep Gates
- **Organ:** Verify Chain
- **Mechanism:** Deep gates load heavy modules (data files, fixtures). Use lazy dynamic import().
- **Why it matters:** Cold start of verify:deep loads everything. Lazy = load only what's needed.
- **Failure modes:** Import error at runtime instead of startup. Solution: pre-validate imports in a gate.
- **Proof plan:** Measure verify:deep cold start before/after.
- **Minimal MVP:** Refactor top-level imports to dynamic import() in deep gate scripts.
- **Gates:** Existing speed_budget_contract.
- **Cost/Impact/Risk:** 4/5/2

### C06. Binary Fixture Compression
- **Organ:** Data Lanes
- **Mechanism:** Store test fixtures as compressed JSONL (.gz). Decompress on read.
- **Why it matters:** Fixtures are read-only, may be large. Compression saves disk + faster I/O.
- **Failure modes:** Decompression error → fail-closed. Solution: checksum verification.
- **Proof plan:** Compress fixtures → verify:deep still passes → measure disk savings.
- **Minimal MVP:** 20 строк: gzip read wrapper.
- **Gates:** regression_compressed_fixtures_pass
- **Cost/Impact/Risk:** 3/4/2

### C07. Gate Dependency Graph
- **Organ:** Verify Chain
- **Mechanism:** Define explicit dependency graph between gates. Use for: parallel execution, minimal re-run.
- **Why it matters:** Currently gates run in flat order. Graph enables smart scheduling.
- **Failure modes:** Wrong dependency → gate runs before its dep → incorrect result. Solution: validate graph.
- **Proof plan:** Define graph → verify topological order → assert same results.
- **Minimal MVP:** 50 строк: graph definition + topological sort.
- **Gates:** regression_gate_graph_valid
- **Cost/Impact/Risk:** 5/7/3

### C08. verify:fast Split into Tiers
- **Organ:** Verify Chain
- **Mechanism:** verify:fast:instant (< 1s, 10 critical gates), verify:fast:full (< 5s, all 58).
- **Why it matters:** Developer iterating on code needs <1s feedback. Full 58 can run in CI.
- **Failure modes:** Critical gates miss something. Solution: tier selection reviewed quarterly.
- **Proof plan:** verify:fast:instant covers all P0 scenarios.
- **Minimal MVP:** 20 строк: separate script that runs subset.
- **Gates:** regression_fast_instant_covers_p0
- **Cost/Impact/Risk:** 2/7/1

### C09. Determinism Test Time Budget
- **Organ:** Verify Chain
- **Mechanism:** x2 anti-flake tests run within time budget. If budget exceeded → YELLOW warning.
- **Why it matters:** x2 tests double execution time. Budget keeps it bounded.
- **Failure modes:** Budget too tight → false warnings. Solution: generous default (2x single run).
- **Proof plan:** Slow gate → assert YELLOW warning.
- **Minimal MVP:** 10 строк: measure time, compare to budget.
- **Gates:** N/A (meta-gate).
- **Cost/Impact/Risk:** 1/5/1

### C10. npm Script Deduplication
- **Organ:** Supply Chain
- **Mechanism:** Detect duplicate/near-duplicate scripts in package.json. Alert and suggest merge.
- **Why it matters:** 500+ scripts → likely duplicates. Duplicates = maintenance burden.
- **Failure modes:** False positive → manual review needed.
- **Proof plan:** Scan scripts → report duplicates → operator reviews.
- **Minimal MVP:** 20 строк scan script.
- **Gates:** N/A (one-time cleanup).
- **Cost/Impact/Risk:** 2/4/1

---

## CROSS-CUTTING UPGRADES (D)

### D01. Unified Runtime State Directory
- **Mechanism:** All runtime state → `artifacts/runtime/` with clear subdirs: `kill_switch/`, `fsm/`, `heartbeat/`, `alerts/`.
- **Cost/Impact/Risk:** 2/7/1

### D02. Structured Reason Code Registry
- **Mechanism:** Central `core/governance/reason_codes_registry.mjs` — all reason codes, categories, severities.
- **Cost/Impact/Risk:** 3/6/1

### D03. Operator Notification Channel
- **Mechanism:** Write critical events to `artifacts/runtime/notifications.jsonl`. External tool can poll.
- **Cost/Impact/Risk:** 2/7/1

### D04. Configuration Drift Detector
- **Mechanism:** Hash all config at startup. Alert if config changed since last run.
- **Cost/Impact/Risk:** 2/6/1

### D05. Automated Gate Coverage Report
- **Mechanism:** `npm run gates:coverage` — report which core modules have regression gates and which don't.
- **Cost/Impact/Risk:** 2/7/1

### D06. Time-Boxed Epoch Lifecycle
- **Mechanism:** Each epoch has max duration. If exceeded → auto-BLOCKED + alert.
- **Cost/Impact/Risk:** 2/6/1

### D07. Strategy Parameter Freezing
- **Mechanism:** Once promoted, strategy parameters → frozen artifact. Any drift → BLOCKED.
- **Cost/Impact/Risk:** 3/8/2

### D08. Exchange API Mock Server
- **Mechanism:** Local mock exchange for integration testing without network.
- **Cost/Impact/Risk:** 5/7/2

### D09. Backtest Replay from Evidence
- **Mechanism:** Replay any historical period using evidence pack data. Compare with original results.
- **Cost/Impact/Risk:** 4/7/2

### D10. Contract-First API Design
- **Mechanism:** Define exchange adapter contract as TypeScript-style interface. All adapters must conform.
- **Cost/Impact/Risk:** 4/6/2

### D11. Minimum Viable Observability Stack
- **Mechanism:** Structured JSON logs → file → simple viewer (`npm run logs:view --tail`).
- **Cost/Impact/Risk:** 3/6/1

### D12. Multi-Asset Support Foundation
- **Mechanism:** Abstract symbol handling to support multiple assets without code duplication.
- **Cost/Impact/Risk:** 5/7/3

### D13. Position State Machine
- **Mechanism:** Formal state machine for positions: FLAT → OPENING → OPEN → CLOSING → FLAT.
- **Cost/Impact/Risk:** 4/7/2

### D14. Operational Runbook Automation
- **Mechanism:** Convert runbook steps into executable scripts. `npm run runbook:step:03`.
- **Cost/Impact/Risk:** 3/6/1

### D15. Emergency Flatten Script
- **Mechanism:** `npm run emergency:flatten` — cancel all orders, close all positions, write evidence.
- **Cost/Impact/Risk:** 3/9/1

---

## EXTENDED UPGRADES (E01-E50)

### E01. Shadow Mode Execution (live data, paper orders)
### E02. Risk-Adjusted Allocation Optimizer
### E03. Correlation Monitor Between Strategies
### E04. Market Impact Model Calibration
### E05. Dynamic Slippage from Tick Data
### E06. Funding Rate Prediction Model
### E07. Multi-Exchange Arbitrage Detection
### E08. Order Type Optimization (limit vs market)
### E09. Fill Simulation from L2 Orderbook
### E10. Adverse Selection Detection
### E11. Strategy Decay Detection
### E12. Alpha Half-Life Estimation
### E13. Regime Transition Alerting
### E14. Intraday Seasonality Model
### E15. Cross-Asset Correlation Hedging
### E16. Kelly Criterion Position Sizing
### E17. Drawdown Duration Tracking
### E18. Profit Factor Decomposition
### E19. Tail Risk Monitoring (CVaR)
### E20. Strategy Capacity Estimation
### E21. Automated Hyperparameter Search
### E22. Feature Importance via Permutation
### E23. Data Quality Scoring per Source
### E24. Latency Budget per Component
### E25. Memory Budget per Module
### E26. Test Mutation Score
### E27. Code Complexity Budget
### E28. Semantic Versioning for Contracts
### E29. Rollback Protocol (per epoch)
### E30. Blue-Green Deploy for Strategy Updates
### E31. Canary Deploy (2% traffic to new strategy)
### E32. A/B Testing Framework for Strategies
### E33. Execution Venue Selection
### E34. Smart Order Routing
### E35. Iceberg Order Implementation
### E36. TWAP/VWAP Execution Algorithms
### E37. Post-Trade Analysis Pipeline
### E38. Trade Journal Generator
### E39. Performance Attribution by Factor
### E40. Risk Factor Model (beta, momentum, vol)
### E41. Stress Test Suite (historical crises)
### E42. Liquidity Score per Instrument
### E43. Cross-Margin Optimization
### E44. Funding Rate Arbitrage
### E45. Basis Trading Support
### E46. Options Greeks for Position Hedging
### E47. Sentiment Integration (with network unlock)
### E48. On-Chain Data Integration (with network unlock)
### E49. Machine Learning Signal Ensemble
### E50. Reinforcement Learning Execution Agent

---

## ИТОГО

| Ветка | Количество | Фокус |
|-------|-----------|-------|
| A (Reliability) | 15 | Zero-surprise operations |
| B (Profit) | 15 | Realistic P&L pipeline |
| C (Speed) | 10 | Faster verification |
| D (Cross-cutting) | 15 | Infrastructure improvements |
| E (Extended) | 50 | Future research directions |
| **TOTAL** | **105** | |
