# TREASURE ENGINE — OPERATOR RUNBOOK
**Version**: 1.0 (EPOCH-15)  
**Last Updated**: 2026-02-10  
**Target Audience**: Production operators, SREs, on-call engineers

---

## 🎯 QUICK START: 3-MINUTE DIAGNOSTIC

### Step 1: Check Run Status (30 seconds)
```bash
# Get latest run
ls -lt reports/*.json | head -5

# Check if run completed
tail -20 reports/court_report.json | grep "status"

# Quick event count
wc -l logs/events/run_*.jsonl
```

**Good**: court_report.json exists, status=complete, events >100  
**Bad**: No reports, status=error, events <10

---

### Step 2: Check Gates (60 seconds)
```bash
# Run all verification gates
npm run verify:e2
npm run verify:phase2
npm run verify:determinism
npm run verify:persist
npm run verify:dryrun-live
npm run verify:events
```

**Good**: All exit code 0  
**Bad**: Any gate fails (exit code ≠ 0)

**If gates fail**: Jump to [Gate Failures](#gate-failures)

---

### Step 3: Check Event Log (90 seconds)
```bash
# Validate event log structure
node scripts/verify/events_schema_check.mjs

# Check for errors/criticals
grep -E '"level":"(ERROR|CRITICAL)"' logs/events/run_*.jsonl

# Check for specific issues
grep "RISK.*breach" logs/events/run_*.jsonl
grep "RECON.*mismatch" logs/events/run_*.jsonl
grep "EXEC.*error" logs/events/run_*.jsonl
```

**Good**: verify passes, no CRITICAL events, <5% ERROR rate  
**Bad**: Schema errors, CRITICAL events present, >10% ERROR rate

---

## 📊 DIAGNOSTIC PROCEDURES

### How to Diagnose a Bad Run

#### Symptom: Run Crashed / No Output
```bash
# 1. Check system events
grep '"category":"SYS"' logs/events/run_*.jsonl | tail -20

# 2. Look for error cascade
grep '"level":"ERROR"' logs/events/run_*.jsonl | head -10

# 3. Check for exception in last 50 events
tail -50 logs/events/run_*.jsonl | grep -i "exception\|error\|crash"
```

**Common Causes**:
- Data gap → Check DATA category events
- Risk halt → Check RISK category events  
- Adapter failure → Check EXEC category events

---

#### Symptom: Orders Not Executing
```bash
# 1. Check execution events
grep '"category":"EXEC"' logs/events/run_*.jsonl | grep "order_placed\|order_filled"

# 2. Check risk blocks
grep '"category":"RISK"' logs/events/run_*.jsonl | grep "limit_exceeded\|halt"

# 3. Check adapter status
grep "adapter" logs/events/run_*.jsonl | tail -20
```

**Common Causes**:
- Risk limits hit (daily loss, position size)
- Adapter offline/error
- Intent validation failed

---

#### Symptom: Reconciliation Mismatches
```bash
# 1. Check reconciliation report
cat reports/recon_report.json | jq '.mismatches'

# 2. Check reconciliation events
grep '"category":"RECON"' logs/events/run_*.jsonl

# 3. Get mismatch codes
grep "recon_mismatch" logs/events/run_*.jsonl | jq '.payload.code'
```

**Common Mismatch Codes**:
- **PRICE_MISMATCH**: Slippage exceeded tolerance
- **FEE_MISMATCH**: Fee calculation error
- **MISSING_FILL**: Order filled but not recorded
- **ORDER_STATE_DRIFT**: Order status inconsistency

**Action**: Check adapter logs, verify network latency, review tolerance settings

---

### How to Prove Determinism

```bash
# 1. Run twice with same inputs
npm run sim:all
cp reports/court_report.json reports/court_report_run1.json

npm run sim:all  
cp reports/court_report.json reports/court_report_run2.json

# 2. Canonicalize and diff
npm run verify:determinism

# 3. Check diff output
cat evidence/diffs/determinism_diff.txt
```

**Expected**: Empty diff (all outputs identical)  
**If non-empty**: Check for Date.now() or Math.random() in code paths

---

### How to Replay a Run from DB/Events

```bash
# 1. Extract run parameters
grep "run_start" logs/events/run_*.jsonl | jq '.payload'

# 2. Get dataset SHA
grep "dataset_loaded" logs/events/run_*.jsonl | jq '.payload.dataset_sha'

# 3. Replay with same parameters
node core/sim/engine.mjs \
  --run_id=replay_001 \
  --dataset=<dataset_sha> \
  --seed=<run_seed>
```

---

## 🚨 COMMON ISSUES & FIXES

### Gate Failures

#### verify:e2 fails
**Symptom**: Schema validation errors  
**Fix**:
```bash
# Check which schema failed
npm run verify:e2 2>&1 | grep "FAIL"

# Common fix: Update schema in truth/
# Then re-run
npm run verify:e2
```

---

#### verify:determinism fails
**Symptom**: Non-deterministic outputs  
**Fix**:
```bash
# 1. Check violation count
cat evidence/diffs/determinism_diff.txt

# 2. Find offending code
grep -r "Math.random\|Date.now" core/ --exclude-dir=node_modules

# 3. Replace with ctx.rng / ctx.clock
# See: core/sys/context.mjs
```

---

#### verify:persist fails
**Symptom**: Database errors  
**Fix**:
```bash
# 1. Check database file
ls -lh data/*.db

# 2. Reset if corrupted
rm data/test_persist_idempotency.db
npm run verify:persist
```

---

#### verify:events fails
**Symptom**: Event schema violations  
**Fix**:
```bash
# 1. Get first validation error
npm run verify:events 2>&1 | grep "Error:" | head -1

# 2. Check event structure
tail -20 logs/test_events/run_*.jsonl

# 3. Fix event emission in code
# Ensure all fields present: ts_ms, run_id, category, event_type
```

---

### Data Issues

#### Data Gap Detected
```bash
# 1. Find gap location
grep "data_gap_detected" logs/events/run_*.jsonl

# 2. Check bar indices
grep '"category":"DATA"' logs/events/run_*.jsonl | \
  jq '.payload.bar_idx' | sort -n

# 3. Re-fetch or interpolate data
```

#### Duplicate Timestamps
```bash
# 1. Find duplicates
grep "t_ms" logs/events/run_*.jsonl | \
  jq '.payload.bar.t_ms' | sort | uniq -d

# 2. Check data source
# 3. De-duplicate before ingestion
```

---

### Risk Management

#### Daily Loss Limit Hit
```bash
# 1. Check current PnL
grep "daily_loss_limit" logs/events/run_*.jsonl | tail -1

# 2. Get limit value
cat spec/ssot.json | jq '.risk.daily_loss_limit_usd'

# 3. Reset (next day only) or override (with approval)
```

#### Position Limit Exceeded
```bash
# 1. Check position sizes
grep "position_updated" logs/events/run_*.jsonl | \
  jq '.payload.position_usd'

# 2. Check limit
cat spec/ssot.json | jq '.risk.max_position_size_usd'

# 3. Close positions or increase limit (with risk approval)
```

---

## 📋 OPERATIONAL CHECKLISTS

### Pre-Run Checklist
- [ ] All gates passing (verify:e2, verify:phase2, verify:determinism, etc.)
- [ ] Database available (if persistence enabled)
- [ ] Dataset validated (SHA256 matches expected)
- [ ] SSOT unchanged (spec/ssot.json)
- [ ] Risk limits appropriate for market conditions
- [ ] No pending alerts from previous runs

### Post-Run Checklist
- [ ] Run completed successfully (check SYS events)
- [ ] All orders reconciled (verify:dryrun-live or check recon_report.json)
- [ ] No CRITICAL events in log
- [ ] PnL within expected range
- [ ] Position sizes within limits
- [ ] Reports generated (court_report.json, eqs_report.json)

### End-of-Day Checklist
- [ ] Archive event logs (tar.gz and move to archive/)
- [ ] Backup database (if persistence enabled)
- [ ] Review daily PnL vs risk limits
- [ ] Check for repeated errors (analyze ERROR events)
- [ ] Update runbook if new issues found

---

## 🔧 MAINTENANCE TASKS

### Daily
- Check event log size (rotate if >100MB)
- Review ERROR/WARN event trends
- Validate latest run determinism

### Weekly
- Run full gate suite (all 6+ gates)
- Check for code pattern violations (verify:determinism)
- Review reconciliation accuracy (recon_report.json trends)
- Update fixtures if needed (data/fixtures/live/)

### Monthly
- Audit event schemas (truth/*.schema.json)
- Review operator runbook (this doc)
- Test disaster recovery (DB restore, replay from events)
- Performance benchmarks (gate execution times)

---

## 📞 ESCALATION

### When to Escalate
- **CRITICAL event detected** → Page on-call engineer immediately
- **>5 consecutive gate failures** → Escalate to engineering team
- **Reconciliation mismatch >10 orders** → Halt trading, escalate to trading desk
- **Data corruption suspected** → Stop all runs, escalate to data team

### Escalation Contacts
- On-Call Engineer: [Team Slack Channel]
- Trading Desk: [Trading Lead]
- Data Team: [Data Engineering Lead]
- Risk Management: [Risk Officer]

---

## 📚 REFERENCE

### Important Files
- **spec/ssot.json**: Single source of truth (configuration)
- **spec/config.schema.json**: Configuration validation schema
- **truth/event.schema.json**: Event structure schema
- **truth/events_report.schema.json**: Events report schema
- **reports/*.json**: Run outputs (court, EQS, reconciliation)
- **logs/events/*.jsonl**: Event logs (JSONL format)

### Useful Commands
```bash
# Quick stats
npm run verify:e2
npm run verify:events

# Replay run
node core/sim/engine.mjs --run_id=replay_001

# Analyze events
cat logs/events/run_*.jsonl | jq -s 'group_by(.category) | map({category: .[0].category, count: length})'

# Find slow operations
cat logs/events/run_*.jsonl | jq 'select(.payload.duration_ms > 1000)'

# Get error summary
cat logs/events/run_*.jsonl | jq 'select(.level=="ERROR") | .event_type' | sort | uniq -c
```

---

## 🆘 EMERGENCY PROCEDURES

### Emergency Halt
```bash
# 1. Stop all running processes
pkill -f "node.*engine"

# 2. Set emergency flag
echo '{"status":"EMERGENCY_HALT"}' > data/emergency.flag

# 3. Notify trading desk immediately

# 4. Document reason
echo "Reason: [DESCRIBE ISSUE]" >> data/emergency.log
```

### Emergency Rollback
```bash
# 1. Check previous working version
git log --oneline | head -10

# 2. Rollback code
git checkout <working_commit_sha>

# 3. Verify gates
npm run verify:e2
npm run verify:determinism

# 4. Resume operations (if gates pass)
```

---

**END OF RUNBOOK**

For updates or questions, contact: Engineering Team
