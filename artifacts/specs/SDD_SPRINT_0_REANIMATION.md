# SDD-001: Sprint 0 -- Reanimation

> Software Design Document | Version 1.0.0
> Date: 2026-03-03 | Classification: INTERNAL
> Parent: [SDD-000 Master Roadmap](SDD_MASTER_ROADMAP.md)
> Author: AI Architect (CERT mode) | Approver: DRtishev

---

## 1. Reality Snapshot

### Current State (Evidence-Driven)

| Gate | Status | EC | Reason |
|------|--------|----|--------|
| verify:fast | **PASS x2** | 0 | All 37 regression gates pass (toolchain bootstrapped) |
| ops:life | **CRASH** | 1 | `EVT_SCHEMA_ERROR`: field `budget_ms` matches forbidden timestamp pattern `/_ms$/` |
| ops:doctor | **FAIL** | 1 | `BOOT_FAIL` -- depends on ops:life success |
| ops:cockpit | PASS | 0 | FSM=CERTIFYING, readiness=NEEDS_DATA |
| ops:timemachine | PASS | 0 | Heartbeat ledger operational |
| ops:autopilot | PASS | 0 | DRY_RUN mode, LIFE plan active |

### Pain Points

1. **ops:life crashes** on line 460 of `state_manager.mjs` -- the `budget_ms` attribute in FSM transition events triggers `event_schema_v1.mjs` forbidden timestamp pattern validator (`/_at$/`, `/_ts$/`, `/_ms$/`)
2. **ops:doctor cannot boot** because phase 0 (SELF-HEAL) and phase 1 (STARTUP PROBE) depend on ops:life returning EC=0
3. **Placeholder SHA256 hashes** in EDGE_PROFIT_00/ (`sha256:1111...`, `sha256:2222...`) violate evidence integrity rules
4. **ajv vulnerability** -- CVE GHSA-2g4f-4pwh-qvx6 (ReDoS in ajv 8.x) present in `npm audit`

### Invariants

- Node.js 22.22.0 vendored and locked (PASS)
- TREASURE_NET_KILL=1 enforced in all CERT paths
- 37 regression gates: ALL PASS x2 (deterministic)
- Write-scope: `artifacts/**` and `reports/evidence/EPOCH-*/**` only

---

## 2. Goals

| # | Goal | Measurable Outcome |
|---|------|--------------------|
| G1 | Organism life cycle resumes | ops:life returns EC=0 (ALIVE or IMPAIRED) |
| G2 | Doctor health system boots | ops:doctor returns EC=0 (HEALTHY, scoreboard > 50) |
| G3 | FSM transitions work | FSM can execute T01 (BOOT -> CERTIFYING) and T02 (CERTIFYING -> CERTIFIED) |
| G4 | Evidence integrity clean | Zero placeholder SHA256 hashes in production evidence |
| G5 | Supply chain clean | `npm audit` returns 0 moderate+ vulnerabilities |

---

## 3. Non-Goals

- Expanding SAN01 scan scope to core/ (Sprint 1)
- Fixing DeterministicClock default fallback (Sprint 1)
- Wiring Edge Lab courts into strategy sweep (Sprint 1)
- Data acquisition or paper trading (Sprint 2-3)
- Any changes to the strategy interface or backtest engine
- Performance optimization of gate execution

---

## 4. Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Offline | No network in CERT mode | R3 + TREASURE_NET_KILL=1 |
| Write-scope | artifacts/** and reports/evidence/EPOCH-*/** | R5 + churn_contract01 gate |
| Determinism | All fixes must be reproducible x2 | R4 + byte-audit gate |
| Regression | Every fix ships with a regression gate | R9 |
| Minimal diff | Smallest change that fixes the problem | CONSTRAINTS.md |
| Node SSOT | 22.22.0 only | R6 + node_truth_alignment gate |

---

## 5. Design

### 5.1 MINE-01: budget_ms -> budget_millis

**Root Cause Analysis:**

The `event_schema_v1.mjs` validator contains a forbidden timestamp field regex:

```javascript
const TIMESTAMP_FIELD_RE = /(_at|_ts|timestamp|created|updated|generated|date)$/i;
```

Additionally, `write_json_deterministic.mjs` (line 16) uses a similar pattern. However, the actual crash comes from the event schema validator in `event_schema_v1.mjs` which rejects any `attrs` field name matching `/_ms$/` as a potential timestamp.

**Location:** `scripts/ops/state_manager.mjs:460`

```javascript
// BEFORE (crashes):
attrs: { budget_ms: transition.timeout_ms }

// AFTER (fix):
attrs: { budget_millis: transition.timeout_ms }
```

**Scope of Change:** 1 line in state_manager.mjs

**Why `budget_millis`:**
- `_millis` suffix does not match any forbidden timestamp pattern
- Preserves semantic meaning (budget in milliseconds)
- Consistent with existing field naming (no other `_millis` fields exist, creating no ambiguity)

**Ripple Analysis:**

| Consumer | Impact | Action |
|----------|--------|--------|
| event_schema_v1.mjs | Validator will stop rejecting | No change needed |
| EventBus events | Events will serialize correctly | No change needed |
| life.mjs telemetry | Will receive valid events | No change needed |
| Cockpit HUD | Displays event attrs | No change needed (dynamic display) |
| Watermark | Does not store attrs | No change needed |

**Regression Gate:** `regression_life01_budget_field_not_timestamp`
- Verifies `budget_millis` field name is used in FSM transition events
- Verifies `budget_ms` is NOT present in any event attrs
- PASS criteria: zero events with `_ms` suffix in attrs field names

### 5.2 MINE-08: Regression EC Anomaly

**Root Cause:** `regression_net_toolchain01` gate script returns EC=0 (PASS) even when the internal check detects a FAIL condition. The console output shows `[FAIL]` but `process.exit(0)` is called.

**Location:** `scripts/verify/regression_net_toolchain01*.mjs`

**Fix:** Ensure `process.exit(ok ? 0 : 1)` is used consistently.

**Regression Gate:** Already covered by existing `regression_toolchain_reason01_classification` gate which validates exit code contract.

### 5.3 MINE-10: Placeholder SHA256 Hashes

**Root Cause:** `EDGE_PROFIT_00/TRIALS_LEDGER.md` contains placeholder hashes:
```
sha256:1111111111111111111111111111111111111111111111111111111111111111
sha256:2222222222222222222222222222222222222222222222222222222222222222
```

**Fix Options:**

| Option | Pros | Cons |
|--------|------|------|
| A: Delete file | Clean | Loses structure reference |
| B: Mark as STUB | Honest | File remains |
| C: Replace with real hashes | Correct | Requires data |

**Recommended:** Option B -- mark entries as `sha256:STUB_PLACEHOLDER_NOT_EVIDENCE` with explicit `status: STUB` field. This is honest (R2: never fabricate) and preserves the ledger structure for Sprint 2 when real data arrives.

**Regression Gate:** `regression_no_stub_promotion` (may already exist)
- Verifies no `sha256:1111...` or `sha256:2222...` patterns in production evidence paths
- PASS criteria: zero placeholder hashes outside explicitly marked STUB files

### 5.4 MINE-07: ajv ReDoS Vulnerability

**Root Cause:** `ajv@8.x` has CVE GHSA-2g4f-4pwh-qvx6 (moderate ReDoS)

**Fix:** `npm audit fix` -- updates ajv to patched version.

**Constraint:** Requires network access (one-time). Must be done via:
```bash
npm run -s ops:node:toolchain:bootstrap  # includes npm install
```

**Verification:** `npm audit` returns 0 moderate+ vulnerabilities.

---

## 6. Patch Plan

### Execution Order

```
Step 1: Fix MINE-01 (budget_ms -> budget_millis)
        File: scripts/ops/state_manager.mjs:460
        Diff: 1 line
        Risk: LOW (field rename, no logic change)

Step 2: Fix MINE-08 (EC anomaly)
        File: scripts/verify/regression_net_toolchain01*.mjs
        Diff: 1-3 lines
        Risk: LOW (exit code fix)

Step 3: Fix MINE-10 (placeholder hashes)
        File: EDGE_PROFIT_00/TRIALS_LEDGER.md
        Diff: 2-5 lines
        Risk: LOW (documentation fix)

Step 4: Fix MINE-07 (ajv vulnerability)
        Command: npm audit fix (via bootstrap)
        Risk: LOW (dev dependency only)

Step 5: Write regression gate for MINE-01
        File: scripts/verify/regression_life01_budget_field.mjs
        Diff: ~50 lines (new file)
        Risk: LOW (gate-only, no logic change)

Step 6: Wire new gate into verify:fast
        File: package.json
        Diff: 1-2 lines
        Risk: LOW (additive)
```

### Rollback Plan

Each step is independently reversible via `git revert`. No step depends on a previous step's code change (only on its verification).

---

## 7. Verification Runbook

### Gate Execution Order

```bash
# Step 1: Verify baseline (already PASS)
npm run -s verify:fast                    # run 1 -> PASS
npm run -s verify:fast                    # run 2 -> PASS (determinism)

# Step 2: Apply fixes (Steps 1-6 above)

# Step 3: Verify all fixes
npm run -s verify:fast                    # run 1 -> PASS (with new gate)
npm run -s verify:fast                    # run 2 -> PASS (determinism)

# Step 4: Verify organism
npm run -s ops:life                       # EC=0 (ALIVE or IMPAIRED)
npm run -s ops:doctor                     # EC=0 (HEALTHY)
npm run -s ops:cockpit                    # EC=0 (FSM state visible)
```

### Expected Outputs

| Command | Expected EC | Expected Status |
|---------|-------------|-----------------|
| verify:fast (x2) | 0 | ALL PASS, identical |
| ops:life | 0 | ALIVE (phase 5 SEAL reached) |
| ops:doctor | 0 | HEALTHY (scoreboard >= 50) |
| ops:cockpit | 0 | FSM visible, readiness updated |
| npm audit | 0 | 0 moderate+ vulnerabilities |

---

## 8. Evidence Requirements

### Artifacts

```
reports/evidence/EPOCH-SPRINT0-<RUN_ID>/
  PREFLIGHT.md              -- pre-fix state snapshot
  GATE_PLAN.md              -- ordered gate list
  gates/
    verify_fast_run1.log    -- full output
    verify_fast_run2.log    -- determinism proof
    ops_life.log            -- organism lifecycle
    ops_doctor.log          -- health probe
    ops_cockpit.log         -- HUD state
    npm_audit.log           -- vulnerability scan
  DIFF.patch                -- git diff of all changes
  SHA256SUMS.md             -- checksums of all evidence
  SUMMARY.md                -- sprint 0 summary report
```

### Evidence Chain

```
PREFLIGHT.md (baseline state)
  -> DIFF.patch (changes applied)
    -> gates/*.log (verification runs)
      -> SHA256SUMS.md (integrity proof)
        -> SUMMARY.md (verdict)
```

---

## 9. Stop Rules

### PASS Criteria

ALL of the following must be true:

- [ ] verify:fast x2: IDENTICAL PASS (37+ gates, EC=0 both runs)
- [ ] ops:life: EC=0 (ALIVE or IMPAIRED accepted)
- [ ] ops:doctor: EC=0 (HEALTHY, scoreboard >= 50)
- [ ] ops:cockpit: EC=0 (FSM state visible)
- [ ] npm audit: 0 moderate+ vulnerabilities
- [ ] Zero placeholder SHA256 hashes in production evidence
- [ ] New regression gate `regression_life01_budget_field` wired and PASS
- [ ] DIFF.patch reviewed: no unintended changes
- [ ] SHA256SUMS.md generated and verified

### FAIL / Rollback Conditions

- Any regression gate that was PASS before becomes FAIL -> `git revert` + investigate
- ops:life crashes with different error -> new MINE, do not proceed
- ops:doctor scoreboard < 50 -> investigate but may proceed (Sprint 1 will improve)
- Nondeterminism detected (verify:fast run1 != run2) -> CRITICAL, stop and debug

---

## 10. Risk Register

| ID | Risk | P | I | Mitigation |
|----|------|---|---|------------|
| R0-01 | budget_millis rename breaks consumers | Low | High | Ripple analysis shows no consumers depend on field name |
| R0-02 | npm audit fix introduces breaking change | Low | Medium | ajv is dev-only; lock file pins version |
| R0-03 | ops:doctor scoreboard stays < 50 | Medium | Low | Acceptable for Sprint 0; Sprint 1 targets >= 70 |
| R0-04 | Unknown secondary crash in ops:life | Low | High | If different error, open new MINE and triage |
| R0-05 | Placeholder hash removal breaks existing tooling | Low | Low | Mark as STUB rather than delete |

---

## 11. Acceptance Criteria

### Definition of Done (DoD)

```
Sprint 0 is DONE when:

1. ALL Stop Rules PASS criteria are satisfied
2. Evidence pack is complete and checksummed
3. PR submitted with evidence links
4. ops:life successfully transitions FSM through BOOT -> CERTIFYING -> CERTIFIED
5. ops:doctor reports HEALTHY with scoreboard >= 50
6. DIFF.patch contains ONLY the expected minimal changes
7. No new MINES introduced by the fixes
```

### Estimated Duration

**1-2 days** (conservative, includes evidence generation and verification)

### ONE_NEXT_ACTION

```bash
# Fix state_manager.mjs:460: budget_ms -> budget_millis
sed -i 's/budget_ms/budget_millis/' scripts/ops/state_manager.mjs
```

---

*Generated: 2026-03-03 | Mode: CERT (offline) | Parent: SDD-000*
