# COMMANDS_RUN.md
STATUS: BLOCKED
REASON_CODE: EC01
NODE_VERSION: v22.22.0
NPM_VERSION: 10.9.4
RUN_ID: 7df4dc3a1062
VERIFY_MODE: GIT
NEXT_ACTION: npm run -s executor:run:chain
## STEP 1
COMMAND: npm run -s verify:env:authority
EC: 0
STARTED_AT: 2026-02-23T13:36:42.149Z
COMPLETED_AT: 2026-02-23T13:36:44.175Z
```
[PASS] env_node_truth_authority — NONE
```
## STEP 2
COMMAND: ENABLE_SQLITE_PERSISTENCE=0 TREASURE_OMIT_OPTIONAL_PROOF=1 npm ci --omit=optional
EC: 0
STARTED_AT: 2026-02-23T13:36:44.176Z
COMPLETED_AT: 2026-02-23T13:36:46.442Z
```
(no output)
## STEP 3
COMMAND: npm run -s p0:all
EC: 0
STARTED_AT: 2026-02-23T13:36:46.442Z
COMPLETED_AT: 2026-02-23T13:36:52.107Z
============================================================
CALM MODE P0 — Hardening Pipeline
RUN_ID: 7df4dc3a1062
============================================================

[P0] Running: CANON_SELFTEST — Canon normalization selftest (R10)
[canon_selftest] Running CANON_TEST_VECTORS...
  [PASS] Vector 1 (VOLATILE): Volatile generated_at timestamp
  [PASS] Vector 2 (VOLATILE): Volatile Started timestamp
  [PASS] Vector 3 (SEMANTIC): Semantic threshold line — must be unchanged
  [PASS] Vector 4 (SEMANTIC): Semantic drawdown line — must be unchanged
  [PASS] Vector 5 (BOUNDARY): Boundary non-volatile line without forbidden token
  [PASS] Vector 6 (VOLATILE): Volatile Completed with timestamp and ms timing
  [PASS] Vector 7 (D005_CATCH): D005 catch: semantic threshold line unchanged after normalization

[canon_selftest] Dual-hash demo (sha256_raw ≠ sha256_norm): true

[canon_selftest] Result: PASS (7/7 passed)
[PASS] canon_selftest
[P0 OK] CANON_SELFTEST: PASS

[P0] Running: DATA_COURT — Data source court (SINGLE_SOURCE_MODE)
[PASS] edge_data_court — NONE: Data court PASS: single source (no conflict detected). 1 evidence file(s) verified. SINGLE_SOURCE_MODE=true.
[P0 OK] DATA_COURT: PASS

[P0] Running: EVIDENCE_HASHES — Evidence checksums (R5 dual-hash + R11 SCOPE_MANIFEST_SHA)
[PASS] edge_evidence_hashes — 119 files hashed, SCOPE_MANIFEST_SHA=2dfccc092d7c304f...
[P0 OK] EVIDENCE_HASHES: PASS

[P0] Running: RECEIPTS_CHAIN — Receipt chain on sha256_norm (R5, R11)
[PASS] edge_receipts_chain — 119 entries chained, final=3595cdd84df9f082...
[P0 OK] RECEIPTS_CHAIN: PASS

============================================================
CALM MODE P0 GATE MATRIX
============================================================
  [PASS] CANON_SELFTEST
  [PASS] DATA_COURT
  [PASS] CHECKSUMS
  [PASS] RECEIPTS_CHAIN

FINAL: PASS
============================================================

[INFRA_RUN] NET_ISOLATION
============================================================
NET01 NETWORK ISOLATION PROOF
RUN_ID: 7df4dc3a1062
============================================================

============================================================
NET01 ISOLATION CHECKS
============================================================
  [PASS] C01_ENABLE_NET_OFF: ENABLE_NET not active — offline mode enforced
  [PASS] C02_LIVE_RISK_FLAG_OFF: Live risk flag not active — not in live trading mode
  [PASS] C03_NO_LIVE_API_KEYS: No live exchange API credentials found — cannot connect to live endpoints
  [PASS] C04_NODE_MODULES_PRESENT: node_modules present — npm ci completed from cache/local state, no network required
  [PASS] C05_LOCK_FILE_PRESENT: package-lock.json found — deterministic install spec locked
  [PASS] C06_VERIFY_MODE_OFFLINE: VERIFY_MODE=GIT — offline authority mode active

FINAL: PASS
============================================================

[PASS] net_isolation_proof — Network isolation proven for P0.

[INFRA_RUN] NODE_TRUTH
[PASS] node_truth_gate — Node v22.22.0 matches allowed_family=22

[INFRA_RUN] VERIFY_MODE
[PASS] verify_mode_gate — VERIFY_MODE=GIT, RUN_ID=7df4dc3a1062

[INFRA_RUN] DEPS_OFFLINE
[deps_offline] Running static lock scan for native build candidates...
[deps_offline] Lock scan complete: 1 native candidate(s) found
[deps_offline] Optional-native candidates: better-sqlite3
  - better-sqlite3@12.6.2: hasInstallScript=true, dep:prebuild-install
[deps_offline] Running install attempt 1/2 (closed-port registry)...
[deps_offline] Running install attempt 2/2 (closed-port registry)...
[PASS] deps_offline_install_contract — All dependencies satisfiable offline (no registry/network required). x2 runs consistent. Exit codes: [0, 0].

[INFRA_RUN] GOLDENS_APPLY
[PASS] goldens_apply_gate — 14 golden file(s) present and readable. Protocol file present. G001/G002 governance satisfied.

[INFRA_RUN] FORMAT_POLICY
[PASS] format_policy_gate — Format policy satisfied (strict scope). 7 new JSON file(s) verified. 11 legacy file(s) queued for schema_version migration.

[INFRA_RUN] FIXTURE_GUARD
============================================================
FG01 FIXTURE GUARD — Evidence Source Verification
RUN_ID: 7df4dc3a1062
ALLOW_FIXTURES: unset (REAL_ONLY mode)
============================================================

============================================================
FG01 FIXTURE GUARD RESULT
============================================================
  Files scanned: 23
  Violations: 0
  ALLOW_FIXTURES: unset
  Status: PASS
============================================================

[PASS] fixture_guard_gate — No fixture contamination in real evidence.

[INFRA_RUN] ZERO_WAR_PROBE
============================================================
ZW01 ZERO-WAR PROBE — Must-Fail Gate
RUN_ID: 7df4dc3a1062
============================================================

[ZW00 PROBE] Testing TRADING_ENABLED=1 ...
  [ZW00 OBSERVED] Process exited 1 with T000 detected — kill switch fired (expected).

[ZW00 PROBE] Testing LIVE_TRADING=1 ...
  [ZW00 OBSERVED] Process exited 1 with T000 detected — kill switch fired (expected).

[ZW00 PROBE] Testing ORDER_SUBMISSION_ENABLED=1 ...
  [ZW00 OBSERVED] Process exited 1 with T000 detected — kill switch fired (expected).
[ZW00 PROBE] Testing SUBMIT_ORDERS=1 ...
  [ZW00 OBSERVED] Process exited 1 with T000 detected — kill switch fired (expected).

============================================================
ZW00/ZW01 PROBE RESULTS
============================================================
  [ZW00] TRADING_ENABLED=1 (exit=1, T000=true)
  [ZW00] LIVE_TRADING=1 (exit=1, T000=true)
  [ZW00] ORDER_SUBMISSION_ENABLED=1 (exit=1, T000=true)
  [ZW00] SUBMIT_ORDERS=1 (exit=1, T000=true)

FINAL: PASS
============================================================

[PASS] zero_war_probe — ZW01 kill switch proven active for all 4 probes.
============================================================
INFRA P0 — Gate Suite
RUN_ID: 7df4dc3a1062
============================================================

============================================================
INFRA P0 GATE MATRIX
============================================================
  [PASS] NET_ISOLATION (blocker=true)
  [PASS] NODE_TRUTH (blocker=true)
  [PASS] VERIFY_MODE (blocker=true)
  [PASS] DEPS_OFFLINE (blocker=false)
  [PASS] GOLDENS_APPLY (blocker=true)
  [PASS] FORMAT_POLICY (blocker=true)
  [PASS] FIXTURE_GUARD (blocker=true)
  [PASS] ZERO_WAR_PROBE (blocker=true)

FINAL: PASS
ELIGIBLE_FOR_MICRO_LIVE: true
ELIGIBLE_FOR_EXECUTION: true
============================================================
## STEP 4
COMMAND: npm run -s gov:gov01
EC: 0
STARTED_AT: 2026-02-23T13:36:52.108Z
COMPLETED_AT: 2026-02-23T13:36:54.531Z
============================================================
GOV01 EVIDENCE INTEGRITY GATE
RUN_ID: 7df4dc3a1062
============================================================
[GOV01] Anchored SCOPE_MANIFEST_SHA: 2dfccc092d7c304f…
[GOV01] Anchored MERKLE_ROOT: 94c73b13d6599d5e…
[GOV01] Anchored RECEIPTS final: 3595cdd84df9f082…
[GOV01] Computed SCOPE_MANIFEST_SHA: 2dfccc092d7c304f…
[GOV01] Computed MERKLE_ROOT: 94c73b13d6599d5e…
[GOV01] Computed RECEIPTS final: 3595cdd84df9f082…

============================================================
GOV01 INTEGRITY RESULTS
============================================================
  [MATCH] C01_SCOPE_MANIFEST_SHA: MATCH — no tampering detected
  [MATCH] C02_MERKLE_ROOT: MATCH — no tampering detected
  [MATCH] C03_RECEIPTS_CHAIN_FINAL: MATCH — no tampering detected

FINAL: PASS
============================================================

[PASS] gov01_evidence_integrity — All anchored values match. Evidence integrity confirmed.
## STEP 5
COMMAND: npm run -s gov:integrity
EC: 0
STARTED_AT: 2026-02-23T13:36:54.532Z
COMPLETED_AT: 2026-02-23T13:36:57.585Z
============================================================
P1 GOVERNANCE INTEGRITY ORCHESTRATOR
RUN_ID: 7df4dc3a1062
============================================================

[GOV] Running: R_OP01_SCRIPTS_CHECK
============================================================
OP01 SCRIPTS CHECK — Phantom Command Prevention
RUN_ID: 7df4dc3a1062
============================================================

============================================================
OP01 SCRIPTS CHECK RESULT
============================================================
  [EXISTS] infra:p0 (EXECUTION_ORDER C1)
  [EXISTS] p0:all (EXECUTION_ORDER C2)
  [EXISTS] edge:calm:p0 (EXECUTION_ORDER C3 + CALM pipeline)
  [EXISTS] edge:calm:p0:x2 (EXECUTION_ORDER C4 + ANTI_FLAKE)
  [EXISTS] gov:integrity (EXECUTION_ORDER C5 + P1 orchestrator)
  [EXISTS] gov:merkle (P1_MERKLE_ROOT gate)
  [EXISTS] gov:gov01 (P1_GOV01_ENFORCEMENT gate)
  [EXISTS] verify:net:isolation (P0_NET_OFF gate (NET01))
  [EXISTS] verify:zero:war:probe (P0_ZERO_WAR_MUST_FAIL gate (ZW00/ZW01))
  [EXISTS] verify:fixture:guard (P0_FIXTURE_GUARD gate (FG01))
  [EXISTS] edge:micro:live:readiness (EXECUTION_ORDER step 6 + readiness gate)
  [EXISTS] edge:calm:canon:selftest (NEXT_ACTION in canon/GOV01 failures)
  [EXISTS] edge:calm:hashes (NEXT_ACTION in CHECKSUMS failures)

FINAL: PASS
============================================================

[PASS] op01_scripts_check — All required npm scripts exist.

[GOV] Running: P1_MERKLE_ROOT
============================================================
P1 MERKLE ROOT — Evidence Integrity Anchor
RUN_ID: 7df4dc3a1062
============================================================
[MERKLE] Files in scope: 119
[MERKLE] Files hashed: 119
[MERKLE] Files missing: 0
[MERKLE] Tree depth: 8
[MERKLE] Root: 94c73b13d6599d5ed1f20587e71853364ade6b8d1ef36b642aef9861608eb3f1
[MERKLE] SCOPE_MANIFEST_SHA: 2dfccc092d7c304f375b2e02364b97eb71379d70e4c340daabd4b88c701d2782

============================================================
P1 MERKLE ROOT RESULT
============================================================
  Root: 94c73b13d6599d5ed1f20587e71853364ade6b8d1ef36b642aef9861608eb3f1
  Files: 119/119 (0 missing)
  Depth: 8 levels
  Status: PASS
============================================================

[PASS] merkle_root — Merkle root anchored at 94c73b13d6599d5e…

[GOV] Running: P1_GOV01_ENFORCEMENT
============================================================
GOV01 EVIDENCE INTEGRITY GATE
RUN_ID: 7df4dc3a1062
============================================================
[GOV01] Anchored SCOPE_MANIFEST_SHA: 2dfccc092d7c304f…
[GOV01] Anchored MERKLE_ROOT: 94c73b13d6599d5e…
[GOV01] Anchored RECEIPTS final: 3595cdd84df9f082…
[GOV01] Computed SCOPE_MANIFEST_SHA: 2dfccc092d7c304f…
[GOV01] Computed MERKLE_ROOT: 94c73b13d6599d5e…
[GOV01] Computed RECEIPTS final: 3595cdd84df9f082…

============================================================
GOV01 INTEGRITY RESULTS
============================================================
  [MATCH] C01_SCOPE_MANIFEST_SHA: MATCH — no tampering detected
  [MATCH] C02_MERKLE_ROOT: MATCH — no tampering detected
  [MATCH] C03_RECEIPTS_CHAIN_FINAL: MATCH — no tampering detected

FINAL: PASS
============================================================

[PASS] gov01_evidence_integrity — All anchored values match. Evidence integrity confirmed.

[GOV] Running: R_REASON_CODE_AUDIT
============================================================
REASON CODE AUDIT — SSOT Collision Check
RUN_ID: 7df4dc3a1062
============================================================

============================================================
REASON CODE AUDIT RESULT
============================================================
  Files scanned: 34
  Hard violations: 0
  Unknown code warnings: 0
  Status: PASS
============================================================

[PASS] reason_code_audit — No hard violations.

============================================================
P1 GOVERNANCE INTEGRITY RESULT
============================================================
  P0_SYSTEM_PASS: true
  P1_SYSTEM_PASS: true
  EDGE_UNLOCK: true
  FINAL: PASS
============================================================
## STEP 6
COMMAND: npm run -s edge:profit:01:super
EC: 0
STARTED_AT: 2026-02-23T13:36:57.590Z
COMPLETED_AT: 2026-02-23T13:37:07.793Z
[PASS] env_node_truth_authority — NONE
[PASS] paper_telemetry_real_stub_gen — rows=360
[PASS] paper_telemetry_import_csv — NONE
[PASS] edge_hypothesis_registry_court — NONE
[PASS] edge_paper_evidence_ingest — NONE
[PASS] edge_execution_reality_court — NONE
[PASS] edge_expectancy_court — NONE
[PASS] edge_overfit_court_mvp — NONE
[PASS] edge_profit_00_closeout — NONE

============================================================
EDGE_PROFIT_00 X2 — Deterministic Anti-Flake [real]
RUN_ID: 7df4dc3a1062
============================================================

[X2] Run 1/2
[PASS] edge_hypothesis_registry_court — NONE
[PASS] edge_paper_evidence_ingest — NONE
[PASS] edge_execution_reality_court — NONE
[PASS] edge_expectancy_court — NONE
[PASS] edge_overfit_court_mvp — NONE
[PASS] edge_profit_00_closeout — NONE
[X2] Run 2/2
[PASS] edge_hypothesis_registry_court — NONE
[PASS] edge_paper_evidence_ingest — NONE
[PASS] edge_execution_reality_court — NONE
[PASS] edge_expectancy_court — NONE
[PASS] edge_overfit_court_mvp — NONE
[PASS] edge_profit_00_closeout — NONE

[PASS] edge_profit_00_x2 — NONE
[PASS] edge_profit_00_doctor — NONE

============================================================
EDGE_PROFIT_00 X2 — Deterministic Anti-Flake [real]
RUN_ID: 7df4dc3a1062
============================================================

[X2] Run 1/2
[PASS] edge_hypothesis_registry_court — NONE
[PASS] edge_paper_evidence_ingest — NONE
[PASS] edge_execution_reality_court — NONE
[PASS] edge_expectancy_court — NONE
[PASS] edge_overfit_court_mvp — NONE
[PASS] edge_profit_00_closeout — NONE

[X2] Run 2/2
[PASS] edge_hypothesis_registry_court — NONE
[PASS] edge_paper_evidence_ingest — NONE
[PASS] edge_execution_reality_court — NONE
[PASS] edge_expectancy_court — NONE
[PASS] edge_overfit_court_mvp — NONE
[PASS] edge_profit_00_closeout — NONE

[PASS] edge_profit_00_x2 — NONE
FINAL_VALIDATED=reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz
SHA256=e175cae7f1dbfbf34ba89566ce68550010a1c8777f4c5c5acd74a2c8a3357fbf
SHA_FILE=reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256
[PASS] edge_profit_00_release_artifacts_gate — NONE
[PASS] edge_profit_00_doctor — NONE
## STEP 7
COMMAND: npm run -s edge:profit:01:wf-lite
EC: 0
STARTED_AT: 2026-02-23T13:37:07.794Z
COMPLETED_AT: 2026-02-23T13:37:09.988Z
```
[PASS] edge_walk_forward_lite — NONE
```
## STEP 8
COMMAND: npm run -s edge:profit:02:expectancy-proof
EC: 1
STARTED_AT: 2026-02-23T13:37:09.988Z
COMPLETED_AT: 2026-02-23T13:37:12.234Z
[NEEDS_DATA] edge_profit_02_expectancy_proof — EP02_REAL_REQUIRED
```
- ec: 0
- output: FINAL_VALIDATED=reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz
  SHA256=7f17664a5147c09ef85c4a8d3c781a7232bedd661d54df318017974d7cd43475
  SHA_FILE=reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256
```

## source ~/.nvm/nvm.sh && nvm use 22.22.0 >/dev/null && npm run -s verify:edge:profit:00:release
```
- ec: 0
- output: [PASS] edge_profit_00_release_artifacts_gate — NONE
```

## source ~/.nvm/nvm.sh && nvm use 22.22.0 >/dev/null && npm run -s edge:profit:00:doctor
```
- ec: 0
- output: [PASS] edge_profit_00_doctor — NONE
```

## source ~/.nvm/nvm.sh && nvm use 22.22.0 >/dev/null && npm run -s verify:report:contradiction
```
- ec: 1
- output: [FAIL] report_contradiction_guard — REP01
```

