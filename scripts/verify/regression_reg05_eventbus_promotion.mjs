/**
 * regression_reg05_eventbus_promotion.mjs — RG_REG05_EVENTBUS_PROMOTION
 *
 * Gate: candidate_registry.mjs must support explicit --input-epoch flag (no mtime),
 *       emit REGISTRY_CREATED and CANDIDATE_PROMOTED events into EventBus.
 *       REGISTRY.json must declare eventbus_source: true and input_epoch field.
 * Surface: PROFIT
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
const REG_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'candidate_registry.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(REG_SCRIPT);
checks.push({ check: 'registry_script_exists', pass: scriptExists, detail: REG_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(REG_SCRIPT, 'utf8');
  const nonComment = content.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');

  // Check 2: Supports --input-epoch flag
  const hasInputEpoch = content.includes('--input-epoch') || content.includes('INPUT_EPOCH');
  checks.push({ check: 'supports_input_epoch_flag', pass: hasInputEpoch, detail: '--input-epoch flag required (no mtime/auto-latest)' });

  // Check 3: Imports EventBus
  const importsEventBus = content.includes('eventbus_v1') || content.includes('createBus');
  checks.push({ check: 'imports_eventbus_v1', pass: importsEventBus, detail: 'createBus/eventbus_v1 import required' });

  // Check 4: Emits REGISTRY_CREATED
  const hasRegistryCreated = nonComment.includes("'REGISTRY_CREATED'") || nonComment.includes('"REGISTRY_CREATED"');
  checks.push({ check: 'emits_registry_created', pass: hasRegistryCreated, detail: "REGISTRY_CREATED event required" });

  // Check 5: Emits CANDIDATE_PROMOTED
  const hasCandidatePromoted = nonComment.includes("'CANDIDATE_PROMOTED'") || nonComment.includes('"CANDIDATE_PROMOTED"');
  checks.push({ check: 'emits_candidate_promoted', pass: hasCandidatePromoted, detail: "CANDIDATE_PROMOTED event required" });

  // Check 6: Declares eventbus_source in output
  const hasEventbusSource = nonComment.includes('eventbus_source');
  checks.push({ check: 'declares_eventbus_source', pass: hasEventbusSource, detail: 'eventbus_source: true required in REGISTRY.json' });

  // Check 7: Declares input_epoch in output
  const hasInputEpochOutput = nonComment.includes('input_epoch');
  checks.push({ check: 'declares_input_epoch_field', pass: hasInputEpochOutput, detail: 'input_epoch field required in REGISTRY.json' });

  // Check 8: Calls bus.flush()
  const callsFlush = nonComment.includes('bus.flush(') || nonComment.includes('.flush(');
  checks.push({ check: 'calls_bus_flush', pass: callsFlush, detail: 'bus.flush() required' });

  // Check 9: Run without --input-epoch and verify EventBus output + REGISTRY_CREATED
  const r = spawnSync(process.execPath, [REG_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const ranOk = r.status === 0 || r.status === 2;
  checks.push({
    check: 'registry_runs_without_crash',
    pass: ranOk,
    detail: `exit code=${r.status ?? 'null'}: ${(r.stdout || '').trim().slice(0, 120)}`,
  });

  if (ranOk) {
    // Find latest EPOCH-EVENTBUS-REGISTRY-* (component-keyed, consistent with auto05 pattern)
    // Using REGISTRY-keyed filter to avoid lexicographic collision with TIMEMACHINE
    const allBusDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-')).sort()
      : [];
    const registryBusDirs = allBusDirs.filter((d) => d.includes('REGISTRY'));
    const candidateDirs = registryBusDirs.length > 0 ? registryBusDirs : allBusDirs;
    const latestBus = candidateDirs.length > 0 ? candidateDirs[candidateDirs.length - 1] : null;
    const busJsonlPath = latestBus ? path.join(EVIDENCE_DIR, latestBus, 'EVENTS.jsonl') : null;
    const busExists = busJsonlPath ? fs.existsSync(busJsonlPath) : false;

    checks.push({
      check: 'eventbus_jsonl_produced',
      pass: busExists,
      detail: busExists ? path.relative(ROOT, busJsonlPath) : 'No EPOCH-EVENTBUS-*/EVENTS.jsonl found',
    });

    if (busExists) {
      const lines = fs.readFileSync(busJsonlPath, 'utf8').trim().split('\n').filter(Boolean);
      const events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const regEvents = events.filter((e) => e.component === 'REGISTRY');

      checks.push({
        check: 'eventbus_has_registry_events',
        pass: regEvents.length > 0,
        detail: regEvents.length > 0 ? `${regEvents.length} REGISTRY events found` : 'No REGISTRY events in bus',
      });

      const hasRegistryCreatedEvent = regEvents.some((e) => e.event === 'REGISTRY_CREATED');
      checks.push({
        check: 'registry_created_event_in_bus',
        pass: hasRegistryCreatedEvent,
        detail: hasRegistryCreatedEvent ? 'REGISTRY_CREATED in bus' : 'REGISTRY_CREATED missing',
      });
    }

    // Find latest EPOCH-REGISTRY-* and verify eventbus_source
    const regDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-REGISTRY-')).sort()
      : [];
    const latestReg = regDirs.length > 0 ? regDirs[regDirs.length - 1] : null;
    const regJsonPath = latestReg ? path.join(EVIDENCE_DIR, latestReg, 'REGISTRY.json') : null;

    if (regJsonPath && fs.existsSync(regJsonPath)) {
      const reg = JSON.parse(fs.readFileSync(regJsonPath, 'utf8'));
      checks.push({
        check: 'registry_json_has_eventbus_source',
        pass: reg.eventbus_source === true,
        detail: `eventbus_source=${reg.eventbus_source}`,
      });
      checks.push({
        check: 'registry_json_has_input_epoch_field',
        pass: 'input_epoch' in reg,
        detail: 'input_epoch' in reg ? `input_epoch=${reg.input_epoch}` : 'input_epoch field missing',
      });
    } else {
      checks.push({ check: 'registry_json_found', pass: false, detail: 'No REGISTRY.json found' });
    }
  }

  // Check 10: --input-epoch with a valid but nonexistent epoch returns gracefully (no crash)
  const r2 = spawnSync(process.execPath, [REG_SCRIPT, '--input-epoch', 'EPOCH-SWEEP-NONEXISTENT'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env },
  });
  const graceful = r2.status === 0 || r2.status === 2; // should pass (0 candidates)
  checks.push({
    check: 'input_epoch_nonexistent_graceful',
    pass: graceful,
    detail: `--input-epoch nonexistent: exit code=${r2.status ?? 'null'}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REG05_EVENTBUS_PROMOTION_MISSING';

writeMd(path.join(EXEC, 'REGRESSION_REG05_EVENTBUS_PROMOTION.md'), [
  '# REGRESSION_REG05_EVENTBUS_PROMOTION.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_reg05_eventbus_promotion.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_REG05_EVENTBUS_PROMOTION',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_reg05_eventbus_promotion — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
