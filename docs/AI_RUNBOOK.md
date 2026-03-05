# AI_RUNBOOK.md — Treasure Engine Operational Runbook for AI Agents

> Authoritative operational guide. Primary SSOT: [AGENTS.md](../AGENTS.md)

---

## 1. STARTUP PROTOCOL

Every AI session MUST begin with:

```bash
npm run -s verify:fast
```

Expected output: all lines show `[PASS]`. If any `[FAIL]` or `[BLOCKED]`:
1. Run `npm run -s epoch:victory:triage`
2. Read the output reason_code
3. Fix root cause before proceeding

---

## 2. GATE EXECUTION ORDER

```
1. ops:node:toolchain:acquire   (node version enforcement)
2. verify:repo:byte-audit:x2    (repo manifest stability x2)
3. verify:regression:*          (regression suite)
```

Never skip gates. Never claim PASS without evidence.

---

## 2b. VERIFY CHAINS: FAST vs DEEP

### verify:fast (boot gate)
- **Purpose:** Structural/regression checks (grep, import, AST, manifest)
- **Budget:** ≤ 80ms per gate, ≤ 6s total wall-clock
- **Run order:** Always first, always x2 (anti-flake)
- **Gate count:** 48+ gates (as of Sprint 5c)
- **Command:** `npm run -s verify:fast`

### verify:deep (integration gate)
- **Purpose:** E2E tests that instantiate real components (MasterExecutor, SafetyLoop, LiveAdapterDryRun)
- **Budget:** ≤ 60s total
- **Run order:** After verify:fast passes
- **Gate count:** 5 gates (as of Sprint 5c):
  1. `regression_profit_e2e_ks01` — Kill switch FLATTEN → orders blocked
  2. `regression_profit_e2e_sizer01` — Tier violation → order rejected
  3. `dryrun_live_e2e_v2` — Full offline execution path
  4. `regression_profit_e2e_ks02_autotick` — SafetyLoop auto-tick (no manual evaluate)
  5. `regression_profit_e2e_sizer02_enforced` — Sizer enforcement with REDUCE tier downgrade
- **Command:** `npm run -s verify:deep`

### Reading evidence
- All gates write to `reports/evidence/EXECUTOR/`
- MD reports: `REGRESSION_*.md`, `DRYRUN_*.md`
- JSON gates: `gates/manual/*.json`
- Each JSON has: `schema_version`, `status`, `reason_code`, `run_id`, `checks[]`
- Sprint audit reports: `reports/evidence/EPOCH-V2-S{N}-AUDIT/`

---

## 3. MODE SELECTION

| Situation | Mode | Allowed |
|-----------|------|---------|
| Running verification gates | CERT | Offline, artifacts/**, EPOCH-*/** |
| Reading SSOT docs only | AUDIT | EXECUTOR/docs reads only |
| Investigating external data | RESEARCH | Double-key network unlock |
| Speed experiments | ACCEL | Never authoritative |

---

## 4. TIMEMACHINE LEDGER (WOW7)

The TimeMachine ledger provides a tick-based heartbeat log with zero timestamps (deterministic).

```bash
npm run -s ops:timemachine
```

Output: `reports/evidence/EPOCH-TIMEMACHINE-<RUN_ID>/`
- `TIMELINE.jsonl` — one JSON object per line, tick-only, no timestamp fields
- `TIMELINE.md` — human-readable tick log

**Design invariants:**
- Ticks are monotonically increasing integers (no wall-clock time)
- Every entry has: `tick`, `event`, `context` (no `_at`, `_ts`, `timestamp` fields)
- Ordering is deterministic: same input => same tick sequence
- Two runs produce byte-identical TIMELINE.jsonl (modulo RUN_ID header)

---

## 5. AUTOPILOT COURT V2 (WOW8)

Autopilot routes actions and refuses when policy is violated.

```bash
# Dry-run (safe, always allowed)
npm run -s ops:autopilot

# Apply mode (requires double-key unlock)
npm run -s ops:autopilot -- --apply
```

**Apply double-key unlock:**
1. Pass `--apply` flag
2. Create `artifacts/incoming/APPLY_AUTOPILOT` with content: `APPLY_AUTOPILOT: YES`

Output: `reports/evidence/EPOCH-AUTOPILOTV2-<RUN_ID>/`
- `PLAN.md` — human-readable action plan
- `PLAN.json` — machine-readable plan
- `REFUSAL.md` — written when autopilot refuses an action

**Mode routing rules:**
- CERT mode: no network, write-scope enforced
- RESEARCH mode: no CERT scripts, network requires double-key
- Apply without double-key: AUTO04_APPLY_UNLOCK_REQUIRED

---

## 6. EVIDENCE HANDLING

### Write locations (CERT mode)
```
artifacts/**                         <- incoming/outgoing artifacts
reports/evidence/EPOCH-<RUN_ID>/**   <- runtime evidence (gitignored)
reports/evidence/EXECUTOR/**         <- AUDIT SSOT docs (NEVER from CERT)
```

### Forbidden writes from CERT
- `reports/evidence/EXECUTOR/**` → CHURN01
- Any path outside allowed roots → CHURN01

---

## 7. REPORT FORMAT

Every agent report MUST include all 7 fields:

```markdown
## SNAPSHOT
<current state description>

## WHAT_CHANGED
- path/to/file1
- path/to/file2

## COMMANDS_EXECUTED
- `npm run -s verify:fast` => EC=0
- `npm run -s ops:timemachine` => EC=0

## GATE_MATRIX
| Gate | Status | Reason | Surface |
|------|--------|--------|---------|
| RG_AGENT01_AGENTS_PRESENT | PASS | NONE | UX |

## EVIDENCE_PATHS
- reports/evidence/EPOCH-XYZ/gates/manual/...

## VERDICT
PASS

## ONE_NEXT_ACTION
npm run -s verify:fast
```

---

## 8. REASON CODES

Common codes and their meaning:

| Code | Meaning |
|------|---------|
| CHURN01 | Write outside allowed scope |
| NETV01 | Network attempt in offline mode |
| AUTO04_APPLY_UNLOCK_REQUIRED | Apply without double-key |
| ND_BYTE01 | Nondeterminism detected |
| RDY01 | Not ready to proceed |
| QA01_NO_TESTS | Missing regression gate |

---

## 9. ANTI-PATTERNS (never do these)

- Claim PASS without running commands
- Skip determinism ×2 requirement
- Write timestamps in JSON gate outputs
- Use CERT scripts while network is enabled
- Amend existing commits instead of creating new ones
- Push to wrong branch
- Skip regression gate when fixing a bug

---

## 10. QUICK LINKS

- [AGENTS.md](../AGENTS.md) — core rules SSOT
- [CLAUDE.md](../CLAUDE.md) — exec summary
- [docs/AI_TEMPLATES/](./AI_TEMPLATES/) — templates
- [RUNBOOK.md](../RUNBOOK.md) — project runbook
- [docs/DOCTRINE.md](./DOCTRINE.md) — determinism/evidence doctrine
