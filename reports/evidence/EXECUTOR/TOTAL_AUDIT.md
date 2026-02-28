# TOTAL_AUDIT.md — Profit Epoch Baseline Audit

AUDIT_MODE: true
GENERATED_AT: 2026-02-27T00:00:00Z
AUDIT_ID: profit-epoch-baseline-9mUSA
BRANCH: claude/profit-epoch-baseline-9mUSA
HEAD: 4ec372a
NODE: v22.22.0 (SSOT: 22.22.0 — MATCH)

---

## 1. GATE MATRIX

| Gate | Status | Reason Code | Surface |
|------|--------|-------------|---------|
| verify:fast (11 regressions) | PASS | NONE | CI |
| epoch:victory:seal | BLOCKED | CHURN01 + RG_TEST01 | CERT |
| epoch:mega:proof:x2 | FAIL | ND01_SEM01 | CERT |
| epoch:foundation:seal | BLOCKED | EC01 | CERT |
| PROFIT_FOUNDATION_FREEZE_GATE | NEEDS_DATA | PFZ01_NEEDS_DATA | PROFIT |
| EDGE_PROFIT_00 lane_a | PASS | NONE | PROFIT |
| EDGE_PROFIT_00 lane_b | NEEDS_DATA | DRY_RUN | PROFIT |
| EDGE_PROFIT_00 promotion | NOT_ELIGIBLE | EP02_REAL_REQUIRED | PROFIT |
| regression_no_unbounded_spawnsync | MISSING | ARTIFACT_NOT_FOUND | REGRESSION |
| edge:profit:02:* DRY_RUN steps | FAIL | ec=1 | PROFIT |
| RG_SIG01 schema lock | PENDING | NO_DATA | P2_MVP |
| RG_SIG02 determinism x2 | PENDING | NO_DATA | P2_MVP |
| RG_PAPER01 determinism | PENDING | NO_DATA | P2_MVP |
| RG_PAPER02 no-net | PENDING | NO_DATA | P2_MVP |
| RG_LIVE01 must-fail | PENDING | NO_DATA | P2_MVP |
| RG_LIVE02 kill-switch deterministic | PENDING | NO_DATA | P2_MVP |

---

## 2. BLOCKING ROOT CAUSES

### ROOT-01: ND01_SEM01 — COMMANDS_RUN.md non-determinism
- **Surface:** epoch:mega:proof:x2 → FAIL
- **Evidence:** reports/evidence/EXECUTOR/MEGA_PROOF_X2.md
- **Fingerprints (sem):**
  - run1: 8d89c3f05a86471b4ba7c3e00a921342edc695cb7145b12e51e6e9fc1cfe63e8
  - run2: b0cdc36f11905f5a3ed992e3d1ab9a4c937bdd0e9a81ae4196952ef19bd9ec02
- **ND1_DIFF_PATHS:** reports/evidence/EXECUTOR/COMMANDS_RUN.md
- **Cascade:** blocks foundation:seal → blocks PROFIT_FOUNDATION_FREEZE_GATE

### ROOT-02: CHURN01 — Dirty tree offenders outside allowed write roots
- **Surface:** epoch:victory:seal VICTORY_PRECHECK
- **Evidence:** reports/evidence/EXECUTOR/VICTORY_PRECHECK.md
- **Offenders (9):**
  - package.json
  - reports/evidence/EXECUTOR/gates/manual/node_toolchain_acquire.json
  - reports/evidence/EXECUTOR/NODE_TOOLCHAIN_ACQUIRE.md
  - reports/evidence/RG_NODEAUTH_DONE_03/logs/epoch_victory_seal.log
  - reports/evidence/RG_NODEAUTH_DONE_03/logs/node_toolchain_acquire.log
  - scripts/executor/executor_epoch_victory_seal.mjs
  - scripts/ops/node_authority_run.sh
  - scripts/verify/regression_churn_write_scope_guard.mjs
  - scripts/verify/regression_node_churn_receipt_routing.mjs
- **Note:** These are UNTRACKED relative to HEAD (exist in working tree only). Current git status vs HEAD shows 6 EXECUTOR evidence files modified (within allowed AUDIT roots).

### ROOT-03: regression_no_unbounded_spawnsync MISSING
- **Surface:** PROFIT_FOUNDATION_FREEZE_GATE
- **Evidence:** reports/evidence/EXECUTOR/PROFIT_FOUNDATION_FREEZE_GATE.md
- **Required path:** reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json

### ROOT-04: edge:profit:02 DRY_RUN steps exit ec=1
- **Surface:** NETKILL_LEDGER anomalies (steps 7-10)
- **Evidence:** reports/evidence/EXECUTOR/NETKILL_LEDGER_SUMMARY.json
- **Failing cmds:**
  - EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:expectancy-proof
  - EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:pbo
  - EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:risk
  - EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:proof:index
- **Impact:** P2 MVP profit proof steps not passing dry-run

---

## 3. WORKING TREE STATUS (vs HEAD 4ec372a)

Files modified in AUDIT roots (ALLOWED):
- reports/evidence/EXECUTOR/REGRESSION_EC01_REASON_CONTEXT_CONTRACT.md
- reports/evidence/EXECUTOR/REGRESSION_NETKILL_LEDGER_ENFORCEMENT.md
- reports/evidence/EXECUTOR/REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md
- reports/evidence/EXECUTOR/gates/manual/regression_ec01_reason_context_contract.json
- reports/evidence/EXECUTOR/gates/manual/regression_netkill_ledger_enforcement.json
- reports/evidence/EXECUTOR/gates/manual/regression_pr01_evidence_bloat_guard.json

Status: CLEAN (within AUDIT write scope)

---

## 4. PROFIT P2 MVP STATUS

### Signals Lane (offline)
- liq_pressure / burst_score / regime flags: PENDING (no live data acquired)
- features.jsonl: NOT_GENERATED
- features.lock.json: NOT_GENERATED
- RG_SIG01 schema lock: PENDING
- RG_SIG02 determinism x2: PENDING

### Paper (offline deterministic)
- active_profile: stub (FIXTURE_STUB)
- promotion_eligible: false (EP02_REAL_REQUIRED)
- EDGE_PROFIT_00 lane_a: PASS
- EDGE_PROFIT_00 lane_b: NEEDS_DATA (DRY_RUN)
- RG_PAPER01: PENDING
- RG_PAPER02: PENDING

### Micro-live (must-fail default)
- unlock file: NOT PRESENT (artifacts/incoming/ENABLE_MICROLIVE)
- kill-switch matrix: NOT CONFIGURED
- RG_LIVE01: PENDING (must-fail gate not triggered)
- RG_LIVE02: PENDING

---

## 5. INFRASTRUCTURE

- Node authority: v22.22.0 — ladder HOST verified (PASS)
- Network: LOCKED (no ALLOW_NETWORK file, no --enable-network flag)
- Netkill ledger: semantic_hash=8c258871e596a094dd925832906125ea553efb25d13f8cd5ec499ae9da4b3674
- FINAL_VALIDATED artifact: PRESENT (EPOCH-EDGE-RC-STRICT-01)
- sha256: 2c601a2037a1fd96d51075e1958aaf2744d16f9b1c3c829cb82732a0ce4f0078

---

## 6. VERDICT

EPOCH STATUS: **BLOCKED** — cert chain interrupted by ND01_SEM01 in COMMANDS_RUN.md.
Foundation seal and profit freeze gate are blocked downstream.
verify:fast PASSES — baseline regressions healthy.
P2 MVP signals and paper lanes require data acquisition unlock to proceed.

ONE_NEXT_ACTION: `npm run -s verify:fast`
