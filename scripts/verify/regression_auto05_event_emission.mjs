/**
 * regression_auto05_event_emission.mjs — RG_AUTO05_EVENT_EMISSION
 *
 * Gate: autopilot_court_v2.mjs must emit state-machine events into EventBus:
 *       PLAN_CREATED (always), REFUSAL (per refusal), APPLY_ALLOWED + APPLY_EXECUTED (when apply unlocked).
 * Surface: CONTRACT
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const AP_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'autopilot_court_v2.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(AP_SCRIPT);
checks.push({ check: 'autopilot_script_exists', pass: scriptExists, detail: AP_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(AP_SCRIPT, 'utf8');
  const nonComment = content.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');

  // Check 2: Imports EventBus
  const importsEventBus = content.includes('eventbus_v1') || content.includes('createBus');
  checks.push({ check: 'imports_eventbus_v1', pass: importsEventBus, detail: 'createBus/eventbus_v1 import required' });

  // Check 3: Emits PLAN_CREATED
  const hasPlanCreated = nonComment.includes("'PLAN_CREATED'") || nonComment.includes('"PLAN_CREATED"');
  checks.push({ check: 'emits_plan_created', pass: hasPlanCreated, detail: "PLAN_CREATED event required" });

  // Check 4: Emits REFUSAL
  const hasRefusal = nonComment.includes("'REFUSAL'") || nonComment.includes('"REFUSAL"');
  checks.push({ check: 'emits_refusal_event', pass: hasRefusal, detail: "REFUSAL event required per refusal" });

  // Check 5: Emits APPLY_ALLOWED
  const hasApplyAllowed = nonComment.includes("'APPLY_ALLOWED'") || nonComment.includes('"APPLY_ALLOWED"');
  checks.push({ check: 'emits_apply_allowed', pass: hasApplyAllowed, detail: "APPLY_ALLOWED event required" });

  // Check 6: Emits APPLY_EXECUTED
  const hasApplyExecuted = nonComment.includes("'APPLY_EXECUTED'") || nonComment.includes('"APPLY_EXECUTED"');
  checks.push({ check: 'emits_apply_executed', pass: hasApplyExecuted, detail: "APPLY_EXECUTED event required" });

  // Check 7: Calls bus.flush()
  const callsFlush = nonComment.includes('bus.flush(') || nonComment.includes('.flush(');
  checks.push({ check: 'calls_bus_flush', pass: callsFlush, detail: 'bus.flush() required' });

  // Check 8: Declares eventbus_source in plan JSON
  const hasEventbusSource = nonComment.includes('eventbus_source');
  checks.push({ check: 'declares_eventbus_source', pass: hasEventbusSource, detail: 'eventbus_source: true required in PLAN.json' });

  // Check 9: Run dry-run and verify PLAN_CREATED event in EventBus
  // Count EPOCH-EVENTBUS dirs before
  const bussBefore = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-')).sort()
    : [];

  const r = spawnSync(process.execPath, [AP_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const ranOk = r.status === 0 || r.status === 2; // PASS or BLOCKED both valid for dry-run
  checks.push({
    check: 'autopilot_runs_without_crash',
    pass: ranOk,
    detail: `exit code=${r.status ?? 'null'}: ${(r.stdout || '').trim().slice(0, 120)}`,
  });

  if (ranOk) {
    // Find EPOCH-EVENTBUS-AUTOPILOT-* (component-keyed) or fallback to latest bus with AUTOPILOT events
    const allBusDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-')).sort()
      : [];
    // Prefer AUTOPILOT-keyed dir
    const apBusDirs = allBusDirs.filter((d) => d.includes('AUTOPILOT'));
    const candidateDirs = apBusDirs.length > 0 ? apBusDirs : allBusDirs;
    const latestBus = candidateDirs.length > 0 ? candidateDirs[candidateDirs.length - 1] : null;

    const busJsonlPath = latestBus ? path.join(EVIDENCE_DIR, latestBus, 'EVENTS.jsonl') : null;
    const busExists = busJsonlPath ? fs.existsSync(busJsonlPath) : false;
    checks.push({
      check: 'eventbus_jsonl_produced',
      pass: busExists,
      detail: busExists ? path.relative(ROOT, busJsonlPath) : 'No EPOCH-EVENTBUS-AUTOPILOT-*/EVENTS.jsonl found',
    });

    if (busExists) {
      const lines = fs.readFileSync(busJsonlPath, 'utf8').trim().split('\n').filter(Boolean);
      const events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const apEvents = events.filter((e) => e.component === 'AUTOPILOT');

      // Check 10: AUTOPILOT events present
      checks.push({
        check: 'eventbus_has_autopilot_events',
        pass: apEvents.length > 0,
        detail: apEvents.length > 0 ? `${apEvents.length} AUTOPILOT events found` : 'No AUTOPILOT events in bus',
      });

      // Check 11: PLAN_CREATED present
      const hasPlanCreatedEvent = apEvents.some((e) => e.event === 'PLAN_CREATED');
      checks.push({
        check: 'plan_created_event_in_bus',
        pass: hasPlanCreatedEvent,
        detail: hasPlanCreatedEvent ? 'PLAN_CREATED event found in bus' : 'PLAN_CREATED event missing from bus',
      });

      // Check 12: Tick ordering maintained
      const ticks = events.map((e) => e.tick);
      const ticksOrdered = ticks.every((t, i) => i === 0 || t > ticks[i - 1]);
      checks.push({
        check: 'events_tick_ordered',
        pass: ticksOrdered,
        detail: ticksOrdered ? 'ticks strictly increasing — OK' : `out-of-order ticks: ${ticks.join(',')}`,
      });
    }
  }

  // Check 13: APPLY_ALLOWED + APPLY_EXECUTED emitted when apply is unlocked
  // Create token file, run with --apply, check events
  const tokenDir = path.join(ROOT, 'artifacts', 'incoming');
  fs.mkdirSync(tokenDir, { recursive: true });
  const tokenPath = path.join(tokenDir, 'APPLY_AUTOPILOT');
  const hadToken = fs.existsSync(tokenPath);
  const prevContent = hadToken ? fs.readFileSync(tokenPath, 'utf8') : null;

  fs.writeFileSync(tokenPath, 'APPLY_AUTOPILOT: YES', 'utf8');
  const r2 = spawnSync(process.execPath, [AP_SCRIPT, '--apply'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });

  // Restore token state
  if (hadToken && prevContent !== null) {
    fs.writeFileSync(tokenPath, prevContent, 'utf8');
  } else if (!hadToken && fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }

  const applyRanOk = r2.status === 0;
  checks.push({
    check: 'apply_run_succeeds_with_token',
    pass: applyRanOk,
    detail: `--apply with valid token: exit code=${r2.status ?? 'null'}`,
  });

  if (applyRanOk) {
    // Find AUTOPILOT-keyed bus after apply run
    const bussApply = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-') && d.includes('AUTOPILOT')).sort()
      : [];
    const latestApplyBus = bussApply.length > 0 ? bussApply[bussApply.length - 1] : null;
    const applyBusPath = latestApplyBus ? path.join(EVIDENCE_DIR, latestApplyBus, 'EVENTS.jsonl') : null;

    if (applyBusPath && fs.existsSync(applyBusPath)) {
      const applyLines = fs.readFileSync(applyBusPath, 'utf8').trim().split('\n').filter(Boolean);
      const applyEvents = applyLines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const applyApEvents = applyEvents.filter((e) => e.component === 'AUTOPILOT');

      const hasApplyAllowedEvent = applyApEvents.some((e) => e.event === 'APPLY_ALLOWED');
      const hasApplyExecutedEvent = applyApEvents.some((e) => e.event === 'APPLY_EXECUTED');
      checks.push({ check: 'apply_allowed_event_in_bus', pass: hasApplyAllowedEvent, detail: hasApplyAllowedEvent ? 'APPLY_ALLOWED in bus' : 'APPLY_ALLOWED missing' });
      checks.push({ check: 'apply_executed_event_in_bus', pass: hasApplyExecutedEvent, detail: hasApplyExecutedEvent ? 'APPLY_EXECUTED in bus' : 'APPLY_EXECUTED missing' });
    } else {
      checks.push({ check: 'apply_eventbus_produced', pass: false, detail: 'No EVENTS.jsonl after apply run' });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AUTO05_EVENT_EMISSION_MISSING';

writeMd(path.join(EXEC, 'REGRESSION_AUTO05_EVENT_EMISSION.md'), [
  '# REGRESSION_AUTO05_EVENT_EMISSION.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_auto05_event_emission.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AUTO05_EVENT_EMISSION',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_auto05_event_emission — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
