# ROADMAP_P0_P1_P2.md — Profit Epoch Baseline

GENERATED_AT: 2026-02-27T00:00:00Z
AUDIT_ID: profit-epoch-baseline-9mUSA

---

## LEGEND

- DoD = Definition of Done (evidence required for gate PASS)
- NA = One Next Action (single command)

---

## P0 — CERT CHAIN UNBLOCK (CRITICAL)

Goal: Get epoch:mega:proof:x2 → PASS and epoch:victory:seal precheck → CLEAN.
All P0 items must close before any milestone gate or foundation seal.

### P0-01: Fix COMMANDS_RUN.md ND01_SEM01

**Status:** BLOCKED (ND01_SEM01)
**DoD:**
- [ ] COMMANDS_RUN.md excluded from or normalized in semantic hash scope
- [ ] epoch:mega:proof:x2 runs PASS x2 with matching fingerprints
- [ ] New regression gate RG_ND_COMMANDS_RUN01 added to verify:fast
- [ ] reports/evidence/EXECUTOR/MEGA_PROOF_X2.md STATUS: PASS

**NA:** Identify mega:proof:x2 script and patch semantic hash excludes
```bash
grep -r "COMMANDS_RUN" scripts/executor/ --include="*.mjs" -l
```

---

### P0-02: Commit CHURN01 offenders / gitignore logs

**Status:** BLOCKED (CHURN01)
**DoD:**
- [ ] git status shows no untracked/modified files outside allowed write roots
- [ ] package.json + script changes committed
- [ ] RG_NODEAUTH_DONE_03/logs/ added to .gitignore or moved to artifacts/
- [ ] epoch:victory:seal VICTORY_PRECHECK STATUS: PASS
- [ ] clean_tree_ok: true, offenders_outside_allowed_roots_n: 0

**NA:**
```bash
git add package.json scripts/executor/executor_epoch_victory_seal.mjs \
  scripts/ops/node_authority_run.sh \
  scripts/verify/regression_churn_write_scope_guard.mjs \
  scripts/verify/regression_node_churn_receipt_routing.mjs \
  reports/evidence/EXECUTOR/NODE_TOOLCHAIN_ACQUIRE.md \
  reports/evidence/EXECUTOR/gates/manual/node_toolchain_acquire.json && \
  echo "reports/evidence/RG_NODEAUTH_DONE_03/logs/" >> .gitignore
```

---

### P0-03: Add regression_no_unbounded_spawnsync gate

**Status:** MISSING artifact
**DoD:**
- [ ] scripts/verify/regression_no_unbounded_spawnsync.mjs implemented
- [ ] reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json written (STATUS: PASS)
- [ ] verify:regression:no-unbounded-spawnsync added to package.json
- [ ] PROFIT_FOUNDATION_FREEZE_GATE: regression_no_unbounded_spawnsync → PASS

**NA:**
```bash
npm run -s verify:regression:no-unbounded-spawnsync
```
(implement script first)

---

### P0 COMPLETION GATE

When all P0-01..P0-03 pass:
```bash
npm run -s epoch:mega:proof:x2    # must → PASS
npm run -s epoch:victory:seal     # must → PASS (MERGE_SAFE:true)
```

---

## P1 — PROFIT LANE STABILIZATION (HIGH)

Goal: edge:profit:02 DRY_RUN → PASS; foundation seal achievable.
Requires P0 complete first.

### P1-01: Fix edge:profit:02 DRY_RUN failures

**Status:** FAIL (ec=1 on 4 steps)
**DoD:**
- [ ] EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:expectancy-proof exits 0
- [ ] All 4 DRY_RUN steps exit 0
- [ ] Regression RG_PROFIT02_DRY_RUN01 added and PASS
- [ ] NETKILL_LEDGER anomalies for profit:02 steps cleared

**NA:**
```bash
EDGE_PROFIT_DRY_RUN=1 npm run -s edge:profit:02:expectancy-proof
```

---

### P1-02: Acquire real public data for EDGE_PROFIT_00

**Status:** NEEDS_NETWORK (requires double-key unlock)
**DoD:**
- [ ] artifacts/incoming/ALLOW_NETWORK present (content: "ALLOW_NETWORK: YES")
- [ ] --enable-network CLI flag used
- [ ] edge:profit:00:acquire:public completes successfully
- [ ] artifacts/incoming/real_public_market.jsonl present
- [ ] artifacts/incoming/real_public_market.lock.json present + sha256 match
- [ ] EDGE_PROFIT_00 active_profile → real; promotion_eligible: true

**NA (when network unlocked):**
```bash
echo "ALLOW_NETWORK: YES" > artifacts/incoming/ALLOW_NETWORK
npm run -s edge:profit:00:acquire:public -- --enable-network
```

**NETWORK_REQUIRED:** true — cannot proceed without operator authorization

---

### P1-03: Foundation seal (after P0 + P1-01)

**Status:** BLOCKED (cascade from ND01)
**DoD:**
- [ ] epoch:mega:proof:x2 → PASS
- [ ] regression_no_unbounded_spawnsync gate → PASS
- [ ] PROFIT_FOUNDATION_FREEZE_GATE → foundation_frozen: true
- [ ] epoch:foundation:seal → PASS
- [ ] reports/evidence/EXECUTOR/FOUNDATION_SEAL.md STATUS: PASS

**NA:**
```bash
npm run -s epoch:foundation:seal
```

---

## P2 — PROFIT EPOCH P2 MVP (MEDIUM)

Goal: Signals lane + paper backtest + micro-live gate (must-fail) operational.
Requires P1 complete or parallel data track.

### P2-01: Signals lane — features.jsonl + features.lock.json

**Status:** PENDING (no liquidation data)
**DoD:**
- [ ] Liquidation data acquired (bybit_ws_v5 raw.jsonl) OR fixture provided
- [ ] edge:liq:replay runs with replay dataset
- [ ] features.jsonl generated with liq_pressure / burst_score / regime flags
- [ ] features.lock.json with sha256 checksum
- [ ] RG_SIG01 (schema lock) → PASS
- [ ] RG_SIG02 (determinism x2) → PASS

**NA:**
```bash
npm run -s edge:liq:replay
```
(requires data or fixture in artifacts/incoming/liquidations/)

---

### P2-02: Paper backtest with real public data

**Status:** PENDING (stub only; depends on P1-02)
**DoD:**
- [ ] active_profile → real_public OR stub fixture upgraded
- [ ] fixed seed, no wall-clock truth
- [ ] PF (profit factor) + DD (max drawdown) metrics computed
- [ ] RG_PAPER01 (determinism) → PASS
- [ ] RG_PAPER02 (no-net) → PASS
- [ ] edge:profit:00 lane_b → PASS

**NA:**
```bash
npm run -s edge:profit:00
```

---

### P2-03: Micro-live kill-switch gate (must-fail)

**Status:** LOCKED (ENABLE_MICROLIVE not present)
**DoD:**
- [ ] Kill-switch matrix defined in code
- [ ] Exposure degrade logic implemented
- [ ] RG_LIVE01: micro-live attempt WITHOUT unlock file → must exit non-0
- [ ] RG_LIVE02: kill-switch trigger → deterministic x2
- [ ] ENABLE_MICROLIVE unlock file + double-key procedures documented

**NA:**
```bash
npm run -s edge:micro:live:readiness
```

---

### P2-04: Evidence tree archival (housekeeping)

**Status:** PENDING (100+ epoch dirs in reports/evidence/)
**DoD:**
- [ ] Epochs E66-E100 (or similar range) archived to tar.gz + sha256 sidecar
- [ ] verify:repo:byte-audit:x2 runtime reduced measurably
- [ ] PR01 bloat guard PASS after archival

**NA:**
```bash
npm run -s verify:repo:byte-audit:x2
```
(measure baseline first, then archive)

---

## OPERATOR HUD SUMMARY

| Milestone | P0 | P1 | P2 | DoD |
|-----------|----|----|-----|-----|
| Cert chain unblocked | ✗ ND01+CHURN01+MISSING_RG | — | — | epoch:mega:proof:x2 PASS |
| Victory seal PASS | ✗ | — | — | VICTORY_PRECHECK clean |
| Foundation seal PASS | ✗ | ✗ | — | epoch:foundation:seal PASS |
| Profit P2 MVP | — | ✗ | ✗ | features.jsonl + paper + live-must-fail |

**CURRENT EPOCH:** BLOCKED at P0
**ONE_NEXT_ACTION:** `npm run -s verify:fast`
