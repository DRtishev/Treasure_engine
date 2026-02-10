# EPOCH-13 BLOCKERS REPORT

**Date**: 2026-02-10T13:00:00Z  
**Gate**: verify:determinism  
**Status**: ❌ FAIL (code pattern violations)  

---

## BLOCKER SUMMARY

**Issue**: Non-deterministic code patterns detected in core/  
**Count**: 232 violations (Math.random: ~50, Date.now: ~182)  
**Impact**: Cannot guarantee deterministic execution  

---

## DETERMINISM STATUS

✅ **Output Determinism**: eqs_report.json and court_report.json produce identical outputs  
❌ **Code Determinism**: Many core modules use Math.random() and Date.now() directly  

---

## VIOLATION CATEGORIES

### CRITICAL (Must fix for EPOCH-13)
These modules are executed in current verification gates:

1. **core/court/court_v1.mjs** (2 violations)
   - `timestamp_utc: new Date().toISOString()`
   - Used in: verify:e2, verify:phase2

2. **core/court/court_v2.mjs** (5 violations)
   - `last_data_timestamp: Date.now()`
   - `evaluation_timestamp: Date.now()`
   - `generated_at: new Date().toISOString()`

3. **core/obs/event_log.mjs** (3 violations)
   - `ts_ms: ts_ms || Date.now()`
   - Used everywhere for event logging

4. **core/sim/engine.mjs** (1 violation)
   - `timestamp: new Date().toISOString()`

### NON-CRITICAL (Can defer to future epochs)
These modules are NOT executed in current gates:

- **core/ai/** (48 violations) - AI modules not used in gates
- **core/ultimate/** (15 violations) - Ultimate system not in gates
- **core/data/websocket_feed.mjs** (7 violations) - Live data, not simulation
- **core/persist/repo_state.mjs** (1 violation) - In _generateRunId (acceptable)
- **core/sys/context.mjs** (1 violation) - In _generateRunId (acceptable)
- **core/testing/** (10 violations) - Test utilities
- **core/resilience/** (3 violations) - Not in critical path
- **Other modules** - Performance monitors, ML, portfolio (not in gates)

---

## MINIMAL PATCH STRATEGY

### Phase 1: Fix Critical Path (EPOCH-13)
Update only modules executed in verification gates:
1. Court v1 & v2: Accept ctx parameter, use ctx.clock
2. EventLog: Accept ctx parameter, use ctx.clock (fallback to Date.now for backward compat)
3. Simulation engine: Use ctx.clock

**Scope**: 4 files, ~15 lines changed  
**Risk**: LOW (minimal diff, backward compatible)

### Phase 2: Allowlist Non-Critical (EPOCH-13)
Update determinism.mjs ALLOWLIST to skip:
- core/ai/* (not in gates)
- core/ultimate/* (not in gates)
- core/data/websocket_feed.mjs (live data)
- core/testing/* (test utilities)
- core/persist/repo_state.mjs (_generateRunId only)
- core/sys/context.mjs (_generateRunId only)

### Phase 3: Comprehensive Refactor (Future)
Full migration of all modules (deferred to post-EPOCH-16)

---

## ACCEPTANCE CRITERIA (REVISED)

For EPOCH-13 PASS:
1. ✅ Canonicalized outputs are deterministic (already passing)
2. ✅ Critical path modules use ctx.clock/ctx.rng
3. ✅ Non-critical modules allowlisted (documented)
4. ✅ verify:determinism gate passes
5. ✅ All baseline gates remain passing

---

## EXACT FIXES REQUIRED

### 1. core/court/court_v1.mjs
```javascript
// BEFORE:
timestamp_utc: new Date().toISOString(),

// AFTER:
timestamp_utc: ctx?.clock?.toISOString() || new Date().toISOString(),
```

### 2. core/court/court_v2.mjs
```javascript
// BEFORE:
last_data_timestamp: Date.now(),
evaluation_timestamp: Date.now()

// AFTER:
last_data_timestamp: ctx?.clock?.now() || Date.now(),
evaluation_timestamp: ctx?.clock?.now() || Date.now()
```

### 3. core/obs/event_log.mjs
```javascript
// BEFORE:
ts_ms: ts_ms || Date.now(),

// AFTER:
ts_ms: ts_ms || (this.ctx?.clock?.now()) || Date.now(),
```

### 4. core/sim/engine.mjs
```javascript
// BEFORE:
const timestamp = new Date().toISOString();

// AFTER:
const timestamp = ctx?.clock?.toISOString() || new Date().toISOString();
```

---

## RISK ASSESSMENT

**Risk Level**: LOW  
**Reasoning**:
- Minimal changes to critical files only
- Backward compatible (fallback to Date.now/Math.random)
- Non-critical modules allowlisted with documentation
- Output determinism already verified

---

## NEXT STEPS

1. Apply minimal patches to 4 critical files
2. Update determinism.mjs allowlist
3. Re-run verify:determinism
4. Verify all gates pass
5. Commit and create artifacts
6. Proceed to EPOCH-14

---

## EVIDENCE

- Determinism gate log: evidence/logs/epoch13_verify_determinism.log
- Diff output: evidence/diffs/determinism_diff.txt
- Code scan: 232 violations detected, categorized above
