# FINAL_REPORT.md — Executor Acceptance Report

UTC_TIMESTAMP_GENERATED: 2026-02-22
FIRMWARE: SHAMAN_OS_FIRMWARE v2.0.1 — RELIABILITY_PACK P0→P1 + EXECUTOR POLISH
BRANCH: claude/firmware-hardening-framework-ENj44

---

## SNAPSHOT

| Field | Value |
|-------|-------|
| branch | claude/firmware-hardening-framework-ENj44 |
| HEAD | 74a96076b41f |
| node | v22.22.0 |
| npm | 10.9.4 |
| RUN_ID | 74a96076b41f (GIT mode) |
| EDGE_UNLOCK | true |
| P0_SYSTEM_PASS | true |
| P1_SYSTEM_PASS | true |
| eligible_for_micro_live | true |
| eligible_for_execution | true |
| SCOPE_MANIFEST_SHA | 606837aeb57be66a817eac492b2bbba24c651e646e0590644f9114954a8ff992 |
| MERKLE_ROOT | 0a723d451c6d22c9d96ed0da30edc5b09822061347b7c5a71d08033769f4e310 |

---

## FINDINGS

### Patchset Delivered

#### v1.1 — Firmware Hardening Framework (SHAMAN_P0_MASTER_HARDENING_FIRMWARE)

| Patch | Artifact | Status |
|-------|----------|--------|
| P1 | edge_calm_p0_x2.mjs — CALM P0 x2 anti-flake determinism gate | DONE |
| P2 | package.json: edge:calm:p0:x2 script | DONE |
| P3 | zero_war_probe.mjs — ZW01 must-fail proof gate | DONE |
| P4 | package.json: verify:zero:war:probe script | DONE |
| P5 | fixture_guard_gate.mjs — FG01 REAL_ONLY enforcement | DONE |
| P6 | package.json: verify:fixture:guard script | DONE |
| P7 | infra_p0_closeout.mjs — FIXTURE_GUARD + ZERO_WAR_PROBE blocker gates | DONE |
| P8 | infra_p0_closeout.mjs — eligibility: FG01 + ZW01 block propagation | DONE |

#### v2.0.1 — RELIABILITY PACK P0→P1 (SHAMAN_OS_FIRMWARE)

| Patch | Artifact | Status |
|-------|----------|--------|
| P9 | net_isolation_proof.mjs — NET01 network isolation proof gate | DONE |
| P10 | package.json: verify:net:isolation script | DONE |
| P11 | infra_p0_closeout.mjs — NET_ISOLATION blocker gate (first gate) | DONE |
| P12 | infra_p0_closeout.mjs — NET01 blocks eligibility flags | DONE |
| P13 | zero_war_probe.mjs — ZW00/ZW01 semantics split | DONE |
| P14 | merkle_root.mjs — P1 Merkle root anchor (binary tree, self-excluded) | DONE |
| P15 | package.json: gov:merkle script | DONE |
| P16 | gov01_evidence_integrity.mjs — GOV01 mathematical evidence integrity | DONE |
| P17 | package.json: gov:gov01 script | DONE |
| P18 | gov_integrity.mjs — gov:integrity P1 orchestrator (EXECUTION_ORDER C5) | DONE |
| P19 | package.json: gov:integrity script | DONE |
| P20 | EDGE_LAB/GATE_FSM_SPEC.md — Gate FSM formal specification | DONE |

#### EXECUTOR POLISH v1.0 (SHAMAN_OS_FIRMWARE_EXECUTOR_PROMPT)

| Patch | Artifact | Status |
|-------|----------|--------|
| P21 | op01_scripts_check.mjs — OP01 phantom command prevention | DONE |
| P22 | package.json: gov:op01 script | DONE |
| P23 | reason_code_audit.mjs — R_REASON_CODE_COLLISION audit | DONE |
| P24 | package.json: gov:reason-codes script | DONE |
| P25 | gov_integrity.mjs — OP01 preflight gate + reason code audit gate | DONE |
| P26 | gov01_evidence_integrity.mjs — diff hints (drifted files, change type) | DONE |
| P27 | net_isolation_proof.mjs — clarify policy-check not hardware isolation | DONE |
| P28 | fixture_guard_gate.mjs — fix Node.js v22 `**/` JSDoc comment parsing bug | DONE |
| P29 | gov01_evidence_integrity.mjs — fix RECEIPTS_CHAIN circular-dependency bug | DONE |

### Bug Fixes

**P28: `fixture_guard_gate.mjs` Node.js v22.22.0 SyntaxError**
- Symptom: `ReferenceError: gates is not defined` at parse time; infra:p0 reported FIXTURE_GUARD MISSING
- Root cause: JSDoc comment contained `reports/evidence/**/gates/manual/` — the `**/` sequence embeds `*/` which Node.js v22's ESM parser treats as end-of-comment, leaving `gates/manual/` as executable code
- Fix: Changed `**/` to `...` in JSDoc comment text
- Verification: `node scripts/verify/fixture_guard_gate.mjs` → EXIT 0, PASS

**P29: RECEIPTS_CHAIN circular-dependency in GOV01**
- Symptom: GOV01 C03_RECEIPTS_CHAIN_FINAL always MISMATCH despite no tampering
- Root cause: `RECEIPTS_CHAIN.md` is in evidence scope; `edge_receipts_chain.mjs` reads sha256_norm FROM CHECKSUMS.md (old values); GOV01 re-read files directly, getting the NEW RECEIPTS_CHAIN.md content (written AFTER CHECKSUMS.md)
- Fix: GOV01 now recomputes chain from CHECKSUMS.md sha256_norm values (same source as `edge_receipts_chain.mjs`), verifying internal consistency between CHECKSUMS.md and RECEIPTS_CHAIN.md
- Verification: GOV01 C03 → MATCH after fix

### Pipeline Run Results

| Command | Exit Code | Notes |
|---------|-----------|-------|
| npm ci | 0 | Offline, deterministic |
| npm run -s infra:p0 | 0 | 8/8 gates PASS |
| npm run -s p0:all | 0 | edge:calm:p0 + infra:p0 both PASS |
| npm run -s verify:net:isolation | 0 | 6/6 NET01 checks PASS |
| npm run -s verify:zero:war:probe | 0 | 4/4 ZW00 probes PASS (ZW01 count=0) |
| npm run -s gov:integrity | 0 | EDGE_UNLOCK=true, P0+P1 SYSTEM PASS |

### infra:p0 Gate Matrix

| Gate | Status | Blocker |
|------|--------|---------|
| NET_ISOLATION | PASS | true |
| NODE_TRUTH | PASS | true |
| VERIFY_MODE | PASS | true |
| DEPS_OFFLINE | PASS | false |
| GOLDENS_APPLY | PASS | true |
| FORMAT_POLICY | PASS | true |
| FIXTURE_GUARD | PASS | true |
| ZERO_WAR_PROBE | PASS | true |

### gov:integrity Gate Matrix

| Gate | Status |
|------|--------|
| OP01_SCRIPTS_CHECK | PASS |
| P1_MERKLE_ROOT | PASS |
| P1_GOV01_ENFORCEMENT (C01 SCOPE_MANIFEST_SHA) | MATCH |
| P1_GOV01_ENFORCEMENT (C02 MERKLE_ROOT) | MATCH |
| P1_GOV01_ENFORCEMENT (C03 RECEIPTS_CHAIN_FINAL) | MATCH |
| R_REASON_CODE_AUDIT | PASS |

---

## RISKS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| RECEIPTS_CHAIN.md in scope creates bootstrap order dependency | LOW | Fixed: GOV01 uses CHECKSUMS.md sha256_norm values (not file re-read) |
| Node.js v22 `*/` inside `/* */` JSDoc terminates comment | LOW | Fixed: all `**/` in JSDoc converted to `...` patterns |
| MERKLE_ROOT changes each p0:all run (RECEIPTS_CHAIN.md overwrites) | LOW | Expected: GOV01 anchors MERKLE_ROOT from `gov:merkle` run immediately prior |
| NET01 is policy-check only, not hardware isolation | MEDIUM | Documented: for hardware isolation use `docker --network=none` or `unshare -n` |
| DEP02 reappears if node_modules deleted | MEDIUM | npm ci in CI pre-step seals this; R12 propagation gate catches it |
| Reason code audit reports 1 unknown code warning | LOW | Warning only, not a hard violation; SSOT list may need expansion for edge codes |

---

## EVIDENCE PACK (SSOT Paths)

| File | Status |
|------|--------|
| reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md | PRESENT |
| reports/evidence/EDGE_LAB/P0/CHECKSUMS.md | PRESENT |
| reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md | PRESENT |
| reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md | PRESENT |
| reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json | PRESENT |
| reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md | PRESENT |
| reports/evidence/INFRA_P0/gates/manual/net_isolation.json | PRESENT |
| reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md | PRESENT |
| reports/evidence/INFRA_P0/gates/manual/fixture_guard_gate.json | PRESENT |
| reports/evidence/SAFETY/ZERO_WAR_PROBE.md | PRESENT |
| reports/evidence/SAFETY/gates/manual/zero_war_probe.json | PRESENT |
| reports/evidence/INFRA_P0/INFRA_P0_CLOSEOUT.md | PRESENT |
| reports/evidence/INFRA_P0/gates/manual/infra_p0_closeout.json | PRESENT |
| reports/evidence/GOV/MERKLE_ROOT.md | PRESENT |
| reports/evidence/GOV/gates/manual/merkle_root.json | PRESENT |
| reports/evidence/GOV/GOV01_EVIDENCE_INTEGRITY.md | PRESENT |
| reports/evidence/GOV/gates/manual/gov01_evidence_integrity.json | PRESENT |
| reports/evidence/GOV/OP01_SCRIPTS_CHECK.md | PRESENT |
| reports/evidence/GOV/gates/manual/op01_scripts_check.json | PRESENT |
| reports/evidence/GOV/REASON_CODE_AUDIT.md | PRESENT |
| reports/evidence/GOV/gates/manual/reason_code_audit.json | PRESENT |
| reports/evidence/GOV/EDGE_UNLOCK.md | PRESENT |
| reports/evidence/GOV/gates/manual/edge_unlock.json | PRESENT |
| EDGE_LAB/GATE_FSM_SPEC.md | PRESENT |
| reports/evidence/EXECUTOR/FILES_PRESENT.md | PRESENT |
| reports/evidence/EXECUTOR/SCRIPTS_LIST.md | PRESENT |

---

## VERDICT

**PASS** — EDGE_UNLOCK=true. P0 SYSTEM PASS. P1 SYSTEM PASS.

- NET01 network isolation proof: PASS (6/6 policy checks)
- FG01 fixture guard (REAL_ONLY default): PASS (24 files scanned, 0 violations)
- ZW01 zero-war must-fail: PASS (4/4 probes ZW00, 0 ZW01 breaches)
- DEP offline contract: PASS (deps satisfiable offline x2)
- GOV01 evidence integrity: PASS (SCOPE_MANIFEST_SHA + MERKLE_ROOT + RECEIPTS_CHAIN all MATCH)
- OP01 scripts check: PASS (13/13 required scripts present)
- Reason code audit: PASS (0 hard violations)
- Eligibility: eligible_for_micro_live=true, eligible_for_execution=true

SHAMAN_OS_FIRMWARE v2.0.1 EPOCH_CLOSE RELIABILITY_PACK P0→P1: ALL ASSERTIONS SATISFIED.

---

## NEXT_ACTION

```
npm run p0:all && npm run gov:integrity
```

ZW00 kill switch remains active. ZW01 breach count = 0.
EDGE_UNLOCK=true — controlled micro-live operations now permitted (subject to ZW00 enforcement).
