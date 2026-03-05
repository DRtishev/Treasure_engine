# TREASURE ENGINE — OPERATOR RUNBOOK (MOBILE-FIRST)

## PHASE 0: WHERE AM I?

```bash
npm run -s doctor
```

Read the output. It always has these fields (copy-pasteable check):

| Field | Meaning |
|---|---|
| `MODE` | AUTHORITATIVE_PASS / BLOCKED / STALE |
| `NEXT_ACTION` | The ONE command you must run next |
| `AUTHORITATIVE` | true = full chain verified; false = need to run mega |
| `CAPSULE_PRESENT` | Is the pinned node tarball here? |
| `BOOTSTRAPPED_NODE_PRESENT` | Is the extracted node binary here? |
| `REASON_CODE` | Why you are in this state |

**If AUTHORITATIVE=true**: You are ready. Run NEXT_ACTION.
**If AUTHORITATIVE=false**: Run NEXT_ACTION exactly once.

---

## PHASE 1: COMMON STATES AND ACTIONS

### BLOCKED / CACHE_MISSING
```bash
CI=true npm run -s verify:mega
```

### BLOCKED / CACHE_STALE_FILESYSTEM
The capsule or boot node was deleted since last authoritative run.
```bash
CI=true npm run -s verify:mega
```
If it fails with NEED_NODE_TARBALL, you need the capsule (see Phase 2).

### STALE
Cache is more than 24 hours old.
```bash
CI=true npm run -s verify:mega
```

### BLOCKED / NEED_NODE_TARBALL
You are missing the pinned node capsule. See Phase 2.

---

## PHASE 2: GET THE CAPSULE

Place the pinned node tarball in the correct location:
```
artifacts/incoming/node/<capsule-name>
```
Then:
```bash
CI=true npm run -s verify:mega
```

To download (requires network flags):
```bash
ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 CI=true npm run -s verify:mega
```

---

## PHASE 3: EXPORT EVIDENCE (AFTER AUTHORITATIVE PASS)

```bash
npm run -s verify:mega:export
```

---

## PHASE 4: VERIFY CONTRACTS AND SEAL

```bash
npm run -s verify:mega:contracts
npm run -s verify:mega:seal_x2
```

Both must exit 0.

---

## PHASE 5: VERIFY CHECKSUMS

```bash
sha256sum -c reports/evidence/FINAL_MEGA/SHA256SUMS.md
```

All lines must say OK.

---

## VERIFICATION GATES

### verify:fast (boot check, ~seconds)

Lightweight regression gates. No E2E execution. Must pass x2 for determinism.

```bash
npm run -s verify:fast
```

**Current gate inventory (Sprint 12):**
- Toolchain: node truth, nvm ban, churn, vendored backend
- Evidence: byte audit x2, bloat guard, SSOT stable set
- Safety: kill-switch triggers, flatten, reconcile drift
- Governance: FSM states, immune integration, metaagent fleet
- Cost model: realism01 (cost contract), realism02 (no proxy metrics)
- Promotion: promo01 (contract valid)
- Canary: canary01 (policy contract)
- **S9:** realism-wiring-fast01, promo-canary-wiring-fast01
- **S10:** data-locks01 (calibration contract, acquire fail-closed, lock schema)
- **S11:** burnin-fast01 (REALITY_GAP.md, LEDGER_RECONCILE.md present)
- **S12:** canary-runbook-fast01 (RUNBOOK micro_live section, canary docs)

### verify:deep (E2E, ~minutes)

Full E2E execution gates with real pipeline paths.

```bash
npm run -s verify:deep
```

**Current gate inventory (Sprint 12):**
- Dryrun live E2E: ks01, sizer01, dryrun_live_e2e_v2, ks02 autotick, sizer02 enforced
- Cost parity: realism03 (backtest vs paper), realism04 (partial fill), realism05 (funding bounds)
- Promotion: promo-e2e01 (paper to microlive), promo-e2e02 (failclosed)
- Canary: canary-e2e01 (daily loss), canary-e2e02 (order rate)
- **S9:** realism06 (paper cost model), realism07 (dryrun cost model), promo03, canary03
- **S11:** burnin01 (multi-day burn-in, ledger reconciliation)
- **S12:** canary-session01 (micro_live canary triggers PAUSE/FLATTEN)

### victory:seal

Final seal proving all gates pass.

```bash
npm run -s epoch:victory:seal
```

---

## PROMOTION LADDER: paper -> micro_live -> small_live -> live

| Stage | Run Order | Key Constraints |
|-------|-----------|-----------------|
| **paper** | First: shadow mode only, no real orders | max_position_usd=5000, computeTotalCost SSOT |
| **micro_live** | After paper criteria met | max_exposure_usd=100, max_daily_loss_usd=10 |
| **small_live** | After micro criteria met | max_exposure_usd=1000, max_daily_loss_usd=100 |
| **live** | After small criteria met | max_exposure_usd=10000, max_daily_loss_usd=500 |

Promotion is evaluated after each paper/micro-live run via `evaluatePromotion()`.
Canary policy is checked on every tick via `evaluateCanary()` and can PAUSE/FLATTEN/REDUCE.

---

## MICRO-LIVE OPERATING PROCEDURES

### Prerequisites
1. Paper burn-in complete with LEDGER_RECONCILE.md proof
2. Promotion verdict = PROMOTE_ELIGIBLE from paper stage
3. ALLOW_NETWORK enabled (for real exchange data)
4. Canary policy configured with micro_live limits

### Canary Limits (micro_live defaults)
| Limit | Value | Action on Breach |
|-------|------:|-----------------|
| max_exposure_usd | 100 | FLATTEN |
| max_daily_loss_usd | 10 | PAUSE |
| max_orders_per_min | 5 | REDUCE |
| max_daily_loss_pct | 1% | PAUSE |

### Running micro_live
```bash
# Stage must be explicitly set — no auto-promotion
STAGE=micro_live npm run -s paper:live
```

### Canary Actions
| Action | Meaning | Response |
|--------|---------|----------|
| CONTINUE | All metrics within limits | Normal operation |
| REDUCE | Order rate too high | Slow down, skip next tick |
| PAUSE | Loss limit breached | Stop all orders, continue monitoring |
| FLATTEN | Exposure limit breached | Close all positions immediately |

### Per-Session Receipts
After each micro_live session, a receipt is generated at:
```
reports/evidence/EPOCH-V2-S12-CANARY/SESSION_RECEIPT_<run_id>.md
```

Receipt contains:
- Session start/end timestamps
- Ticks processed, fills count
- Canary events (action, reason, violations)
- Ledger summary (equity, PnL, fees)
- Promotion evaluation result

### Emergency Procedures
If canary fires FLATTEN:
1. All positions are closed
2. Session is halted
3. Review canary event log in session receipt
4. Do NOT restart without operator review

---

## EVIDENCE LOCATION

All evidence is in `reports/evidence/FINAL_MEGA/`. Key files:

- `VERDICT.md` — final authoritative/probe verdict
- `CONTRACTS.md` — all contract checks (PASS/FAIL per contract)
- `TRUTH_CACHE.md` — cached authority state (in E142_MEGA/)
- `AUTHORITY_MODEL.md` — the full authority chain explained
- `SHA256SUMS.md` — hashes of all evidence files

Sprint evidence directories:
- `reports/evidence/EPOCH-V2-S9-BASELINE/` — Sprint 9 baseline snapshot
- `reports/evidence/EPOCH-V2-S9-AUDIT/` — Sprint 9 final audit
- `reports/evidence/EPOCH-V2-S10-BASELINE/` — Sprint 10 calibration receipt
- `reports/evidence/EPOCH-V2-S11-BURNIN/` — Sprint 11 burn-in (REALITY_GAP, LEDGER_RECONCILE)
- `reports/evidence/EPOCH-V2-S12-CANARY/` — Sprint 12 canary session receipts
- `reports/evidence/EXECUTOR/gates/manual/` — individual gate receipts (JSON)

### How to read receipts

Each gate writes two files:
1. `reports/evidence/EXECUTOR/GATE_NAME.md` — human-readable report
2. `reports/evidence/EXECUTOR/gates/manual/gate_name.json` — machine-readable receipt

Receipt JSON has: `status`, `reason_code`, `run_id`, `checks[]`, `failed_checks[]`

---

## CONTRACTS (freeze protocol)

Frozen contracts live under `artifacts/contracts/`. To update:

1. Modify the source contract file
2. Run the contract check gate to verify
3. If hash changed, update the frozen hash in the contract lock
4. Verify with `npm run -s verify:fast` x2

---

## NETWORK MODES

| NET_CLASS | Meaning |
|---|---|
| `OFFLINE` | No proxy, no network flags |
| `PROXY_ONLY` | Proxy detected, net flags not set |
| `ONLINE_LIMITED` | Flags set but WS blocked |
| `ONLINE_OK` | Full network available |

Default: OFFLINE (safe). Network tests require explicit opt-in.

---

## WHAT "AUTHORITATIVE" MEANS

All of these must be true simultaneously:
1. Capsule present AND sha256 matches pinned hash
2. Bootstrap node extracted and healthy
3. Bridge (pinned node -v) exits 0
4. Representative gate (e137_run.mjs via pinned node) exits 0

Doctor cross-validates the cached state against live filesystem every read.
If artifacts disappear after an authoritative run: `CACHE_STALE_FILESYSTEM`.
