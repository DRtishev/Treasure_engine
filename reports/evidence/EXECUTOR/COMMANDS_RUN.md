# COMMANDS_RUN
GENERATED_BY: scripts/executor/executor_run_chain.mjs
NODE_VERSION: v22.22.0
NPM_VERSION: 10.9.4
RUN_ID: a7fda148d63c
VERIFY_MODE: GIT
LANE_A_STATUS: PASS
LANE_B_STATUS: NEEDS_DATA
LANE_B_MODE: DRY_RUN
NEXT_ACTION: npm run -s executor:run:chain
STATUS: PASS
REASON_CODE: NONE

## LANE_SUMMARY
- lane_a_status: PASS
- lane_b_status: NEEDS_DATA
- lane_b_mode: DRY_RUN
- records_n: 21

## STEP 1
LANE: A
COMMAND: npm run -s verify:env:authority
EC: 0
STARTED_AT: 2026-02-23T15:27:32.454Z
COMPLETED_AT: 2026-02-23T15:27:34.999Z
```
[PASS] env_node_truth_authority — NONE
```
## STEP 2
LANE: A
COMMAND: ENABLE_SQLITE_PERSISTENCE=0 TREASURE_OMIT_OPTIONAL_PROOF=1 npm ci --omit=optional
EC: 0
STARTED_AT: 2026-02-23T15:27:35.000Z
COMPLETED_AT: 2026-02-23T15:27:38.052Z
```
(no output)
```
## STEP 3
LANE: A
COMMAND: npm run -s p0:all
EC: 0
STARTED_AT: 2026-02-23T15:27:38.052Z
COMPLETED_AT: 2026-02-23T15:27:45.210Z
```

============================================================
CALM MODE P0 — Hardening Pipeline
RUN_ID: a7fda148d63c
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
[PASS] edge_evidence_hashes — 121 files hashed, SCOPE_MANIFEST_SHA=b58e9929b24f9461...
[P0 OK] EVIDENCE_HASHES: PASS

[P0] Running: RECEIPTS_CHAIN — Receipt chain on sha256_norm (R5, R11)
[PASS] edge_receipts_chain — 121 entries chained, final=dc88399d107b1d09...
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
RUN_ID: a7fda148d63c
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
[PASS] verify_mode_gate — VERIFY_MODE=GIT, RUN_ID=a7fda148d63c

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
RUN_ID: a7fda148d63c
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
RUN_ID: a7fda148d63c
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
RUN_ID: a7fda148d63c
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
```
## STEP 4
LANE: A
COMMAND: npm run -s gov:integrity
EC: 0
STARTED_AT: 2026-02-23T15:27:45.211Z
COMPLETED_AT: 2026-02-23T15:27:48.760Z
```

============================================================
P1 GOVERNANCE INTEGRITY ORCHESTRATOR
RUN_ID: a7fda148d63c
============================================================

[GOV] Running: R_OP01_SCRIPTS_CHECK
============================================================
OP01 SCRIPTS CHECK — Phantom Command Prevention
RUN_ID: a7fda148d63c
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
RUN_ID: a7fda148d63c
============================================================
[MERKLE] Files in scope: 121
[MERKLE] Files hashed: 121
[MERKLE] Files missing: 0
[MERKLE] Tree depth: 8
[MERKLE] Root: 5181e4fb68637aabcfd433aa5211e354e40bd658ddb14b9a9777151157807ec2
[MERKLE] SCOPE_MANIFEST_SHA: b58e9929b24f9461d993b38c1c5fab0c8350f955a9b4d11061498b18089cc775

============================================================
P1 MERKLE ROOT RESULT
============================================================
  Root: 5181e4fb68637aabcfd433aa5211e354e40bd658ddb14b9a9777151157807ec2
  Files: 121/121 (0 missing)
  Depth: 8 levels
  Status: PASS
============================================================

[PASS] merkle_root — Merkle root anchored at 5181e4fb68637aab…

[GOV] Running: P1_GOV01_ENFORCEMENT
============================================================
GOV01 EVIDENCE INTEGRITY GATE
RUN_ID: a7fda148d63c
============================================================
[GOV01] Anchored SCOPE_MANIFEST_SHA: b58e9929b24f9461…
[GOV01] Anchored MERKLE_ROOT: 5181e4fb68637aab…
[GOV01] Anchored RECEIPTS final: dc88399d107b1d09…
[GOV01] Computed SCOPE_MANIFEST_SHA: b58e9929b24f9461…
[GOV01] Computed MERKLE_ROOT: 5181e4fb68637aab…
[GOV01] Computed RECEIPTS final: dc88399d107b1d09…

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
RUN_ID: a7fda148d63c
============================================================

============================================================
REASON CODE AUDIT RESULT
============================================================
  Files scanned: 36
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
```
## STEP 5
LANE: A
COMMAND: npm run -s edge:profit:01:super
EC: 0
STARTED_AT: 2026-02-23T15:27:48.762Z
COMPLETED_AT: 2026-02-23T15:28:01.595Z
```
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
EDGE_PROFIT_00 X2 — Deterministic Anti-Flake [stub]
RUN_ID: a7fda148d63c
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
EDGE_PROFIT_00 X2 — Deterministic Anti-Flake [stub]
RUN_ID: a7fda148d63c
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
SHA256=04dca1d987c98ad7f8711e2284304fb09720752bf60d7c460af5d9a225d3758b
SHA_FILE=reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256
[PASS] edge_profit_00_release_artifacts_gate — NONE
[PASS] edge_profit_00_doctor — NONE
```
## STEP 6
LANE: A
COMMAND: npm run -s edge:profit:01:wf-lite
EC: 0
STARTED_AT: 2026-02-23T15:28:01.601Z
COMPLETED_AT: 2026-02-23T15:28:03.966Z
```
[PASS] edge_walk_forward_lite — NONE
```
## STEP 7
LANE: B
COMMAND: EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:expectancy-proof
EC: 1
STARTED_AT: 2026-02-23T15:28:03.967Z
COMPLETED_AT: 2026-02-23T15:28:06.320Z
```
[NEEDS_DATA] edge_profit_02_expectancy_proof — EP02_REAL_REQUIRED
```
## STEP 8
LANE: B
COMMAND: EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:pbo
EC: 1
STARTED_AT: 2026-02-23T15:28:06.321Z
COMPLETED_AT: 2026-02-23T15:28:08.665Z
```
[NEEDS_DATA] edge_profit_02_pbo_cpcv — EP02_REAL_REQUIRED
```
## STEP 9
LANE: B
COMMAND: EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:risk
EC: 1
STARTED_AT: 2026-02-23T15:28:08.667Z
COMPLETED_AT: 2026-02-23T15:28:11.031Z
```
[NEEDS_DATA] edge_profit_02_risk_mcdd — EP02_REAL_REQUIRED
```
## STEP 10
LANE: B
COMMAND: EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:proof:index
EC: 1
STARTED_AT: 2026-02-23T15:28:11.032Z
COMPLETED_AT: 2026-02-23T15:28:13.405Z
```
[NEEDS_DATA] edge_profit_02_proof_index — EP02_REAL_REQUIRED
```
## STEP 11
LANE: A
COMMAND: npm run -s export:final-validated
EC: 0
STARTED_AT: 2026-02-23T15:28:13.408Z
COMPLETED_AT: 2026-02-23T15:28:15.934Z
```
FINAL_VALIDATED=reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz
SHA256=04dca1d987c98ad7f8711e2284304fb09720752bf60d7c460af5d9a225d3758b
SHA_FILE=reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.sha256
```
## STEP 12
LANE: A
COMMAND: npm run -s verify:edge:profit:00:release
EC: 0
STARTED_AT: 2026-02-23T15:28:15.935Z
COMPLETED_AT: 2026-02-23T15:28:18.481Z
```
[PASS] edge_profit_00_release_artifacts_gate — NONE
```
## STEP 13
LANE: A
COMMAND: npm run -s verify:export:contract
EC: 0
STARTED_AT: 2026-02-23T15:28:18.484Z
COMPLETED_AT: 2026-02-23T15:28:20.932Z
```
[PASS] export_contract_integrity_gate — NONE
```
## STEP 14
LANE: A
COMMAND: npm run -s verify:export:receipt
EC: 0
STARTED_AT: 2026-02-23T15:28:20.933Z
COMPLETED_AT: 2026-02-23T15:28:23.385Z
```
[PASS] export_contract_receipt_format_guard — NONE
```
## STEP 15
LANE: A
COMMAND: npm run -s gov:final:index
EC: 0
STARTED_AT: 2026-02-23T15:28:23.386Z
COMPLETED_AT: 2026-02-23T15:28:26.313Z
```
[PASS] final_validated_index — NONE
```
## STEP 16
LANE: A
COMMAND: npm run -s gov:final:fingerprint
EC: 0
STARTED_AT: 2026-02-23T15:28:26.314Z
COMPLETED_AT: 2026-02-23T15:28:28.856Z
```
[PASS] final_validated_fingerprint — NONE
```
## STEP 17
LANE: A
COMMAND: npm run -s edge:profit:00:doctor
EC: 0
STARTED_AT: 2026-02-23T15:28:28.857Z
COMPLETED_AT: 2026-02-23T15:28:31.361Z
```
[PASS] edge_profit_00_doctor — NONE
```
## STEP 18
LANE: A
COMMAND: npm run -s verify:report:contradiction
EC: 0
STARTED_AT: 2026-02-23T15:28:31.362Z
COMPLETED_AT: 2026-02-23T15:28:33.856Z
```
[PASS] report_contradiction_guard — NONE
```
## STEP 19
LANE: A
COMMAND: npm run -s verify:regression:profile-source
EC: 0
STARTED_AT: 2026-02-23T15:28:33.857Z
COMPLETED_AT: 2026-02-23T15:28:36.305Z
```
[PASS] regression_profile_source_mismatch — NONE
```
## STEP 20
LANE: A
COMMAND: npm run -s verify:regression:no-stub-promotion
EC: 0
STARTED_AT: 2026-02-23T15:28:36.307Z
COMPLETED_AT: 2026-02-23T15:28:40.484Z
```
[PASS] regression_no_stub_promotion — NONE
```
## STEP 21
LANE: A
COMMAND: npm run -s verify:regression:no-sandbox-promotion
EC: 0
STARTED_AT: 2026-02-23T15:28:40.485Z
COMPLETED_AT: 2026-02-23T15:28:45.225Z
```
[PASS] regression_no_sandbox_promotion — NONE
```

## NOTES
- executor_chain_verdict: PASS
