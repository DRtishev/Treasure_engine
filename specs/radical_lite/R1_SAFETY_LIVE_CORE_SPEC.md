# R1 — Safety Live Core Spec

> Phase: R1 | Priority: P0 | Duration: 3–5 days | Status: PLANNED

---

## 1. Objective

Close P1 live blockers: intent idempotency, kill persistence, HALT double-key reset, real kill metrics.

## 2. Invariants

| ID | Invariant | Current State | Target |
|----|-----------|--------------|--------|
| INV-R1.1 | Same intent_id MUST NOT produce duplicate trades | STUB (always returns `{ created: false }`) | DB-backed dedup with `INSERT OR IGNORE` |
| INV-R1.2 | Kill switch state MUST survive process restart | IN-MEMORY only | DB checkpoint save/restore |
| INV-R1.3 | HALT can ONLY be cleared via double-key protocol | Unguarded `requestManualReset()` | Require file token + flag |
| INV-R1.4 | Kill metrics MUST reflect real pipeline state | 3/4 hardcoded zeros | Wire RiskGovernor + Ledger + adapter error tracking |

## 3. Mechanism Design

### 3.1 Intent Idempotency (INV-R1.1)

**File**: `core/exec/master_executor.mjs::_checkIntentIdempotency`

**Current** (lines 367-371):
```javascript
async _checkIntentIdempotency(intent, ctx) {
  return { created: false }; // STUB
}
```

**Target**:
```javascript
async _checkIntentIdempotency(intent, ctx) {
  if (!this.repoState) return { created: true, reason: 'NO_REPO_STATE' };
  const result = this.repoState.createIntent(intent);
  if (!result.created) {
    this.eventLog.log('INTENT_DEDUP', { intent_id: intent.intent_id, reason: 'DUPLICATE' });
    return { created: false, reason: 'DUPLICATE_INTENT' };
  }
  return { created: true };
}
```

**Integration point**: `_executeIntent()` must check idempotency BEFORE sending order.

### 3.2 Kill Persistence (INV-R1.2)

**Files**: `core/live/safety_loop.mjs`, `core/risk/risk_governor.mjs`

**Mechanism**:
1. On state change (NORMAL→PAUSED/HALTED/etc): save to DB via `repoState.saveCheckpoint('safety_state', state)`
2. On init: load from DB via `repoState.loadCheckpoint('safety_state')`
3. If checkpoint exists and state != NORMAL: enforce loaded state immediately

**Failure mode**: If DB unavailable → fail-closed (HALT, don't assume NORMAL).

### 3.3 HALT Double-Key Reset (INV-R1.3)

**File**: `core/governance/mode_fsm.mjs::requestManualReset`

**Current**: Sets boolean flag unconditionally.

**Target**:
```javascript
requestManualReset({ applyFlag = false } = {}) {
  // Double-key check
  const fileExists = fs.existsSync('artifacts/incoming/HALT_RESET_APPROVED');
  const fileContent = fileExists ? fs.readFileSync('artifacts/incoming/HALT_RESET_APPROVED', 'utf8').trim() : '';
  const fileValid = fileContent === 'HALT_RESET: YES';

  if (!applyFlag || !fileValid) {
    return { success: false, reason: 'DOUBLE_KEY_REQUIRED', applyFlag, fileValid };
  }

  this.manualResetRequested = true;
  // Clean up token file after use
  if (fileExists) fs.unlinkSync('artifacts/incoming/HALT_RESET_APPROVED');
  return { success: true, message: 'HALT reset approved via double-key' };
}
```

### 3.4 Real Kill Metrics (INV-R1.4)

**File**: `core/exec/master_executor.mjs::getKillSwitchMetrics`

**Current**: 3/4 metrics hardcoded to 0.

**Target**: Wire to real sources:
- `max_drawdown`: from `this.riskGovernor.state.current_drawdown_pct` or `this.ledger.getMaxDrawdown()`
- `exchange_error_rate`: from `this.stats.exchange_errors / this.stats.orders_sent` (add error counter)
- `consecutive_losses`: from `this.stats.consecutive_losses` (add loss streak counter in `_onFill`)
- `reality_gap`: keep existing (already computed)

## 4. Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|-----------|
| DB corruption → lost checkpoint | Restart in wrong state | Fail-closed: no checkpoint = HALT |
| intent_id collision (hash) | False dedup | SHA256 collision probability negligible |
| Token file left after crash | Next reset bypasses | Single-use: delete after read |
| Metrics lag (stale drawdown) | Late kill trigger | Update metrics on every fill, not just on check |

## 5. New Gates

### Fast (added to verify:fast)

**RG_IDEMPOTENCY_FAST01**: Contract check — `_checkIntentIdempotency` must NOT contain `return { created: false }` stub pattern. Must reference `repoState`.

**RG_HALT_DOUBLEKEY_FAST01**: Contract check — `requestManualReset` must check for file token AND flag. Must NOT set `manualResetRequested = true` unconditionally.

### Deep (added to verify:deep)

**RG_IDEMPOTENCY_E2E01**: Run sim with duplicate intent → verify second intent produces no trade.

**RG_KILL_PERSIST_E2E01**: Create safety state → save checkpoint → clear memory → load checkpoint → verify state recovered.

**RG_KILL_METRICS_E2E01**: Run sim with trades → verify metrics contain non-zero max_drawdown and consecutive_losses.

## 6. Evidence Paths

- `reports/evidence/EPOCH-RADLITE-R1/idempotency_proof.md`
- `reports/evidence/EPOCH-RADLITE-R1/kill_persist_proof.md`
- `reports/evidence/EPOCH-RADLITE-R1/halt_doublekey_proof.md`
- `reports/evidence/EPOCH-RADLITE-R1/kill_metrics_proof.md`

## 7. Definition of Done

- [ ] All 4 invariants enforced with tests
- [ ] verify:fast x2 PASS (including 2 new gates)
- [ ] verify:deep PASS (including 3 new gates)
- [ ] victory:seal PASS
- [ ] AUDIT_AFTER_R1.md filled with honest verdict
