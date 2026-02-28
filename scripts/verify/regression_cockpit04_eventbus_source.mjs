/**
 * regression_cockpit04_eventbus_source.mjs — RG_COCKPIT04_EVENTBUS_SOURCE
 *
 * Gate: cockpit.mjs must read timemachine+autopilot from EventBus, not mtime.
 *       HUD.json must declare eventbus_source: true.
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
const COCKPIT_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'cockpit.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(COCKPIT_SCRIPT);
checks.push({ check: 'cockpit_script_exists', pass: scriptExists, detail: COCKPIT_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(COCKPIT_SCRIPT, 'utf8');
  const nonComment = content.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');

  // Check 2: Imports EventBus
  const importsEventBus = content.includes('eventbus_v1') || content.includes('readBus') || content.includes('findLatestBusJsonl');
  checks.push({ check: 'imports_eventbus', pass: importsEventBus, detail: 'readBus/findLatestBusJsonl import required' });

  // Check 3: Uses readBus
  const usesReadBus = nonComment.includes('readBus(');
  checks.push({ check: 'uses_read_bus', pass: usesReadBus, detail: 'readBus() call required' });

  // Check 4: Uses findLatestBusJsonl
  const usesFindLatest = nonComment.includes('findLatestBusJsonl(');
  checks.push({ check: 'uses_find_latest_bus_jsonl', pass: usesFindLatest, detail: 'findLatestBusJsonl() required' });

  // Check 5: No mtime in non-comment code
  const usesMtime = nonComment.includes('mtime') || nonComment.includes('mtimeMs');
  checks.push({ check: 'no_mtime_in_cockpit', pass: !usesMtime, detail: usesMtime ? 'FORBIDDEN: mtime in cockpit' : 'no mtime — OK' });

  // Check 6: Declares eventbus_source in output
  const hasEventbusSource = nonComment.includes('eventbus_source');
  checks.push({ check: 'declares_eventbus_source', pass: hasEventbusSource, detail: 'eventbus_source: true required in HUD.json' });

  // Check 7: run timemachine first to populate bus, then run cockpit
  const r = spawnSync(process.execPath, [COCKPIT_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const ranOk = r.status === 0 || r.status === 1; // both valid for cockpit (1=some gates not green)
  const crashed = r.status !== null && r.status >= 2;
  checks.push({
    check: 'cockpit_runs_without_crash',
    pass: !crashed,
    detail: `exit code=${r.status ?? 'null'}: ${(r.stdout || '').trim().slice(0, 120)}`,
  });

  if (!crashed) {
    // Find latest EPOCH-COCKPIT-*
    const cockpitDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-COCKPIT-')).sort()
      : [];
    const latestCockpit = cockpitDirs.length > 0 ? cockpitDirs[cockpitDirs.length - 1] : null;
    const hudJsonPath = latestCockpit ? path.join(EVIDENCE_DIR, latestCockpit, 'HUD.json') : null;
    const hudExists = hudJsonPath ? fs.existsSync(hudJsonPath) : false;

    checks.push({
      check: 'hud_json_produced',
      pass: hudExists,
      detail: hudExists ? path.relative(ROOT, hudJsonPath) : 'No HUD.json found',
    });

    if (hudExists) {
      const hud = JSON.parse(fs.readFileSync(hudJsonPath, 'utf8'));

      // Check 8: eventbus_source: true in HUD
      checks.push({
        check: 'hud_eventbus_source_true',
        pass: hud.eventbus_source === true,
        detail: `eventbus_source=${hud.eventbus_source}`,
      });

      // Check 9: timemachine section has source field
      const tmSource = hud.sections?.timemachine?.source;
      checks.push({
        check: 'timemachine_section_has_source',
        pass: typeof tmSource === 'string',
        detail: `timemachine.source=${tmSource ?? 'MISSING'}`,
      });

      // Check 10: autopilot section has source field
      const apSource = hud.sections?.autopilot?.source;
      checks.push({
        check: 'autopilot_section_has_source',
        pass: typeof apSource === 'string',
        detail: `autopilot.source=${apSource ?? 'MISSING'}`,
      });

      // Check 11: eventbus section present
      const hasEventbusSection = hud.sections?.eventbus !== undefined;
      checks.push({
        check: 'eventbus_section_in_hud',
        pass: hasEventbusSection,
        detail: hasEventbusSection ? `events_n=${hud.sections.eventbus.events_n}` : 'eventbus section missing from HUD',
      });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'COCKPIT04_NO_EVENTBUS_SOURCE';

writeMd(path.join(EXEC, 'REGRESSION_COCKPIT04_EVENTBUS_SOURCE.md'), [
  '# REGRESSION_COCKPIT04_EVENTBUS_SOURCE.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cockpit04_eventbus_source.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_COCKPIT04_EVENTBUS_SOURCE',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cockpit04_eventbus_source — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
