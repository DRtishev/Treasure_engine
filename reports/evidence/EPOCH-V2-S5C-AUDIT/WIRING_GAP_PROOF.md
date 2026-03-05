# WIRING GAP PROOF — SafetyLoop Freshness (Sprint 5c)

## Summary

MasterExecutor reads `safetyLoop.getState()` (line 154) but NEVER calls
`safetyLoop.evaluate()` before checking state. This means the kill switch
conditions are never re-evaluated in the executor path — the state is
only as fresh as the last external `evaluate()` call.

## Evidence 1: safetyLoop usage in production code

```
$ grep -rn 'safetyLoop\.\(evaluate\|start\|stop\|getState\|reset\)' core/
core/exec/master_executor.mjs:154:  const safetyState = this.safetyLoop.getState();
```

**Only `getState()` is called. No `evaluate()` in any production path.**

## Evidence 2: evaluate() callsites (all in test scripts)

```
$ grep -rn '\.evaluate()' scripts/verify/ --include='*.mjs'
scripts/verify/regression_profit_wiring01.mjs:100:    const result = loop.evaluate();
scripts/verify/regression_profit_wiring01.mjs:117:    const safeResult = safeLoop.evaluate();
scripts/verify/regression_profit_wiring01.mjs:132:    const pauseResult = pauseLoop.evaluate();
scripts/verify/regression_profit_e2e_sizer01.mjs:147:  safetyLoop.evaluate();
scripts/verify/regression_profit_e2e_ks01.mjs:54:    const evalResult = safetyLoop.evaluate();
```

**All evaluate() calls are in test harnesses, not production executor.**

## Evidence 3: MasterExecutor Phase 1b code

```javascript
// PHASE 1b: Kill Switch Gate (Sprint 5b)
if (this.safetyLoop) {
    const safetyState = this.safetyLoop.getState();  // ← reads STALE state
    if (safetyState.ordersPaused) {
        // ...block order...
    }
}
```

No `this.safetyLoop.evaluate()` before `getState()`.

## Gap Classification

| Aspect | Status |
|--------|--------|
| safetyLoop.evaluate() in executor | MISSING |
| safetyLoop.getState() in executor | Present (line 154) |
| Kill switch blocks when paused | WORKS (but only if someone else called evaluate first) |
| Auto-tick guarantee | ABSENT — no freshness contract |

## Impact

If no external process (e.g., setInterval timer via `start()`) calls `evaluate()`,
the kill switch will NEVER trigger regardless of how bad metrics get. This is a
safety gap: the kill switch is wired but not powered.

## Required Fix (VARIANT A)

Add `this.safetyLoop.evaluate()` call in MasterExecutor BEFORE reading state,
ensuring kill switch conditions are freshly evaluated on every order intent.
