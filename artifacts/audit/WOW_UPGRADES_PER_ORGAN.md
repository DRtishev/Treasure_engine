# WOW_UPGRADES_PER_ORGAN.md — 10 решений на каждый орган

---

## O1: Policy Kernel & Modes

### W1.1 — Mode Transition Proof Chain
- **Mechanism:** Каждый переход режима (CERT→RESEARCH→ACQUIRE) пишет signed receipt в EventBus с prev_mode, new_mode, guard_result, timestamp_tick
- **Why:** Невозможно доказать что система была в правильном режиме в момент действия
- **Minimal:** writeMd receipt при каждом вызове mode_fsm.transition()
- **Radical:** Cryptographic receipt chain (sha256 prev_receipt → current)
- **Gates:** regression_mode_transition01: assert receipt exists after every transition
- **Evidence:** reports/evidence/EXECUTOR/MODE_TRANSITION_LOG.md
- **Risk:** Overhead на каждый transition (~1ms)
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W1.2 — Policy Kernel Schema Validation
- **Mechanism:** AJV-validate specs/policy_kernel.json при каждом boot + regression gate
- **Why:** Дрейф kernel schema незаметен до runtime failure
- **Minimal:** Gate в verify:fast: load + validate policy_kernel.json
- **Radical:** Auto-generate TypeScript types из schema
- **Gates:** regression_policy_kernel01_schema_valid
- **Evidence:** gates/manual/policy_kernel_validation.json
- **Risk:** Schema evolution needs migration protocol
- **Cost:** 2 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W1.3 — CERT Mode Proof-of-Isolation
- **Mechanism:** При boot в CERT: проверить что TREASURE_NET_KILL=1 в env, нет ALLOW_NETWORK, нет open sockets
- **Why:** CERT mode claim без proof = театр безопасности
- **Minimal:** Добавить net isolation check в verify:fast
- **Radical:** eBPF-level network namespace isolation
- **Gates:** regression_cert_isolation01
- **Evidence:** CERT_ISOLATION_PROOF.md
- **Risk:** eBPF requires root
- **Cost:** 2 / **Impact:** 9 / **Risk:** 2 / **Time:** 1 sprint

### W1.4 — Reason Code Auto-Completeness Check
- **Mechanism:** Scan all .mjs files for reason_code assignments, cross-check against specs/reason_code_taxonomy.json
- **Why:** Undocumented reason codes break operator understanding
- **Minimal:** Script that diffs used vs documented codes
- **Radical:** CI gate that fails on undocumented reason_code
- **Gates:** regression_reason_completeness01
- **Evidence:** REASON_CODE_AUDIT.md
- **Risk:** False positives on test/fixture codes
- **Cost:** 3 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W1.5 — Double-Key Audit Trail
- **Mechanism:** Log every ALLOW_NETWORK creation/deletion with tick, actor, duration
- **Why:** Network unlock без audit = blind spot
- **Minimal:** net_unlock.mjs и net_lock.mjs уже пишут receipts; добавить duration tracking
- **Radical:** Time-boxed auto-lock (max 5 min) с alarm если не locked
- **Gates:** regression_net_unlock_audit01
- **Evidence:** NET_UNLOCK_AUDIT_TRAIL.md
- **Risk:** Auto-lock может прервать длинный acquire
- **Cost:** 2 / **Impact:** 7 / **Risk:** 3 / **Time:** 1 sprint

### W1.6 — Mode Invariant Assertion Library
- **Mechanism:** assertCertMode(), assertResearchMode() — compile-time-like guards в начале каждого script
- **Why:** Script запущенный в неправильном режиме = silent corruption
- **Minimal:** Библиотека 5 assert-функций + integration в top-10 scripts
- **Radical:** ESLint rule: require mode assertion in every scripts/ops/*.mjs
- **Gates:** regression_mode_assert01
- **Evidence:** MODE_ASSERT_COVERAGE.md
- **Risk:** Over-assertion = friction
- **Cost:** 3 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W1.7 — Policy Kernel Diff-on-Epoch
- **Mechanism:** Каждый epoch seal фиксирует hash policy_kernel.json; diff показывает что изменилось
- **Why:** Policy drift между epochs незаметен
- **Minimal:** sha256 policy_kernel.json в epoch evidence
- **Radical:** Structured diff (added/removed/changed rules) в EPOCH verdict
- **Gates:** regression_policy_drift01
- **Evidence:** POLICY_KERNEL_HASH_LEDGER.md
- **Risk:** Hash change on whitespace = false alarm
- **Cost:** 2 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W1.8 — Emergency Mode Override Protocol
- **Mechanism:** CERT-EMERGENCY mode: skip all gates, log everything, require manual review after
- **Why:** В реальной аварии нужен escape hatch с audit trail
- **Minimal:** Документ EMERGENCY_PROTOCOL.md + marker file
- **Radical:** FSM state EMERGENCY с compensation при выходе
- **Gates:** regression_emergency01_requires_review
- **Evidence:** EMERGENCY_LOG.md
- **Risk:** Злоупотребление emergency mode
- **Cost:** 4 / **Impact:** 7 / **Risk:** 4 / **Time:** 2 sprint

### W1.9 — Rule Enforcement Coverage Map
- **Mechanism:** Для каждого из 14 правил (R1-R14) в AGENTS.md — список gates которые его enforce
- **Why:** Правило без enforcement = декларация
- **Minimal:** Markdown таблица rule → gate mapping
- **Radical:** Automated coverage: scan AGENTS.md rules, match to regression gates
- **Gates:** regression_rule_coverage01
- **Evidence:** RULE_ENFORCEMENT_MATRIX.md
- **Risk:** Mapping может быть неточным
- **Cost:** 3 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W1.10 — Mode-Aware Script Permissions
- **Mechanism:** Каждый script декларирует required_mode в header comment; gate проверяет при запуске
- **Why:** ops:doctor в ACQUIRE mode = потенциально опасно
- **Minimal:** Header convention + gate scanner
- **Radical:** Script launcher wrapper с mode enforcement
- **Gates:** regression_script_mode01
- **Evidence:** SCRIPT_MODE_MATRIX.md
- **Risk:** Legacy scripts без headers = migration effort
- **Cost:** 4 / **Impact:** 5 / **Risk:** 3 / **Time:** 2 sprint

---

## O2: SAN / Zone-Aware Scanners

### W2.1 — Graduated Forbidden API Scanner
- **Mechanism:** Три зоны: CRITICAL (eval, Function), HIGH (Math.random, raw Date.now), MEDIUM (console.log в production)
- **Why:** Текущий san01 бинарный — need graduated severity
- **Minimal:** severity field в san01 output
- **Radical:** Per-zone enforcement с разными EC
- **Gates:** regression_san02_graduated_severity
- **Evidence:** SAN_ZONE_REPORT.md
- **Risk:** Zone classification disputes
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W2.2 — Import Graph Analyzer
- **Mechanism:** Static analysis: build import tree, detect circular deps, orphaned modules, network imports in offline zones
- **Why:** Circular/orphaned imports = hidden runtime risk
- **Minimal:** Script that builds import graph via regex, reports cycles
- **Radical:** Full AST parser (acorn) с zone tagging
- **Gates:** regression_import_graph01_no_cycles
- **Evidence:** IMPORT_GRAPH.md + IMPORT_GRAPH.json
- **Risk:** Dynamic imports evade static analysis
- **Cost:** 5 / **Impact:** 8 / **Risk:** 3 / **Time:** 2 sprint

### W2.3 — Network Call Inventory
- **Mechanism:** Exhaustive list: file:line → target URL/host → required mode → gate
- **Why:** 18+ files с network access; need complete inventory
- **Minimal:** Grep-based inventory → markdown table
- **Radical:** Runtime network call interceptor (proxy) с mode-aware blocking
- **Gates:** regression_net_inventory01_complete
- **Evidence:** NETWORK_CALL_INVENTORY.md
- **Risk:** WebSocket connections harder to track
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W2.4 — ctx.rng Migration Gate
- **Mechanism:** Scan core/ for Math.random(); fail if found outside test fixtures
- **Why:** 5 core files use Math.random() directly (FINDING-D)
- **Minimal:** Extend san01 to flag Math.random in core/ (not labs/tests)
- **Radical:** ESLint plugin no-math-random
- **Gates:** regression_san03_no_math_random_in_core
- **Evidence:** MATH_RANDOM_AUDIT.md
- **Risk:** Some uses are intentional (mock_exchange)
- **Cost:** 2 / **Impact:** 7 / **Risk:** 1 / **Time:** 1 sprint

### W2.5 — Date.now Injection Audit
- **Mechanism:** Scan for Date.now() без ctx.clock fallback; report all bare uses
- **Why:** 40+ bare Date.now() = 40 ND sources
- **Minimal:** Report listing all Date.now() without ctx.clock
- **Radical:** Monkey-patch Date.now in CERT mode to throw if called outside ctx.clock
- **Gates:** regression_san04_date_now_injected
- **Evidence:** DATE_NOW_AUDIT.md
- **Risk:** Breaking change for non-ctx code
- **Cost:** 4 / **Impact:** 8 / **Risk:** 4 / **Time:** 2 sprint

### W2.6 — eval/Function Constructor Ban
- **Mechanism:** Zero-tolerance gate для eval(), new Function(), vm.runInContext()
- **Why:** Code injection vector
- **Minimal:** san01 уже covers this; verify completeness
- **Radical:** CSP-like policy in Node.js (--disallow-code-generation-from-strings)
- **Gates:** regression_san05_no_eval
- **Evidence:** EVAL_BAN_PROOF.md
- **Risk:** Some deps may use eval internally
- **Cost:** 1 / **Impact:** 9 / **Risk:** 1 / **Time:** 1 sprint

### W2.7 — Dependency Source Verification
- **Mechanism:** npm audit + verify integrity checksums + known CVE scan
- **Why:** Supply chain attacks через npm deps
- **Minimal:** npm audit в verify:fast
- **Radical:** Vendored deps с pinned checksums
- **Gates:** regression_deps_audit01
- **Evidence:** DEPS_AUDIT.md
- **Risk:** 1 moderate vuln already exists
- **Cost:** 2 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W2.8 — fs.writeSync Scope Enforcement
- **Mechanism:** Runtime patch: intercept fs.write*, verify path is within write-scope
- **Why:** CERT write-scope (artifacts/**, reports/evidence/**) not runtime-enforced
- **Minimal:** Gate that scans code for fs.write outside scope
- **Radical:** Wrapper module core/sys/safe_fs.mjs with path validation
- **Gates:** regression_write_scope01_runtime
- **Evidence:** WRITE_SCOPE_AUDIT.md
- **Risk:** Performance overhead on every write
- **Cost:** 5 / **Impact:** 9 / **Risk:** 3 / **Time:** 2 sprint

### W2.9 — Environment Variable Inventory
- **Mechanism:** Complete list of env vars used: name → purpose → default → required mode
- **Why:** Undocumented env vars = hidden config surface
- **Minimal:** Grep process.env across codebase → table
- **Radical:** Centralized env config module with validation
- **Gates:** regression_env_inventory01
- **Evidence:** ENV_INVENTORY.md
- **Risk:** Dynamic env access patterns
- **Cost:** 2 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W2.10 — Prototype Pollution Guard
- **Mechanism:** Scan for __proto__, constructor.prototype, Object.assign с untrusted input
- **Why:** JSON.parse + property access = prototype pollution risk
- **Minimal:** Regex scan + report
- **Radical:** Object.freeze on critical configs
- **Gates:** regression_san06_no_proto_pollution
- **Evidence:** PROTO_POLLUTION_AUDIT.md
- **Risk:** False positives on legitimate property access
- **Cost:** 2 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

---

## O3: Verify Chain / Courts

### W3.1 — Court Wiring Fix (FINDING-B resolution)
- **Mechanism:** strategy_sweep.mjs вызывает runCandidatePipeline() вместо raw backtest+CT01
- **Why:** FINDING-B: courts orphaned, candidates bypass reality check
- **Minimal:** 1 import + 1 function call change in strategy_sweep.mjs
- **Radical:** Pipeline Orchestrator pattern (единый entry point)
- **Gates:** regression_court_wiring01, regression_court_wiring02
- **Evidence:** COURT_WIRING_PROOF.md
- **Risk:** Existing candidates need re-evaluation
- **Cost:** 3 / **Impact:** 10 / **Risk:** 3 / **Time:** Sprint 0

### W3.2 — Verify Chain Dependency Graph
- **Mechanism:** Graph of verify:fast → sub-gates с dependency ordering
- **Why:** Sequential chain = slow; parallel where possible = fast
- **Minimal:** Document current chain order
- **Radical:** DAG-based parallel execution where no dependencies
- **Gates:** regression_verify_dag01_no_cycles
- **Evidence:** VERIFY_CHAIN_DAG.md
- **Risk:** Parallel execution may expose hidden deps
- **Cost:** 5 / **Impact:** 6 / **Risk:** 4 / **Time:** 2 sprint

### W3.3 — Court Verdict Normalization
- **Mechanism:** All 7 courts output identical verdict schema: {court_id, verdict, score, detail, evidence_path}
- **Why:** Different courts have different output formats → harder to aggregate
- **Minimal:** Adapter layer in pipeline.mjs
- **Radical:** Shared Court interface class
- **Gates:** regression_court_schema01
- **Evidence:** COURT_VERDICT_SCHEMA.md
- **Risk:** Breaking changes in court implementations
- **Cost:** 3 / **Impact:** 7 / **Risk:** 3 / **Time:** 1 sprint

### W3.4 — Flake Detector (cross-run diff)
- **Mechanism:** Compare outputs of run1 vs run2; any diff = FLAKE, auto-investigate
- **Why:** x2 anti-flake only catches EC diff, not output diff
- **Minimal:** Hash output files, compare
- **Radical:** Structured diff с pinpoint where divergence occurred
- **Gates:** regression_flake_detector01
- **Evidence:** FLAKE_REPORT.md
- **Risk:** Large output diffs from timestamps
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W3.5 — Gate Execution Time Budget
- **Mechanism:** Each gate has max_ms budget; exceeding = WARNING
- **Why:** Verify:fast must stay fast; creeping gates slow dev loop
- **Minimal:** Performance timing wrapper per gate
- **Radical:** Auto-move slow gates из verify:fast в verify:mega
- **Gates:** regression_gate_budget01
- **Evidence:** GATE_TIMING.md
- **Risk:** Timing varies by machine
- **Cost:** 3 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W3.6 — Gate Result Cache (deterministic)
- **Mechanism:** If input files unchanged (by hash) → reuse prev gate result
- **Why:** Re-running 340 gates on unchanged code = waste
- **Minimal:** Hash-based cache for pure-read gates
- **Radical:** Incremental verification (only re-run gates whose inputs changed)
- **Gates:** regression_cache_integrity01
- **Evidence:** GATE_CACHE_STATS.md
- **Risk:** Stale cache on env changes
- **Cost:** 5 / **Impact:** 6 / **Risk:** 4 / **Time:** 2 sprint

### W3.7 — Court Threshold Registry
- **Mechanism:** All court thresholds in single SSOT file, not hardcoded in each court
- **Why:** Thresholds scattered across 7 courts + graduation_court = maintenance hell
- **Minimal:** specs/court_thresholds.json
- **Radical:** Threshold profiles (conservative, moderate, aggressive) selectable per candidate
- **Gates:** regression_threshold_ssot01
- **Evidence:** COURT_THRESHOLDS.md
- **Risk:** Some thresholds are context-dependent
- **Cost:** 3 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W3.8 — Regression Gate Generator
- **Mechanism:** Template-based generator: `edge:next-regression <gate_id> <assertion>` → full .mjs
- **Why:** 170+ regression gates have boilerplate; new ones should be instant to create
- **Minimal:** Shell script with template substitution
- **Radical:** Interactive generator с AST-aware assertion
- **Gates:** self-validating (generated gate must pass)
- **Evidence:** GENERATOR_USAGE_LOG.md
- **Risk:** Templates drift from conventions
- **Cost:** 3 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W3.9 — Chaos Court (adversarial verdict injection)
- **Mechanism:** Chaos test: inject fake PASS verdicts, verify system detects/rejects
- **Why:** Court verdicts could be fabricated if not integrity-checked
- **Minimal:** chaos:court_tamper script
- **Radical:** Signed verdicts with court-specific keys
- **Gates:** regression_chaos_court01
- **Evidence:** CHAOS_COURT_RESULT.md
- **Risk:** Signed verdicts add complexity
- **Cost:** 4 / **Impact:** 8 / **Risk:** 3 / **Time:** 2 sprint

### W3.10 — Verify Health Dashboard
- **Mechanism:** HTML/MD dashboard: all gates, last run status, trend (flaky/stable)
- **Why:** 340 gates hard to reason about; need overview
- **Minimal:** MD table auto-generated from gate results
- **Radical:** Live dashboard (simple HTTP server in ops:cockpit)
- **Gates:** self-descriptive
- **Evidence:** VERIFY_DASHBOARD.md
- **Risk:** Dashboard becomes stale if not auto-generated
- **Cost:** 3 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

---

## O4: Evidence / Canon / Fingerprints

### W4.1 — Evidence Integrity Chain (Merkle tree)
- **Mechanism:** Hash each evidence file → build Merkle tree → root hash = epoch seal
- **Why:** Individual hashes can be tampered; Merkle proves completeness
- **Minimal:** sha256 of all evidence files sorted → root hash
- **Radical:** Full Merkle tree with proof-of-inclusion for any artifact
- **Gates:** regression_merkle01_root_stable
- **Cost:** 3 / **Impact:** 9 / **Risk:** 2 / **Time:** 1 sprint

### W4.2 — Canon Normalization Audit
- **Mechanism:** Verify all JSON through canonicalize.mjs; diff raw vs canonical
- **Why:** Non-canonical JSON breaks determinism
- **Minimal:** Gate: load all .json in evidence, canonicalize, assert no diff
- **Radical:** Pre-commit hook that auto-canonicalizes
- **Cost:** 2 / **Impact:** 7 / **Risk:** 1 / **Time:** 1 sprint

### W4.3 — Evidence Retention Policy
- **Mechanism:** Max N epochs retained; older auto-archived
- **Why:** Evidence accumulation → repo bloat
- **Minimal:** Document retention policy
- **Radical:** Auto-archive script
- **Cost:** 2 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W4.4 — Fingerprint Registry
- **Mechanism:** Registry: file → sha256 → epoch_added → last_verified
- **Why:** Which files are golden/frozen vs mutable unclear
- **Minimal:** FINGERPRINT_REGISTRY.json
- **Radical:** Auto-update on verify:fast
- **Cost:** 3 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W4.5 — Evidence Schema Enforcement
- **Mechanism:** Every evidence file must match schema from FORMAT_POLICY.md
- **Why:** Format policy exists but enforcement is manual
- **Minimal:** Gate: validate evidence files against policy
- **Radical:** Write-time validation in writeMd/writeJsonDeterministic
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W4.6 — Tamper Detection Gate
- **Mechanism:** Compare stored checksums vs computed; flag any mismatch
- **Why:** chaos:evidence_tamper exists but is a test, not continuous guard
- **Minimal:** Checksum verification in verify:fast
- **Radical:** File system watcher with alert
- **Cost:** 2 / **Impact:** 8 / **Risk:** 1 / **Time:** 1 sprint

### W4.7 — Evidence Completeness Matrix
- **Mechanism:** For each epoch: list required artifacts, mark present/missing
- **Why:** Partial evidence = false confidence
- **Minimal:** Script that checks required set per epoch
- **Radical:** Gate in epoch seal
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W4.8 — Golden Vector Auto-Regression
- **Mechanism:** Golden vectors (specs/truth/GOLDEN_VECTORS.md) auto-tested on every verify
- **Why:** Golden vectors may drift from implementation
- **Minimal:** Gate that runs golden vector assertions
- **Radical:** Property-based testing from golden vectors
- **Cost:** 3 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W4.9 — Evidence Diff Between Epochs
- **Mechanism:** Structured diff: what evidence changed between epoch N and N+1
- **Why:** Understanding progression requires diffing
- **Minimal:** Script: diff evidence dirs between epochs
- **Radical:** Visual timeline of evidence evolution
- **Cost:** 3 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W4.10 — Portable Evidence Pack
- **Mechanism:** One command → tar.gz with all evidence for external audit
- **Why:** External auditors need portable evidence
- **Minimal:** edge:evidence:pack script
- **Radical:** Self-validating pack (includes verify script)
- **Cost:** 2 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

---

## O5: Doctor OS / Health Button

### W5.1 — Doctor Differential Diagnosis
- **Mechanism:** Doctor identifies WHAT failed, WHERE, and suggests fix
- **Why:** Current doctor says PASS/FAIL but not WHY
- **Minimal:** Error categorization in doctor output
- **Radical:** Auto-heal for known failures
- **Cost:** 4 / **Impact:** 8 / **Risk:** 3 / **Time:** 2 sprint

### W5.2 — Doctor History Ledger
- **Mechanism:** Append-only log of all doctor runs: tick, status, failed_gates, duration
- **Why:** Trend analysis: is health improving or degrading?
- **Minimal:** JSONL append in doctor.mjs
- **Radical:** Trend chart in cockpit
- **Cost:** 2 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W5.3 — Doctor Self-Test
- **Mechanism:** Doctor runs known-bad fixture → must detect failure
- **Why:** Doctor that passes on broken code = false confidence
- **Minimal:** Chaos injection in doctor flow
- **Radical:** Continuous doctor self-validation
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W5.4 — One-Button Health (ops:health)
- **Mechanism:** Single command: doctor + cockpit + summary verdict
- **Why:** Operator needs ONE command, not three
- **Minimal:** Shell alias or npm script
- **Radical:** Interactive TUI with health overview
- **Cost:** 1 / **Impact:** 7 / **Risk:** 1 / **Time:** 1 sprint

### W5.5 — Doctor Parallelization
- **Mechanism:** Independent doctor checks run in parallel
- **Why:** Sequential doctor is slow
- **Minimal:** Promise.all for independent checks
- **Radical:** Worker threads
- **Cost:** 4 / **Impact:** 5 / **Risk:** 3 / **Time:** 1 sprint

### W5.6 — Doctor Baseline Freshness Check
- **Mechanism:** baseline:restore includes freshness assertion (baseline not older than N days)
- **Why:** Stale baseline = stale doctor
- **Minimal:** Timestamp check on baseline files
- **Radical:** Auto-regenerate baseline if stale
- **Cost:** 2 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W5.7 — Doctor Confidence Score
- **Mechanism:** 0-100 score based on gates passed / total gates
- **Why:** Binary PASS/FAIL insufficient for nuanced health
- **Minimal:** Simple percentage
- **Radical:** Weighted score by gate severity
- **Cost:** 2 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W5.8 — Doctor Canary (degradation detection)
- **Mechanism:** Compare current health score to historical average; alert on degradation
- **Why:** Slow degradation invisible without baseline comparison
- **Minimal:** Compare to last 5 doctor runs
- **Radical:** Statistical anomaly detection
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W5.9 — Doctor Recovery Recipes
- **Mechanism:** For each known failure: documented recovery recipe (command + expected outcome)
- **Why:** Operator needs action, not diagnosis
- **Minimal:** RECOVERY_RECIPES.md
- **Radical:** Auto-execute recipe with confirmation
- **Cost:** 2 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W5.10 — Doctor Evidence Snapshot
- **Mechanism:** Doctor saves full state snapshot (file hashes, env vars, node -v) with each run
- **Why:** Reproducibility of doctor results
- **Minimal:** Snapshot in doctor output
- **Radical:** Diff between doctor runs
- **Cost:** 2 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

---

## O6: Cockpit / Operator HUD

### W6.1 — Cockpit Real-Time Refresh
- **Mechanism:** Cockpit auto-refreshes on EventBus changes
- **Why:** Static HUD = operator must re-run manually
- **Minimal:** File watcher on EVENTS.jsonl
- **Radical:** Terminal dashboard (blessed-contrib)
- **Cost:** 4 / **Impact:** 6 / **Risk:** 3 / **Time:** 2 sprint

### W6.2 — Cockpit Alert Thresholds
- **Mechanism:** Configurable thresholds for each HUD metric; color-coded status
- **Why:** Operator can't scan 10 metrics quickly
- **Minimal:** RED/YELLOW/GREEN status per metric
- **Radical:** Configurable alert rules
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W6.3 — Cockpit History Timeline
- **Mechanism:** Show last N cockpit snapshots as timeline
- **Why:** Point-in-time vs trend understanding
- **Minimal:** Last 5 HUD.json diffs
- **Radical:** ASCII sparkline per metric
- **Cost:** 3 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W6.4 — Cockpit ONE_NEXT_ACTION Prominence
- **Mechanism:** ONE_NEXT_ACTION always first line, largest font, impossible to miss
- **Why:** Operator must know THE ONE thing to do
- **Minimal:** Move to top of HUD.md
- **Radical:** Separate ONE_NEXT_ACTION.md auto-updated
- **Cost:** 1 / **Impact:** 8 / **Risk:** 1 / **Time:** 1 sprint

### W6.5 — Cockpit Candidate Dashboard
- **Mechanism:** Per-candidate: FSM state, court verdicts, metrics summary
- **Why:** Candidate visibility is essential for operator decisions
- **Minimal:** Table in HUD.md from registry
- **Radical:** Per-candidate detail view
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W6.6 — Cockpit Network Status Indicator
- **Mechanism:** CERT/ONLINE status + last network event time
- **Why:** Operator must know network posture instantly
- **Minimal:** Line in HUD.md
- **Radical:** Visual indicator (lock icon)
- **Cost:** 1 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W6.7 — Cockpit FSM State Visualization
- **Mechanism:** ASCII FSM state diagram with current state highlighted
- **Why:** FSM state transitions hard to reason about from text
- **Minimal:** Pre-rendered ASCII diagrams per state
- **Radical:** Dynamic generation from fsm_kernel.json
- **Cost:** 3 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W6.8 — Cockpit Evidence Staleness Warning
- **Mechanism:** Flag evidence older than N ticks as STALE
- **Why:** Old evidence may not reflect current state
- **Minimal:** Age check in cockpit
- **Radical:** Auto-trigger re-evaluation
- **Cost:** 2 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W6.9 — Cockpit Mode Transition History
- **Mechanism:** Show last N mode transitions with timestamp
- **Why:** "How did we get here?" question
- **Minimal:** Read from EventBus MODE_TRANSITION events
- **Radical:** Animated timeline
- **Cost:** 2 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W6.10 — Cockpit Export (PDF/HTML)
- **Mechanism:** Export current HUD as portable document
- **Why:** Share health status with stakeholders
- **Minimal:** MD → HTML converter
- **Radical:** Branded PDF report
- **Cost:** 3 / **Impact:** 4 / **Risk:** 1 / **Time:** 1 sprint

---

## O7: Nervous System / FSM Brain

### W7.1 — FSM Transition Proof Receipt
- **Mechanism:** Every FSM transition writes receipt: {from, to, guard_result, action_result, tick}
- **Why:** Transition audit trail for forensics
- **Minimal:** Receipt in state_manager.mjs
- **Radical:** Signed receipt chain
- **Cost:** 2 / **Impact:** 8 / **Risk:** 1 / **Time:** 1 sprint

### W7.2 — FSM Guard Purity Enforcement
- **Mechanism:** Guards must be pure (no side effects); test by running guard twice, assert same result
- **Why:** Impure guard = non-deterministic transitions
- **Minimal:** x2 guard execution in fsm_guards.mjs
- **Radical:** Static analysis for side effects
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W7.3 — FSM Deadlock Detection
- **Mechanism:** If FSM stays in same state for N ticks without progress → DEADLOCK alert
- **Why:** Silent deadlock = system appears healthy but stuck
- **Minimal:** Tick counter per state
- **Radical:** Automatic escalation + healing
- **Cost:** 3 / **Impact:** 9 / **Risk:** 2 / **Time:** 1 sprint

### W7.4 — FSM Compensation Completeness
- **Mechanism:** Every transition must have compensation defined; gate verifies
- **Why:** Failed transition without compensation = corrupt state
- **Minimal:** Gate: for each transition in kernel, assert compensation exists
- **Radical:** Auto-generate compensation stubs
- **Cost:** 2 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W7.5 — Event Bus Schema Evolution
- **Mechanism:** Schema version in each event; migration path for old events
- **Why:** Schema changes break replay
- **Minimal:** Version field in event_schema_v1
- **Radical:** Auto-migration on replay
- **Cost:** 3 / **Impact:** 6 / **Risk:** 3 / **Time:** 2 sprint

### W7.6 — FSM Replay Regression Gate
- **Mechanism:** Replay full event log → assert final state matches live state
- **Why:** Replay divergence = state corruption
- **Minimal:** Gate in verify:fast (replay + compare)
- **Radical:** Continuous replay validation
- **Cost:** 3 / **Impact:** 9 / **Risk:** 2 / **Time:** 1 sprint

### W7.7 — Proprioception Health Signal
- **Mechanism:** proprioception.mjs outputs structured health signal consumed by cockpit
- **Why:** Self-awareness without action = useless
- **Minimal:** Structured output format
- **Radical:** Auto-trigger healing based on proprioception
- **Cost:** 2 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W7.8 — FSM Goal-Seeker
- **Mechanism:** FSM knows target state (e.g., CERTIFIED); plans path and executes transitions
- **Why:** Manual FSM driving = operator burden
- **Minimal:** Path planner from current → target
- **Radical:** Auto-execute path with confirmation
- **Cost:** 5 / **Impact:** 8 / **Risk:** 4 / **Time:** 2 sprint

### W7.9 — EventBus Compaction
- **Mechanism:** Archive old events, keep recent N; replay uses archive for full history
- **Why:** EVENTS.jsonl grows unbounded
- **Minimal:** Rotation script
- **Radical:** Tiered storage (hot/cold)
- **Cost:** 3 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W7.10 — FSM Visualization & Simulation
- **Mechanism:** Simulate transitions from any state to test guards/actions
- **Why:** Manual testing of FSM transitions is tedious
- **Minimal:** CLI simulator: `ops:fsm:sim --from BOOT --to LIFE`
- **Radical:** Interactive graph explorer
- **Cost:** 4 / **Impact:** 6 / **Risk:** 2 / **Time:** 2 sprint

---

## O8: Backtest Organ

### W8.1 — Unified Sharpe Enforcement (FINDING-C fix #1)
- **Mechanism:** All Sharpe calculations MUST import from unified_sharpe.mjs; gate enforces
- **Why:** 5+ divergent Sharpe formulas across codebase
- **Minimal:** Regression gate: grep for inline sharpe calculations
- **Radical:** unified_sharpe.mjs exports ALL Sharpe variants (raw, annualized, deflated)
- **Gates:** regression_sharpe_ssot01
- **Cost:** 3 / **Impact:** 10 / **Risk:** 2 / **Time:** Sprint 1

### W8.2 — Backtest Fixture Auto-Generation
- **Mechanism:** Deterministic fixture generation from seed; reproducible across runs
- **Why:** Manual fixtures = maintenance burden
- **Minimal:** Seed-based bar generator
- **Radical:** Multi-regime fixture generator (trending, ranging, volatile, quiet)
- **Cost:** 3 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W8.3 — Equity Curve Determinism Assertion
- **Mechanism:** Backtest produces equity_curve; x2 runs must produce identical curves
- **Why:** e108 checks EC but doesn't deep-compare equity curves
- **Minimal:** sha256 of JSON-canonicalized equity_curve
- **Radical:** Per-bar assertion (every bar's equity must match)
- **Cost:** 2 / **Impact:** 8 / **Risk:** 1 / **Time:** 1 sprint

### W8.4 — No-Lookahead Enforcement
- **Mechanism:** e108_no_lookahead_contract.mjs as mandatory gate before BACKTESTED
- **Why:** Lookahead bias = fake performance
- **Minimal:** Already exists; ensure it's in critical path
- **Radical:** Static analysis for future-data access patterns
- **Cost:** 2 / **Impact:** 10 / **Risk:** 1 / **Time:** 1 sprint

### W8.5 — Backtest Cost Model Realism
- **Mechanism:** Configurable fee model: exchange fees, slippage, market impact
- **Why:** Default fee model may not match reality
- **Minimal:** Fee/slippage parameters in backtest config
- **Radical:** Calibrated from real fill data (paper/live)
- **Cost:** 4 / **Impact:** 8 / **Risk:** 3 / **Time:** 2 sprint

### W8.6 — Walk-Forward Optimization Integration
- **Mechanism:** WFO as mandatory step before BACKTESTED (not optional)
- **Why:** In-sample-only backtest = overfit risk
- **Minimal:** WFO step in candidate_pipeline
- **Radical:** Multi-window WFO with statistical tests
- **Cost:** 4 / **Impact:** 9 / **Risk:** 3 / **Time:** 2 sprint

### W8.7 — Backtest Ledger Immutability
- **Mechanism:** Ledger sealed after backtest; any modification = FAIL
- **Why:** Post-hoc ledger modification = evidence tampering
- **Minimal:** sha256 seal after backtest completes
- **Radical:** Append-only ledger with checkpointing
- **Cost:** 2 / **Impact:** 7 / **Risk:** 1 / **Time:** 1 sprint

### W8.8 — Multi-Asset Backtest Support
- **Mechanism:** Backtest engine supports multiple symbols simultaneously
- **Why:** Portfolio strategies need multi-asset backtesting
- **Minimal:** Array of symbols in config
- **Radical:** Cross-asset correlation modeling
- **Cost:** 6 / **Impact:** 7 / **Risk:** 4 / **Time:** 3 sprint

### W8.9 — Backtest Performance Profiling
- **Mechanism:** Per-phase timing: data load, signal gen, execution, metrics
- **Why:** Backtest speed optimization requires profiling
- **Minimal:** console.time/timeEnd per phase
- **Radical:** Flamegraph integration
- **Cost:** 2 / **Impact:** 4 / **Risk:** 1 / **Time:** 1 sprint

### W8.10 — Backtest Result Comparison Tool
- **Mechanism:** Diff two backtest results: metrics delta, equity curve overlay
- **Why:** Before/after comparison essential for strategy improvement
- **Minimal:** MD diff report
- **Radical:** Visual overlay chart
- **Cost:** 3 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

---

## O9: Edge Lab Courts

### W9.1 — Court Pipeline Wiring (FINDING-B operational fix)
- **Mechanism:** strategy_sweep.mjs → runCandidatePipeline() → all 7 courts
- **Why:** Courts orphaned (see FINDING-B detailed analysis)
- **Minimal:** Wire import + call in strategy_sweep.mjs
- **Radical:** Court results required for any FSM transition past DRAFT
- **Cost:** 3 / **Impact:** 10 / **Risk:** 3 / **Time:** Sprint 0

### W9.2 — Deflated Sharpe as Mandatory Gate
- **Mechanism:** Overfit court's deflated_sharpe must exceed threshold for BACKTESTED
- **Why:** Raw Sharpe inflated by data mining; deflated Sharpe corrects
- **Minimal:** Threshold check in guard_backtest_pass
- **Radical:** Auto-reject if deflated/raw ratio < 0.5
- **Cost:** 2 / **Impact:** 9 / **Risk:** 2 / **Time:** 1 sprint

### W9.3 — Bootstrap Confidence Intervals
- **Mechanism:** Bootstrap N=1000 resamplings of trade returns → CI for Sharpe
- **Why:** Point estimate Sharpe unreliable; CI shows confidence
- **Minimal:** Already in overfit_court; ensure results consumed
- **Radical:** Multi-metric bootstrap (Sharpe, Sortino, Calmar)
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W9.4 — Execution Sensitivity Court Enhancement
- **Mechanism:** Vary slippage/fees by ±50%; if Sharpe flips sign → FAIL
- **Why:** Brittle edge = fragile in reality
- **Minimal:** Parameter sweep in execution_sensitivity_court
- **Radical:** Monte Carlo fee simulation
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W9.5 — Red Team Court Scenarios Database
- **Mechanism:** Library of adversarial scenarios: flash crash, exchange outage, liquidity drain
- **Why:** Red team needs diverse scenarios
- **Minimal:** 10 scenario fixtures
- **Radical:** Generative adversarial scenario creation
- **Cost:** 4 / **Impact:** 7 / **Risk:** 2 / **Time:** 2 sprint

### W9.6 — Court Verdict Expiration
- **Mechanism:** Court verdicts expire after N ticks/epochs; re-evaluation required
- **Why:** Old verdicts may not reflect current market conditions
- **Minimal:** Timestamp + max_age in verdict
- **Radical:** Auto-trigger re-evaluation on expiry
- **Cost:** 2 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W9.7 — Cross-Court Correlation Analysis
- **Mechanism:** Detect when courts disagree (e.g., overfit=PASS but risk=FAIL)
- **Why:** Disagreement = signal for deeper investigation
- **Minimal:** Disagreement report in pipeline output
- **Radical:** Meta-court that resolves disagreements
- **Cost:** 3 / **Impact:** 6 / **Risk:** 2 / **Time:** 1 sprint

### W9.8 — Court Performance Calibration
- **Mechanism:** Track court predictions vs actual outcomes (paper/live)
- **Why:** Court that always passes = useless; calibration shows accuracy
- **Minimal:** Verdict vs outcome log
- **Radical:** Bayesian calibration update
- **Cost:** 5 / **Impact:** 9 / **Risk:** 3 / **Time:** 3 sprint

### W9.9 — SRE Court Production-Readiness
- **Mechanism:** SRE court checks: latency budget, error rate, recovery time
- **Why:** Strategy may perform well but be operationally fragile
- **Minimal:** Basic latency/error checks
- **Radical:** Full SLO/SLI compliance check
- **Cost:** 3 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W9.10 — Court Documentation Auto-Generation
- **Mechanism:** Each court exports metadata; auto-generate COURT_MANIFEST.md
- **Why:** Manual documentation drifts from implementation
- **Minimal:** Script to extract court names/thresholds → MD
- **Radical:** Generated documentation tested against implementation
- **Cost:** 2 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

---

## O10: Profit Lane

### W10.1 — Metric Parity Contract (FINDING-C resolution)
- **Mechanism:** core/metrics/metric_contract.mjs — единый schema для всех стадий
- **Why:** 5+ bifurcated metric calculations (see FINDING-C)
- **Minimal:** Required metric keys: sharpe, max_drawdown, pnl_usd, trade_count
- **Radical:** Adapter layer that normalizes any stage output to canonical schema
- **Cost:** 5 / **Impact:** 10 / **Risk:** 3 / **Time:** Sprint 1

### W10.2 — Paper→Live Reality Gap Monitor
- **Mechanism:** Continuous comparison: paper predictions vs live fills
- **Why:** Reality gap grows silently
- **Minimal:** core/obs/reality_gap_monitor.mjs (exists; ensure wired)
- **Radical:** Auto-pause if reality gap > threshold
- **Cost:** 3 / **Impact:** 9 / **Risk:** 2 / **Time:** 1 sprint

### W10.3 — Kill Switch Matrix
- **Mechanism:** Matrix: condition → action (pause/reduce/kill) with escalation
- **Why:** Multiple kill conditions need coordinated response
- **Minimal:** MD specification + basic implementation
- **Radical:** Auto-executing kill switch with hysteresis
- **Cost:** 4 / **Impact:** 10 / **Risk:** 3 / **Time:** 2 sprint

### W10.4 — Profit Ledger Cross-Validation
- **Mechanism:** Compare ledger PnL vs exchange PnL; flag discrepancies
- **Why:** Ledger drift from reality = false profit claims
- **Minimal:** Reconciliation script
- **Radical:** Continuous reconciliation in feed loop
- **Cost:** 3 / **Impact:** 9 / **Risk:** 2 / **Time:** 1 sprint

### W10.5 — Canary Real Drawdown
- **Mechanism:** Replace canary `drawdown_proxy: -pnl/10` with real HWM drawdown
- **Why:** Proxy is not a drawdown calculation at all
- **Minimal:** Import maxDrawdownFromCurve from paper_fitness_lab
- **Radical:** Unified drawdown function from metric_contract
- **Cost:** 2 / **Impact:** 8 / **Risk:** 1 / **Time:** Sprint 1

### W10.6 — Position Size Scaling Protocol
- **Mechanism:** Graduated: micro (0.1%) → small (1%) → normal (5%) with gate at each step
- **Why:** Full position too risky at paper→live transition
- **Minimal:** Risk governor config with tiers
- **Radical:** Auto-scaling based on confidence/variance
- **Cost:** 3 / **Impact:** 8 / **Risk:** 3 / **Time:** 2 sprint

### W10.7 — Profit Lane State Machine
- **Mechanism:** Formal FSM: OFFLINE → PAPER → MICRO_LIVE → LIVE_SMALL → LIVE
- **Why:** mode_fsm.mjs exists but doesn't enforce all gates
- **Minimal:** Guard functions for each transition
- **Radical:** Automated progression with evidence gates
- **Cost:** 4 / **Impact:** 8 / **Risk:** 3 / **Time:** 2 sprint

### W10.8 — Live Fill Reconciliation
- **Mechanism:** Every live fill: compare expected vs actual price/size/fees
- **Why:** Execution quality degrades silently
- **Minimal:** Per-fill slippage tracking
- **Radical:** Statistical slippage model with drift detection
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W10.9 — Profit Attribution
- **Mechanism:** Decompose PnL into: signal alpha, execution quality, market beta
- **Why:** Total PnL hides source of profit
- **Minimal:** Basic decomposition (gross − fees − slippage)
- **Radical:** Factor model attribution
- **Cost:** 5 / **Impact:** 7 / **Risk:** 3 / **Time:** 2 sprint

### W10.10 — Emergency Flatten Protocol
- **Mechanism:** One command to close all positions and go to OFFLINE
- **Why:** Emergency needs sub-second response
- **Minimal:** ops:emergency:flatten script
- **Radical:** Hardware kill switch (separate process monitoring)
- **Cost:** 3 / **Impact:** 10 / **Risk:** 2 / **Time:** 1 sprint

---

## O11: Supply Chain / Node Authority

### W11.1 — Package Lock Integrity Gate
- **Mechanism:** sha256 of package-lock.json in verify:fast; alert on unexpected changes
- **Why:** Lock file tampering = supply chain attack
- **Minimal:** Hash check gate
- **Radical:** Lock file in .gitattributes as binary (no auto-merge)
- **Cost:** 1 / **Impact:** 8 / **Risk:** 1 / **Time:** 1 sprint

### W11.2 — Vendored Dependencies
- **Mechanism:** All npm deps vendored in repo; npm install uses local cache only
- **Why:** npm install from network = supply chain risk
- **Minimal:** npm pack + local install
- **Radical:** Full offline mirror
- **Cost:** 4 / **Impact:** 9 / **Risk:** 2 / **Time:** 2 sprint

### W11.3 — Node Version Pinning Enforcement
- **Mechanism:** .node-version, .nvmrc, NODE_TRUTH.md all agree; gate verifies
- **Why:** Version mismatch = subtle runtime differences
- **Minimal:** Already exists (node_truth_gate); verify completeness
- **Radical:** nvm/fnm ban enforcement (already partially exists)
- **Cost:** 1 / **Impact:** 7 / **Risk:** 1 / **Time:** done

### W11.4 — npm Audit Auto-Run
- **Mechanism:** npm audit in verify:fast; block on critical/high severity
- **Why:** Known vuln in deps (1 moderate currently)
- **Minimal:** `npm audit --audit-level=high` gate
- **Radical:** Auto-patch with npm audit fix (reviewed)
- **Cost:** 1 / **Impact:** 7 / **Risk:** 2 / **Time:** 1 sprint

### W11.5 — Binary Reproducibility Proof
- **Mechanism:** Document exact steps to reproduce node binary from source
- **Why:** Binary trust requires reproducibility
- **Minimal:** Document in NODE_TRUTH.md
- **Radical:** Build from source in CI
- **Cost:** 3 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W11.6 — Toolchain Health Monitoring
- **Mechanism:** Periodic check: vendored node still matches expected sha256
- **Why:** Bit-rot or accidental modification
- **Minimal:** sha256 check in doctor
- **Radical:** Integrity check on every boot
- **Cost:** 1 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W11.7 — Dependency License Audit
- **Mechanism:** All deps must have compatible licenses (MIT/ISC/Apache-2.0)
- **Why:** License compliance
- **Minimal:** npm license checker script
- **Radical:** Automated license policy enforcement
- **Cost:** 1 / **Impact:** 4 / **Risk:** 1 / **Time:** 1 sprint

### W11.8 — Transitive Dependency Inventory
- **Mechanism:** Full tree of all transitive deps with versions
- **Why:** Hidden transitive deps = hidden risk
- **Minimal:** npm ls --all > DEPS_TREE.md
- **Radical:** Dependency graph visualization
- **Cost:** 1 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W11.9 — Node Feature Detection
- **Mechanism:** Verify all used Node.js features are stable (not experimental)
- **Why:** Experimental features may change/break
- **Minimal:** Grep for experimental flags
- **Radical:** Feature detection script
- **Cost:** 2 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W11.10 — Capsule Integrity (offline data packages)
- **Mechanism:** Each data capsule has sha256 + schema version + expiry
- **Why:** Stale/corrupt capsule = bad backtests
- **Minimal:** Checksum verification on capsule load
- **Radical:** Capsule validity gate in backtest pipeline
- **Cost:** 2 / **Impact:** 7 / **Risk:** 1 / **Time:** 1 sprint

---

## O12: Hygiene / PR Bloat Guard / Write-Scope Guard

### W12.1 — File Count Change Alert
- **Mechanism:** If PR adds >10 files or changes >50 files → WARNING
- **Why:** PR bloat = review impossible
- **Minimal:** Pre-commit hook with file count
- **Radical:** Auto-split large PRs
- **Cost:** 2 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W12.2 — Evidence File Size Limit
- **Mechanism:** No evidence file >1MB; no total evidence >100MB per epoch
- **Why:** Evidence bloat = git performance
- **Minimal:** Gate with size check
- **Radical:** Auto-archive large evidence
- **Cost:** 1 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint

### W12.3 — Orphaned File Detector
- **Mechanism:** Find files not imported by any other file
- **Why:** Orphaned files = confusion and bloat
- **Minimal:** Import graph → unreachable files report
- **Radical:** Auto-archive orphans
- **Cost:** 3 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W12.4 — Write-Scope Runtime Enforcement
- **Mechanism:** All writes go through safe_write() which validates path
- **Why:** CERT write-scope not runtime-enforced
- **Minimal:** Wrapper function with path validation
- **Radical:** fs.write interception
- **Cost:** 3 / **Impact:** 8 / **Risk:** 2 / **Time:** 1 sprint

### W12.5 — Churn Rate Monitor
- **Mechanism:** Track file change frequency; flag high-churn files
- **Why:** High churn = instability risk
- **Minimal:** Git log analysis → churn report
- **Radical:** Churn threshold gate
- **Cost:** 2 / **Impact:** 4 / **Risk:** 1 / **Time:** 1 sprint

### W12.6 — Dead Code Scanner
- **Mechanism:** Find exports not imported anywhere
- **Why:** Dead code = confusion and false test coverage
- **Minimal:** Export/import analysis script
- **Radical:** Automated dead code removal
- **Cost:** 3 / **Impact:** 5 / **Risk:** 2 / **Time:** 1 sprint

### W12.7 — TODO/FIXME Tracker
- **Mechanism:** Index all TODO/FIXME/HACK comments with file:line and create report
- **Why:** Tech debt visibility
- **Minimal:** Grep → report
- **Radical:** Linked to epoch sprints
- **Cost:** 1 / **Impact:** 4 / **Risk:** 1 / **Time:** 1 sprint

### W12.8 — Consistent Naming Convention Gate
- **Mechanism:** File names follow pattern: snake_case.mjs; violations flagged
- **Why:** Inconsistent naming = confusion
- **Minimal:** Regex check on new files
- **Radical:** Auto-rename tool
- **Cost:** 1 / **Impact:** 3 / **Risk:** 1 / **Time:** 1 sprint

### W12.9 — Git Hooks for Evidence Integrity
- **Mechanism:** Pre-commit hook: verify evidence files are canonical JSON/MD
- **Why:** Non-canonical evidence committed = format violation
- **Minimal:** Hook script
- **Radical:** Auto-format on commit
- **Cost:** 2 / **Impact:** 6 / **Risk:** 1 / **Time:** 1 sprint

### W12.10 — Repo Health Score
- **Mechanism:** Composite score: test coverage + churn + bloat + orphans + dead code
- **Why:** Single metric for repo quality
- **Minimal:** Script that computes score
- **Radical:** Dashboard in cockpit
- **Cost:** 3 / **Impact:** 5 / **Risk:** 1 / **Time:** 1 sprint
