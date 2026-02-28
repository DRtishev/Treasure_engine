/**
 * regression_time03_eventbus_source.mjs — RG_TIME03_EVENTBUS_SOURCE
 *
 * Gate: timemachine_ledger.mjs must emit heartbeat events into EventBus.
 *       TIMELINE.jsonl must be derived from EVENTS.jsonl (reducer pattern).
 *       timemachine may not scan filesystem mtimes for ordering.
 * Surface: DATA
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
const TM_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'timemachine_ledger.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(TM_SCRIPT);
checks.push({ check: 'timemachine_script_exists', pass: scriptExists, detail: TM_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(TM_SCRIPT, 'utf8');
  const nonComment = content.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');

  // Check 2: Imports EventBus
  const importsEventBus = content.includes('eventbus_v1') || content.includes('createBus');
  checks.push({ check: 'imports_eventbus_v1', pass: importsEventBus, detail: 'createBus/eventbus_v1 import required' });

  // Check 3: Uses createBus
  const usesCreateBus = nonComment.includes('createBus(');
  checks.push({ check: 'uses_create_bus', pass: usesCreateBus, detail: 'createBus() call required' });

  // Check 4: Calls bus.flush()
  const callsFlush = nonComment.includes('bus.flush(') || nonComment.includes('.flush(');
  checks.push({ check: 'calls_bus_flush', pass: callsFlush, detail: 'bus.flush() required to persist events' });

  // Check 5: Calls bus.reduce() or bus.events() for timeline derivation
  const usesReducer = nonComment.includes('bus.reduce(') || nonComment.includes('reduceTimeline') || nonComment.includes('bus.events(');
  checks.push({ check: 'uses_bus_reducer', pass: usesReducer, detail: 'timeline must be derived via bus.reduce/events()' });

  // Check 6: No mtime usage in non-comment code
  const usesMtime = nonComment.includes('mtime') || nonComment.includes('mtimeMs');
  checks.push({ check: 'no_mtime_ordering', pass: !usesMtime, detail: usesMtime ? 'FORBIDDEN: mtime used for ordering' : 'no mtime — OK' });

  // Check 7: Declares eventbus_source flag in output
  const hasEventbusSourceFlag = content.includes('eventbus_source');
  checks.push({ check: 'declares_eventbus_source_flag', pass: hasEventbusSourceFlag, detail: 'eventbus_source: true required in SUMMARY.json' });

  // Check 8: Run timemachine and verify EventBus output created
  const r = spawnSync(process.execPath, [TM_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const ranOk = r.status === 0;
  checks.push({ check: 'timemachine_runs_ok', pass: ranOk, detail: `exit code=${r.status ?? 'null'}: ${(r.stdout || '').trim().slice(0, 120)}` });

  if (ranOk) {
    // Find EPOCH-EVENTBUS-TIMEMACHINE-* (component-keyed bus dir) or any EPOCH-EVENTBUS-* with TIMEMACHINE events
    const allBusDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-')).sort()
      : [];
    // Prefer TIMEMACHINE-keyed dir; fallback to any bus dir
    const tmBusDirs = allBusDirs.filter((d) => d.includes('TIMEMACHINE'));
    const candidateDirs = tmBusDirs.length > 0 ? tmBusDirs : allBusDirs;
    const latestBus = candidateDirs.length > 0 ? candidateDirs[candidateDirs.length - 1] : null;

    const busJsonlPath = latestBus ? path.join(EVIDENCE_DIR, latestBus, 'EVENTS.jsonl') : null;
    const busExists = busJsonlPath ? fs.existsSync(busJsonlPath) : false;
    checks.push({
      check: 'eventbus_jsonl_produced',
      pass: busExists,
      detail: busExists ? path.relative(ROOT, busJsonlPath) : 'No EPOCH-EVENTBUS-TIMEMACHINE-*/EVENTS.jsonl found',
    });

    if (busExists) {
      // Check 9: EVENTS.jsonl contains TIMEMACHINE events
      const lines = fs.readFileSync(busJsonlPath, 'utf8').trim().split('\n').filter(Boolean);
      const events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const tmEvents = events.filter((e) => e.component === 'TIMEMACHINE');
      checks.push({
        check: 'eventbus_has_timemachine_events',
        pass: tmEvents.length > 0,
        detail: tmEvents.length > 0 ? `${tmEvents.length} TIMEMACHINE events found` : 'No TIMEMACHINE events in EVENTS.jsonl',
      });

      // Check 10: Events are tick-ordered (no mtime dependency)
      const ticks = events.map((e) => e.tick);
      const ticksOrdered = ticks.every((t, i) => i === 0 || t > ticks[i - 1]);
      checks.push({
        check: 'events_tick_ordered',
        pass: ticksOrdered,
        detail: ticksOrdered ? 'ticks strictly increasing — OK' : `out-of-order ticks: ${ticks.join(',')}`,
      });

      // Check 11: LEDGER_BOOT and LEDGER_SEAL present
      const hasLedgerBoot = tmEvents.some((e) => e.event === 'LEDGER_BOOT');
      const hasLedgerSeal = tmEvents.some((e) => e.event === 'LEDGER_SEAL');
      checks.push({ check: 'has_ledger_boot_event', pass: hasLedgerBoot, detail: 'LEDGER_BOOT event required in bus' });
      checks.push({ check: 'has_ledger_seal_event', pass: hasLedgerSeal, detail: 'LEDGER_SEAL event required in bus' });

      // Check 12: TIMELINE.jsonl matches bus reducer (same events)
      const tmDirs = fs.existsSync(EVIDENCE_DIR)
        ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-TIMEMACHINE-')).sort()
        : [];
      const latestTm = tmDirs.length > 0 ? tmDirs[tmDirs.length - 1] : null;
      if (latestTm) {
        const timelineJsonl = path.join(EVIDENCE_DIR, latestTm, 'TIMELINE.jsonl');
        if (fs.existsSync(timelineJsonl)) {
          const tlLines = fs.readFileSync(timelineJsonl, 'utf8').trim().split('\n').filter(Boolean);
          const tlEvents = tlLines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
          const tlCount = tlEvents.length;
          const busSourceCount = tmEvents.length;
          checks.push({
            check: 'timeline_count_matches_bus',
            pass: tlCount === busSourceCount,
            detail: `TIMELINE has ${tlCount} entries, EVENTBUS TIMEMACHINE has ${busSourceCount} events`,
          });
        } else {
          checks.push({ check: 'timeline_jsonl_exists', pass: false, detail: 'TIMELINE.jsonl not found' });
        }
      } else {
        checks.push({ check: 'timemachine_epoch_dir_exists', pass: false, detail: 'No EPOCH-TIMEMACHINE-* dir found' });
      }
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'TIME03_NO_EVENTBUS_SOURCE';

writeMd(path.join(EXEC, 'REGRESSION_TIME03_EVENTBUS_SOURCE.md'), [
  '# REGRESSION_TIME03_EVENTBUS_SOURCE.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_time03_eventbus_source.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_TIME03_EVENTBUS_SOURCE',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_time03_eventbus_source — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
