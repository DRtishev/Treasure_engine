# RUNBOOK_EDGE.md — Operational Runbook
version: 2.0.0 | last_updated: 2026-02-20

## Purpose

Step-by-step operational procedures for the EDGE_LAB system. This runbook covers routine operations, incident response, and recovery procedures.

---

## Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| **DIAGNOSIS** | `npm run edge:doctor` | Show all gate statuses without running pipeline |
| Run all courts | `npm run edge:all` | Full 14-step pipeline |
| Run epoch gate | `npm run edge:next-epoch` | Full epoch promotion gate |
| Anti-flake check | `npm run edge:all:x2` | Run edge:all twice, check determinism |
| Ledger verify | `npm run edge:ledger` | SHA256 tamper-check (acyclic) |
| Validate registry | `npm run edge:registry` | Registry court only |
| Check sources | `npm run edge:sources` | Sources audit |
| Check dataset | `npm run edge:dataset` | Dataset contract compliance |
| Check execution | `npm run edge:execution` | Execution model validation |
| Run sensitivity grid | `npm run edge:execution:grid` | Sensitivity analysis |
| Ingest paper evidence | `npm run edge:paper:ingest` | Reads artifacts/incoming/paper_evidence.json |
| Check execution reality | `npm run edge:execution:reality` | Uses MEASURED if paper evidence available |
| Check risk FSM | `npm run edge:risk` | Risk FSM validation |
| Check overfit | `npm run edge:overfit` | Overfit court |
| Run red team | `npm run edge:redteam` | Red team assessment |
| Check SRE | `npm run edge:sre` | SLO/SLI and error budget |
| Micro-live readiness | `npm run edge:micro:live:readiness` | Prerequisite gate check |
| Generate verdict | `npm run edge:verdict` | Final verdict |

---

## Routine Operations

### RO-01: Weekly Registry Review
**Frequency:** Every Monday
**Responsible:** Operator

Steps:
1. Review any status changes needed based on recent trial results
2. Update trials_count in HACK_REGISTRY.md for any trials completed
3. Update oos_periods if new OOS validation was completed
4. Run `npm run edge:registry` to validate schema compliance
5. Update REGISTRY_CHANGELOG.md with any changes made
6. Commit changes to git

---

### RO-02: Monthly Full Court Run
**Frequency:** First Monday of each month
**Responsible:** Operator

Steps:
1. Ensure all HACK_REGISTRY.md updates are committed
2. Run `npm run edge:all`
3. Review VERDICT.md in reports/evidence/EDGE_LAB/
4. Review any FAIL or WARNING conditions
5. File action items in POSTMORTEM_TEMPLATE.md if any courts failed
6. Update EVIDENCE_INDEX.md if needed
7. Archive evidence files to dated folder: `reports/evidence/EDGE_LAB/archive/YYYY-MM/`

---

### RO-03: New Hack Intake
**Frequency:** As needed
**Responsible:** Operator

Steps:
1. Create RESEARCH_INTAKE.md entry for the proposed hack
2. Determine dependency_class and truth_tag
3. Verify required data sources exist (or plan acquisition)
4. Add hack to HACK_REGISTRY.md with status=DRAFT and trials_count=0
5. Add REGISTRY_CHANGELOG.md entry: `CREATED`
6. Run `npm run edge:registry` to verify schema compliance
7. If EXTERNAL / NEEDS_DATA, add to DATASET_CONTRACT.md with acquisition plan
8. Notify team of new hypothesis

---

### RO-04: Advancing Hack to TESTING
**Preconditions:**
- Hack is in DRAFT status
- All required data is available (truth_tag != UNAVAILABLE)
- Initial trial plan is documented in TRIALS_LEDGER.md

Steps:
1. Schedule first optimization run (minimum 10 trials)
2. Run optimization using Walk-Forward Protocol (Type B preferred)
3. Update TRIALS_LEDGER.md with trial results
4. Update trials_count in HACK_REGISTRY.md
5. Update oos_periods in HACK_REGISTRY.md
6. Change status to TESTING
7. Add REGISTRY_CHANGELOG.md entry: `STATUS_CHANGE DRAFT → TESTING`
8. Run `npm run edge:overfit` to check overfit rules
9. Run `npm run edge:all` to confirm no court failures

---

### RO-05: Promoting Hack to ELIGIBLE
**Preconditions:**
- Hack is in TESTING status
- All courts pass (edge:all produces PASS)
- OOS Sharpe >= 0.5 in all OOS windows
- Walk-forward protocol complete (WALK_FORWARD_PROTOCOL.md requirements met)
- Red team scenarios all SURVIVE or SURVIVE_WITH_MITIGATION
- Execution sensitivity ESS >= 60%

Steps:
1. Run `npm run edge:all` and confirm full PASS
2. Review VERDICT.md
3. Update hack status to ELIGIBLE in HACK_REGISTRY.md
4. Add REGISTRY_CHANGELOG.md entry: `STATUS_CHANGE TESTING → ELIGIBLE`
5. File evidence report in reports/evidence/EDGE_LAB/
6. Notify team: hack is ready for deployment consideration
7. Create deployment proposal (separate process)

---

## Incident Response

### IR-01: Data Feed Failure
**Symptom:** No new bars received for > 10 bar periods

Steps:
1. Check exchange API status (https://status.binance.com)
2. Check network connectivity to exchange
3. Check API rate limits (are we throttled?)
4. If API down: Risk FSM should auto-transition to EMERGENCY (S4)
5. If FSM did NOT auto-transition: manually trigger EMERGENCY halt
6. Open all existing stop-loss orders remain active (do NOT cancel)
7. Do NOT place new orders until data feed restored
8. Document in incident log
9. When data feed restored: validate last bar timestamps before resuming
10. If data gap > 4h: run gap-fill validation before resuming
11. File postmortem if gap > 30 minutes

---

### IR-02: Execution Failure / Order Rejection
**Symptom:** Order placed but not confirmed within 2 seconds

Steps:
1. Check order status via exchange API
2. If order is rejected: log error, do NOT retry immediately
3. Check for error code:
   - Insufficient margin → Risk FSM HALT; notify operator
   - Rate limit → Wait 60 seconds; retry once
   - Invalid price → Check signal price vs. current price; may be stale signal
   - Unknown error → Risk FSM HALT; notify operator
4. If order is pending (not filled): check exchange order book depth
5. If filled at unexpected price: check slippage vs. SLO-03 threshold
6. Document all execution failures in execution log
7. If 3+ failures in 1 hour: Risk FSM HALT; file postmortem

---

### IR-03: Position Mismatch Detected
**Symptom:** System position != Exchange position

Steps:
1. Do NOT place any new orders
2. Query exchange for current position (authoritative source)
3. Compare with system's recorded position
4. Identify discrepancy: size, direction, or instrument
5. **Do NOT auto-reconcile to exchange position** — escalate to operator
6. Operator manually reviews exchange trade history
7. Update system position to match exchange (authoritative)
8. Identify root cause: missed fill confirmation? duplicate order? race condition?
9. File postmortem immediately (severity HIGH)
10. Resume only after operator approval

---

### IR-04: Risk FSM Halt
**Symptom:** FSM transitions to HALTED (S3) or EMERGENCY (S4)

Steps:
1. Confirm all existing stop-loss orders are active
2. Do NOT place new orders
3. Identify the trigger condition (from FSM audit log)
4. Review current P&L and drawdown
5. If EMERGENCY: check for data integrity issues
6. Investigate trigger root cause
7. Wait minimum 24h cooldown in RECOVERY (S5)
8. Operator review before returning to NOMINAL (S0)
9. File postmortem

---

## Maintenance Procedures

### MP-01: Updating HACK_REGISTRY.md
Always follow these steps:
1. Read current file completely before editing
2. Make changes
3. Run `npm run edge:registry` to validate
4. Fix any validation errors
5. Update REGISTRY_CHANGELOG.md
6. Commit with descriptive message

### MP-02: Archiving Evidence Files
Monthly archive procedure:
```bash
mkdir -p reports/evidence/EDGE_LAB/archive/$(date +%Y-%m)
cp reports/evidence/EDGE_LAB/*.md reports/evidence/EDGE_LAB/archive/$(date +%Y-%m)/
```

### MP-03: Running edge:all in CI
For CI/CD integration:
```bash
npm run edge:all
echo "Exit code: $?"
```
Expected output: `[PASS] EDGE_LAB verdict: ELIGIBLE` (or appropriate status)
CI should fail if exit code != 0.

---

### MP-04: Submitting Paper Trading Evidence

After completing a paper trading epoch, submit evidence:

1. Generate `artifacts/incoming/paper_evidence.json` following the schema in `EDGE_LAB/PAPER_EVIDENCE_SPEC.md`
2. Required: `schema_version: "1.0.0"`, minimum 30 trades per candidate
3. Run `npm run edge:paper:ingest` to validate and ingest
4. If PASS: run `npm run edge:all` to regenerate courts with MEASURED mode
5. Check that EXECUTION_REALITY_COURT.md shows `expectancy_mode: MEASURED`
6. Run `npm run edge:doctor` to verify PAPER_EVIDENCE gate is PASS
7. Run `npm run edge:next-epoch` to re-evaluate promotion eligibility

**Common trap:** Schema validation fails → fix all fields per `PAPER_EVIDENCE_SPEC.md`, especially:
- `schema_version` must be exactly `"1.0.0"` (string)
- `avg_loser_pct` must be <= 0 (negative or zero — it's a loss)
- `generated_at` must be ISO 8601 timestamp format

---

### MP-05: Diagnosing BLOCKED Epoch Gate

When `npm run edge:next-epoch` returns BLOCKED:

1. Run `npm run edge:doctor` — shows all gate statuses at a glance
2. Check `MEGA_CLOSEOUT_NEXT_EPOCH.md` for which gate is BLOCKED
3. For NEEDS_DATA gates (PAPER_EVIDENCE, EXECUTION_REALITY): see MP-04
4. For core court FAIL: check individual court .md file for REASON_CODE
5. For NONDETERMINISM: run `npm run edge:all:x2` to isolate which file is drifting
6. For LEDGER_MISMATCH: ensure edge:all ran before edge:ledger (ledger reads current EVIDENCE_DIR)

---

### MP-06: Verifying Anti-Flake Independence

To verify that the producer pipeline is deterministic (independent of next-epoch readiness):

```bash
npm run edge:all:x2
```

Expected: `[PASS] edge:all:x2` — both runs produce identical SHA256 fingerprints.

**If FAIL:** The drift files are listed in `ANTI_FLAKE_INDEPENDENCE.md`.
Common causes:
- A script writes the current timestamp without using `stableEvidenceNormalize()`
- A script includes system-specific paths or environment variables
- Non-deterministic sorting (e.g., using `Object.keys()` on unordered maps)

Fix: apply `stableEvidenceNormalize()` to all generated .md file content.

---

### MP-07: Verifying Ledger Acyclicity

The ledger (SHA256SUMS.md) excludes its own outputs from scope to prevent circular hashing.
This is enforced by `edge:ledger` and proven by `LEDGER_ACYCLICITY.md`.

To verify acyclicity after a clean run:
```bash
npm run edge:ledger
cat reports/evidence/EDGE_LAB/LEDGER_ACYCLICITY.md
```
Expected: `STATUS: PASS`

**If BLOCKED (LEDGER_MISMATCH):** This means evidence files changed between ledger scope calculation and verification. Re-run `npm run edge:all` first to rebuild a clean evidence state, then re-run `npm run edge:ledger`.

---

## Common Traps

| Trap | Symptom | Fix |
|------|---------|-----|
| Running edge:next-epoch before edge:all | CONTRACT_DRIFT: missing files | Run `npm run edge:all` first |
| Paper evidence submitted after pipeline | PAPER_EVIDENCE status stale | Re-run `npm run edge:all` after ingest |
| Ledger run after next-epoch (old bug, now fixed) | Was: LEDGER_MISMATCH | Fixed: SHA256SUMS.md excluded from scope |
| edge:all:x2 shows NONDETERMINISM | Drift in .md files | Apply stableEvidenceNormalize() to the source |
| ANTI_FLAKE_X2 PASS but edge:all:x2 FAIL | Different normalization paths | Both use stableEvidenceNormalize — check for new timestamp fields |
| Paper evidence trade_count < 30 | NEEDS_DATA (insufficient) | Complete more paper trades before submitting |
| Schema version mismatch | BLOCKED: SCHEMA_VALIDATION_FAILED | Use schema_version: "1.0.0" exactly |
