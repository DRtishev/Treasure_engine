# SDD-002: Sprint 1 -- Organism Alive

> Software Design Document | Version 1.0.0
> Date: 2026-03-03 | Classification: INTERNAL
> Parent: [SDD-000 Master Roadmap](SDD_MASTER_ROADMAP.md)
> Predecessor: [SDD-001 Sprint 0 -- Reanimation](SDD_SPRINT_0_REANIMATION.md)
> Author: AI Architect (CERT mode) | Approver: DRtishev

---

## 1. Reality Snapshot

### Prerequisites (Sprint 0 DoD)

| Gate | Required State |
|------|---------------|
| verify:fast x2 | PASS (37+ gates, deterministic) |
| ops:life | EC=0 (ALIVE) |
| ops:doctor | EC=0 (HEALTHY, scoreboard >= 50) |
| npm audit | 0 moderate+ vulnerabilities |

### Entering State

After Sprint 0, the organism is alive but **degraded**:

| Subsystem | State | Problem |
|-----------|-------|---------|
| FSM Nervous System | ALIVE | Transitions work but clock not injected |
| Doctor OS | ALIVE | Scoreboard ~50-60 (below target 70) |
| SAN01 Scanner | PARTIAL | Scans scripts/ only; core/ (208 files) unaudited |
| DeterministicClock | DEGRADED | Defaults to `Date.now()` -- silent nondeterminism in CERT |
| Backtest x2 | DEAD | ajv import chain prevents determinism verification |
| Edge Lab Courts | DISCONNECTED | 13 courts exist but not wired into strategy sweep |
| mode_fsm.mjs | DEGRADED | 3x direct Date.now() calls without clock injection |
| master_executor.mjs | DEGRADED | 12x `ctx?.clock?.now() \|\| Date.now()` fallbacks |

### Determinism Leak Inventory

| Category | Occurrences | Files | Priority |
|----------|-------------|-------|----------|
| Date.now() in core/ | 439 | 152 | P1 -- MINE-04 |
| DeterministicClock default | 1 | core/sys/clock.mjs:12 | P1 -- MINE-05 |
| ctx fallback \|\| Date.now() | 12 | core/exec/master_executor.mjs | P1 |
| mode_fsm.mjs Date.now() | 3 | scripts/ops/mode_fsm.mjs | P2 -- MINE-15 |
| new Date() | 110 | 79 files | P2 |
| Math.random() | 80 | 27 files | P2 |

---

## 2. Goals

| # | Goal | Measurable Outcome | MINE |
|---|------|--------------------|------|
| G1 | Determinism boundary hardened | DeterministicClock asserts in CERT mode (no silent fallback) | MINE-05 |
| G2 | Core determinism audited | SAN01 scans core/**/*.mjs; violations triaged with allowlist | MINE-04 |
| G3 | Backtest reproducibility proven | Backtest x2 determinism gate alive (ajv chain fixed) | MINE-06 |
| G4 | Courts wired into sweep | strategy_sweep executes 3+ courts per candidate | MINE-09 |
| G5 | Doctor scoreboard >= 70 | ops:doctor reports improved health | -- |
| G6 | mode_fsm.mjs clock-clean | 3 Date.now() calls replaced with clock injection | MINE-15 |
| G7 | Event schema hardened | Explicit attrs field allowlist documented | -- |

---

## 3. Non-Goals

- Acquiring real market data (Sprint 2)
- Implementing market impact model (Sprint 2)
- Paper trading setup (Sprint 2-3)
- Multi-exchange normalization (Tier 5)
- Parallel gate execution optimization (Tier 4)
- Full elimination of all 439 Date.now() calls (progressive, allowlist-managed)

---

## 4. Constraints

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Offline | No network | R3 + TREASURE_NET_KILL=1 |
| Backward compatibility | SAN01 expansion uses allowlist, not mass-refactor | Incremental |
| Determinism x2 | All new gates must produce identical output on re-run | R4 |
| Regression gate per fix | Each MINE fix ships with its own gate | R9 |
| ajv isolation | Fix import chain, do not remove ajv entirely | Backtest engine depends on it |

---

## 5. Design

### 5.1 MINE-05: DeterministicClock Assert in CERT

**Root Cause:** `core/sys/clock.mjs` line 12 -- `DeterministicClock` constructor defaults to `Date.now()` when no initial time is provided. In CERT mode, this silently introduces wall-clock dependency.

**Current:**
```javascript
class DeterministicClock {
  constructor(initialTime) {
    this._time = initialTime ?? Date.now();  // MINE-05: silent fallback
  }
}
```

**Fix:**
```javascript
class DeterministicClock {
  constructor(initialTime) {
    if (initialTime === undefined || initialTime === null) {
      throw new Error(
        'DeterministicClock requires explicit initialTime. ' +
        'In CERT mode, wall-clock fallback is forbidden.'
      );
    }
    this._time = initialTime;
  }
}
```

**Ripple Analysis:**

Every callsite that creates `DeterministicClock` must pass explicit `initialTime`. Scan for `new DeterministicClock`:

| File | Current Usage | Action |
|------|--------------|--------|
| core/sys/context.mjs | `new DeterministicClock(opts.startTime)` | Verify opts.startTime is always provided |
| core/backtest/engine.mjs | `new DeterministicClock(bars[0].ts_open)` | Already correct |
| core/sim/engine.mjs | `new DeterministicClock(config.startTime)` | Verify config always has startTime |
| scripts/ops/state_manager.mjs | May use SystemClock | No change (not DeterministicClock) |
| Test fixtures | Various | Update to pass explicit time |

**Regression Gate:** `regression_clock01_no_wallclock_default`
- Imports DeterministicClock
- Verifies `new DeterministicClock()` (no args) throws
- Verifies `new DeterministicClock(1000)` succeeds
- PASS criteria: assertion holds, no fallback possible

### 5.2 MINE-04: SAN01 Expansion to core/

**Current Scope:** `scripts/**/*.mjs` -- SAN01 scans for `Date.now()`, `Math.random()`, `new Date()`, `eval`, `new Function`

**New Scope:** `scripts/**/*.mjs` + `core/**/*.mjs`

**Strategy:** Allowlist-based expansion. Since core/ has 439 Date.now() calls across 152 files, we cannot fix all at once. Instead:

1. Expand SAN01 scan to include `core/**/*.mjs`
2. Generate initial violation report
3. Categorize violations:
   - **FORBIDDEN**: Production code in CERT zone -> must fix
   - **ALLOWLISTED**: Legacy modules with documented justification -> track for later
   - **EXEMPT**: Test fixtures, labs/ -> permanent allowlist
4. Create allowlist file: `specs/san01_core_allowlist.json`
5. Gate passes if: all violations are either fixed or in allowlist

**Allowlist Schema:**
```json
{
  "schema_version": "1.0.0",
  "description": "SAN01 core/ expansion allowlist",
  "entries": [
    {
      "file": "core/ai/strategy_generator.mjs",
      "violations": ["Math.random:18"],
      "justification": "Legacy AI module, not in CERT path",
      "target_sprint": "3+"
    }
  ]
}
```

**Regression Gate:** `regression_san01_core_scope`
- Scans core/**/*.mjs for forbidden APIs
- Checks violations against allowlist
- PASS criteria: zero un-allowlisted violations
- Tracks allowlist size for trend monitoring

### 5.3 MINE-06: Backtest Determinism x2

**Root Cause:** The ajv import chain pulls in modules that use `Date.now()` during schema compilation, making backtest runs nondeterministic. When running `backtest x2` (same inputs, two runs), the outputs differ due to timestamps embedded during ajv schema compilation.

**Fix Strategy:**

| Option | Description | Effort | Risk |
|--------|-------------|--------|------|
| A: Lazy ajv init | Defer schema compilation to outside timing window | Medium | Low |
| B: Pre-compiled schemas | Compile schemas at build time, use cached validators | High | Low |
| C: Isolate ajv in separate context | Worker thread with frozen clock | High | Medium |

**Recommended:** Option A -- Lazy initialization

```javascript
// BEFORE: ajv compiles on import (nondeterministic)
import Ajv from 'ajv';
const ajv = new Ajv();
const validate = ajv.compile(schema); // Date.now() called internally

// AFTER: lazy compile with frozen context
let _validator = null;
function getValidator() {
  if (!_validator) {
    _validator = ajv.compile(schema);
  }
  return _validator;
}
```

Additionally, the backtest engine must ensure that ajv compilation happens before the determinism measurement window (before the first bar is processed).

**Regression Gate:** `regression_bt01_determinism_x2`
- Runs backtest with seed=12345 on fixture data, twice
- Compares SHA256 of output JSON
- PASS criteria: byte-identical outputs
- Anti-flake: test inherently runs x2

### 5.4 MINE-09: Wire Courts into Strategy Sweep

**Current State:** Edge Lab has 13 courts that PASS independently, but `strategy_sweep.mjs` does not invoke them during candidate evaluation.

**Architecture:**

```
strategy_sweep.mjs
  |
  +-- For each candidate:
  |     +-- runBacktest(strategy, bars, opts)
  |     +-- computeMetrics(results)
  |     +-- [NEW] runCourts(candidate, metrics, bars)
  |     |     +-- deflatedSharpe court
  |     |     +-- bootstrapCI court
  |     |     +-- adversarialSafety court
  |     +-- verdictAggregator(courtResults)
  |     +-- recordCandidate(candidate, metrics, verdict)
  |
  +-- rankCandidates(all)
  +-- emitSweepReport()
```

**Courts to Wire (Phase 1 -- minimum viable):**

| Court | Purpose | Veto Power |
|-------|---------|------------|
| deflatedSharpe | Adjust Sharpe for parameter count (anti-overfit) | Yes -- reject if deflated Sharpe < 0.3 |
| bootstrapCI | Confidence interval on key metrics | Yes -- reject if CI includes zero |
| adversarialSafety | Stress test with adverse scenarios | Yes -- reject if max adverse loss > threshold |

**Interface Contract:**

```javascript
// Court interface (already exists in core/court/)
function judge(candidate, metrics, bars, opts) {
  return {
    court_id: 'DEFLATED_SHARPE',
    verdict: 'PASS' | 'FAIL' | 'NEEDS_DATA',
    reason_code: 'NONE' | 'COURT_VERDICT_DEFERRED' | ...,
    metrics: { ... },
    evidence: { ... }
  };
}
```

**Regression Gate:** `regression_bt02_courts_wired`
- Runs strategy_sweep on fixture data
- Verifies >= 3 courts were invoked per candidate
- Verifies court verdicts are recorded in sweep output
- PASS criteria: all candidates have court_verdicts array with >= 3 entries

### 5.5 MINE-15: mode_fsm.mjs Clock Injection

**Root Cause:** `mode_fsm.mjs` uses `Date.now()` directly in 3 places for transition timing.

**Fix:** Accept `clock` parameter in mode_fsm functions, default to injected clock from context.

```javascript
// BEFORE:
const now = Date.now();

// AFTER:
const now = ctx.clock.now();
```

**Regression Gate:** Covered by expanded `regression_san01_core_scope` (MINE-04)

### 5.6 Event Schema Allowlist (U-23)

**Current State:** `event_schema_v1.mjs` uses pattern-based rejection (`/_at$/`, `/_ts$/`, etc.) which caused the MINE-01 crash.

**Enhancement:** Add explicit `attrs` field allowlist per event type:

```javascript
const ATTRS_ALLOWLIST = {
  STATE_TRANSITION: ['from_state', 'to_state', 'transition_id', 'budget_millis', 'guard_result'],
  GUARD_CHECK: ['guard_name', 'result', 'detail'],
  STEP_COMPLETE: ['step_name', 'exit_code', 'reason_code'],
  // ...
};
```

**Validation Strategy:**
1. Known event type + known field -> PASS
2. Known event type + unknown field -> WARN (log but don't crash)
3. Unknown event type -> WARN
4. Forbidden pattern match -> FAIL (EVT_SCHEMA_ERROR)

This provides defense-in-depth: the forbidden pattern is the last line of defense, not the first.

### 5.7 Master Executor Clock Fallback Elimination (U-24)

**Current State:** 12 occurrences of `ctx?.clock?.now() || Date.now()` in `core/exec/master_executor.mjs`

**Fix:** Remove fallback; require clock in constructor:

```javascript
class MasterExecutor {
  constructor(opts) {
    if (!opts.ctx?.clock) {
      throw new Error('MasterExecutor requires ctx.clock (DeterministicClock)');
    }
    this._clock = opts.ctx.clock;
  }

  _now() {
    return this._clock.now();
  }
}
```

Replace all 12 occurrences of `ctx?.clock?.now() || Date.now()` with `this._now()`.

**Regression Gate:** Covered by `regression_clock01_no_wallclock_default` + `regression_san01_core_scope`

---

## 6. Patch Plan

### Phase A: Determinism Hardening (Day 1-2)

```
A.1  Fix DeterministicClock assert (MINE-05)
     File: core/sys/clock.mjs
     Diff: ~5 lines
     Gate: regression_clock01_no_wallclock_default

A.2  Fix mode_fsm.mjs clock injection (MINE-15)
     File: scripts/ops/mode_fsm.mjs
     Diff: ~10 lines
     Gate: regression_san01_core_scope (expanded)

A.3  Fix master_executor.mjs fallbacks (U-24)
     File: core/exec/master_executor.mjs
     Diff: ~15 lines (12 replacements + constructor)
     Gate: regression_san01_core_scope (expanded)

A.4  Event schema allowlist (U-23)
     File: scripts/ops/event_schema_v1.mjs
     Diff: ~30 lines
     Gate: regression_ec01_reason_context_contract (existing)
```

### Phase B: Verification Infrastructure (Day 2-4)

```
B.1  Expand SAN01 to core/ with allowlist (MINE-04)
     Files: scripts/verify/regression_san01_global_forbidden_apis.mjs
            specs/san01_core_allowlist.json (new)
     Diff: ~60 lines modified + ~100 lines new
     Gate: regression_san01_core_scope (new)

B.2  Fix backtest determinism x2 (MINE-06)
     Files: core/edge/ ajv import chain
     Diff: ~20 lines
     Gate: regression_bt01_determinism_x2 (new)

B.3  Wire courts into strategy sweep (MINE-09)
     Files: core/edge/strategy_sweep.mjs (or similar)
     Diff: ~40 lines
     Gate: regression_bt02_courts_wired (new)
```

### Phase C: Verification & Evidence (Day 4-5)

```
C.1  Wire all new gates into verify:fast
     File: package.json (scripts section)
     Diff: ~5 lines

C.2  Run full verification suite
     Commands: verify:fast x2, ops:life, ops:doctor, ops:cockpit

C.3  Generate evidence pack
     Output: reports/evidence/EPOCH-SPRINT1-<RUN_ID>/
```

### Rollback Plan

Each phase is independently revertable. Phase A changes are orthogonal to Phase B. Phase C is verification-only (no code changes).

---

## 7. Verification Runbook

### Gate Execution Sequence

```bash
# Pre-check: Sprint 0 DoD still holds
npm run -s verify:fast                              # PASS (baseline)
npm run -s ops:life                                 # EC=0

# After Phase A:
npm run -s verify:fast                              # PASS (no regressions)
npm run -s ops:life                                 # EC=0 (schema allowlist helps)

# After Phase B:
npm run -s verify:fast                              # PASS (with new gates)
npm run -s verify:fast                              # PASS (determinism x2)

# Final verification (Phase C):
npm run -s ops:life                                 # EC=0 (ALIVE)
npm run -s ops:doctor                               # EC=0 (HEALTHY, scoreboard >= 70)
npm run -s ops:cockpit                              # EC=0 (HUD visible)
```

### New Gates Summary

| Gate ID | Script | Purpose | Sprint |
|---------|--------|---------|--------|
| RG_CLOCK01 | regression_clock01_no_wallclock_default.mjs | Clock assert in CERT | 1 |
| RG_SAN01_CORE | regression_san01_core_scope.mjs | SAN01 core/ expansion | 1 |
| RG_BT01_DET_X2 | regression_bt01_determinism_x2.mjs | Backtest reproducibility | 1 |
| RG_BT02_COURTS | regression_bt02_courts_wired.mjs | Courts in sweep | 1 |
| RG_EVT_ALLOWLIST | regression_evt_allowlist.mjs | Event schema allowlist | 1 |

---

## 8. Evidence Requirements

### Artifacts

```
reports/evidence/EPOCH-SPRINT1-<RUN_ID>/
  PREFLIGHT.md
  GATE_PLAN.md
  gates/
    verify_fast_run1.log
    verify_fast_run2.log
    ops_life.log
    ops_doctor.log
    ops_cockpit.log
    san01_core_violations.json    -- initial scan results
    san01_core_allowlist.json     -- approved allowlist
    bt01_determinism_proof.json   -- hash comparison
    bt02_courts_wired.json        -- court invocation evidence
  DIFF.patch
  SHA256SUMS.md
  SUMMARY.md
```

---

## 9. Stop Rules

### PASS Criteria

- [ ] verify:fast x2: IDENTICAL PASS (37+ gates + 5 new gates)
- [ ] ops:life: EC=0 (ALIVE)
- [ ] ops:doctor: EC=0 (HEALTHY, scoreboard >= 70)
- [ ] DeterministicClock rejects undefined initialTime (regression_clock01 PASS)
- [ ] SAN01 scans core/ with documented allowlist (regression_san01_core PASS)
- [ ] Backtest x2 produces byte-identical output (regression_bt01 PASS)
- [ ] Strategy sweep invokes >= 3 courts per candidate (regression_bt02 PASS)
- [ ] Event schema has explicit attrs allowlist (regression_evt_allowlist PASS)
- [ ] Zero new un-allowlisted Date.now() in core/
- [ ] DIFF.patch: no unintended changes

### FAIL / Rollback Conditions

- Regression gate introduced in Sprint 0 breaks -> investigate, do not override
- SAN01 core expansion reveals > 100 un-categorizable violations -> reduce scope, expand incrementally
- Backtest x2 fails after ajv fix -> try Option B (pre-compiled schemas)
- Courts wiring breaks existing strategy_sweep output format -> adapter pattern, preserve backward compat
- ops:doctor scoreboard drops below Sprint 0 level -> rollback Phase A, investigate

---

## 10. Risk Register

| ID | Risk | P | I | Mitigation |
|----|------|---|---|------------|
| R1-01 | DeterministicClock assert breaks untested callsites | Medium | High | Scan all `new DeterministicClock` before fix; update each |
| R1-02 | SAN01 core/ reveals 50+ violations requiring immediate fix | High | Medium | Allowlist strategy; track count, fix progressively |
| R1-03 | ajv lazy init doesn't eliminate nondeterminism | Medium | High | Fallback: Option B (pre-compiled schemas) |
| R1-04 | Courts wiring changes strategy_sweep output schema | Medium | Medium | Additive changes only; new fields, don't remove existing |
| R1-05 | master_executor 12x refactor introduces runtime error | Low | High | Each replacement is mechanical; test via ops:life |
| R1-06 | Event allowlist too restrictive (blocks valid events) | Medium | Medium | WARN mode for unknown fields, FAIL only for forbidden patterns |

---

## 11. Acceptance Criteria

### Definition of Done (DoD)

```
Sprint 1 is DONE when:

1. ALL Stop Rules PASS criteria are satisfied
2. Doctor scoreboard >= 70 (up from Sprint 0's >= 50)
3. DeterministicClock has zero silent fallbacks
4. SAN01 covers core/ with documented allowlist
5. Backtest determinism x2 gate is alive and PASS
6. Strategy sweep invokes courts (>= 3 per candidate)
7. Event schema has explicit field allowlist
8. master_executor.mjs has zero Date.now() fallbacks
9. Evidence pack complete with SHA256 chain
10. No new MINES introduced
```

### Estimated Duration

**3-7 days** (depends on SAN01 violation count and court wiring complexity)

### ONE_NEXT_ACTION

```bash
# Fix DeterministicClock: remove Date.now() default, add assert
```

---

*Generated: 2026-03-03 | Mode: CERT (offline) | Parent: SDD-000 | Predecessor: SDD-001*
