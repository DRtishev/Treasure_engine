/**
 * life.mjs — ops:life — WOW Organism Single Living Command
 *
 * Orchestrates the full organism pipeline in deterministic step order:
 *   1. verify:fast         — boot gate (hard stop on fail)
 *   2. ops:eventbus:smoke  — EventBus integrity smoke
 *   3. ops:timemachine     — heartbeat tick ledger → EventBus
 *   4. ops:autopilot       — court plan + mode routing → EventBus
 *   5. ops:cockpit         — HUD from EventBus
 *   6. ops:candidates      — registry scan → EventBus
 *
 * Each step emits a STEP_COMPLETE event into the LIFE EventBus.
 * Final LIFE bus output: EPOCH-LIFE-<RUN_ID>/{EVENTS.jsonl, LIFE_SUMMARY.json, LIFE_SUMMARY.md}
 *
 * Network (R1/R3): FORBIDDEN — life.mjs is fully offline.
 *   No fetch, no http, no require('https'), no --enable-network.
 *
 * Write-scope (R5): reports/evidence/EPOCH-LIFE-<RUN_ID>/
 *   (sub-scripts write to their own EPOCH-* dirs)
 *
 * Gates: RG_LIFE01_NO_NET, RG_LIFE02_STABLE_OUTPUT, RG_LIFE03_WRITE_SCOPE
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { createBus } from './eventbus_v1.mjs';

const ROOT = process.cwd();
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-LIFE-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

// Life EventBus — uses EPOCH-EVENTBUS-LIFE-* so findAllBusJsonls aggregates it
const busDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-LIFE-${RUN_ID}`);
const bus = createBus(RUN_ID, busDir);

// ---------------------------------------------------------------------------
// Step definitions — deterministic order
// ---------------------------------------------------------------------------
const STEPS = [
  {
    id: 'S01',
    name: 'verify_fast',
    label: 'verify:fast',
    shell: true,
    cmd: 'npm run -s verify:fast',
    hard_stop: true, // abort life run on failure
  },
  {
    id: 'S02',
    name: 'ops_eventbus_smoke',
    label: 'ops:eventbus:smoke',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/eventbus_v1.mjs'],
    hard_stop: false,
  },
  {
    id: 'S03',
    name: 'ops_timemachine',
    label: 'ops:timemachine',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/timemachine_ledger.mjs'],
    hard_stop: false,
  },
  {
    id: 'S04',
    name: 'ops_autopilot',
    label: 'ops:autopilot',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/autopilot_court_v2.mjs'],
    hard_stop: false,
  },
  {
    id: 'S05',
    name: 'ops_cockpit',
    label: 'ops:cockpit',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/cockpit.mjs'],
    hard_stop: false,
  },
  {
    id: 'S06',
    name: 'ops_candidates',
    label: 'ops:candidates',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/candidate_registry.mjs'],
    hard_stop: false,
  },
];

// ---------------------------------------------------------------------------
// Run a single step
// ---------------------------------------------------------------------------
function runStep(step) {
  let result;

  if (step.shell) {
    // Shell command (e.g. npm run -s verify:fast)
    result = spawnSync(step.cmd, { cwd: ROOT, encoding: 'utf8', env: { ...process.env }, shell: true });
  } else {
    result = spawnSync(step.cmd, step.args ?? [], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  }

  const exitCode = result.status ?? 127;
  const stepStatus = exitCode === 0 ? 'PASS' : (exitCode === 2 ? 'BLOCKED' : 'FAIL');
  const stdout = (result.stdout ?? '').trim().slice(0, 300);
  const stderr = (result.stderr ?? '').trim().slice(0, 200);

  return { step_id: step.id, name: step.name, label: step.label, exit_code: exitCode, status: stepStatus, stdout, stderr };
}

// ---------------------------------------------------------------------------
// Orchestrate
// ---------------------------------------------------------------------------
console.log(`[ops:life] BOOT — RUN_ID=${RUN_ID}`);
console.log(`[ops:life] Steps: ${STEPS.map((s) => s.label).join(' → ')}`);
console.log('');

bus.append({ mode: 'CERT', component: 'LIFE', event: 'LIFE_BOOT', reason_code: 'NONE', surface: 'UX',
  attrs: { steps_total: String(STEPS.length), run_id: RUN_ID } });

const stepResults = [];
let aborted = false;
let abortReason = null;

for (const step of STEPS) {
  process.stdout.write(`  [${step.id}] ${step.label} ... `);
  const result = runStep(step);
  stepResults.push(result);

  bus.append({
    mode: 'CERT',
    component: 'LIFE',
    event: 'STEP_COMPLETE',
    reason_code: result.status === 'PASS' ? 'NONE' : `LIFE_STEP_${result.status}`,
    surface: 'UX',
    attrs: { step_id: result.step_id, step_name: result.name, step_status: result.status, exit_code: String(result.exit_code) },
  });

  console.log(result.status);
  if (result.stdout) console.log(`         ${result.stdout.split('\n').join('\n         ')}`);

  if (step.hard_stop && result.status !== 'PASS') {
    aborted = true;
    abortReason = `hard_stop on step ${step.id} (${step.label}) — exit_code=${result.exit_code}`;
    bus.append({ mode: 'CERT', component: 'LIFE', event: 'LIFE_ABORT', reason_code: 'LIFE_HARD_STOP',
      surface: 'UX', attrs: { step_id: result.step_id, reason: abortReason } });
    break;
  }
}

const failed = stepResults.filter((s) => s.status !== 'PASS' && s.status !== 'BLOCKED');
const blocked = stepResults.filter((s) => s.status === 'BLOCKED');
const lifeStatus = aborted ? 'ABORT' : (failed.length > 0 ? 'FAIL' : 'PASS');
const lifeReason = aborted ? 'LIFE_HARD_STOP' : (failed.length > 0 ? 'LIFE_STEP_FAIL' : 'NONE');

bus.append({
  mode: 'CERT',
  component: 'LIFE',
  event: 'LIFE_SEAL',
  reason_code: lifeReason,
  surface: 'UX',
  attrs: {
    steps_run: String(stepResults.length),
    steps_passed: String(stepResults.filter((s) => s.status === 'PASS').length),
    steps_failed: String(failed.length),
    steps_blocked: String(blocked.length),
    life_status: lifeStatus,
  },
});

const { jsonlPath: busJsonlPath } = bus.flush();

// ---------------------------------------------------------------------------
// Write LIFE_SUMMARY.json
// ---------------------------------------------------------------------------
writeJsonDeterministic(path.join(EPOCH_DIR, 'LIFE_SUMMARY.json'), {
  schema_version: '1.0.0',
  gate_id: 'WOW_ORGANISM_LIFE',
  run_id: RUN_ID,
  status: lifeStatus,
  reason_code: lifeReason,
  steps_total: STEPS.length,
  steps_run: stepResults.length,
  steps_passed: stepResults.filter((s) => s.status === 'PASS').length,
  steps_failed: failed.length,
  steps_blocked: blocked.length,
  aborted,
  abort_reason: abortReason ?? null,
  step_results: stepResults.map((s) => ({ step_id: s.step_id, name: s.name, status: s.status, exit_code: s.exit_code })),
  next_action: 'npm run -s verify:fast',
});

// ---------------------------------------------------------------------------
// Write LIFE_SUMMARY.md
// ---------------------------------------------------------------------------
const stepRows = stepResults.map((s) =>
  `| ${s.step_id} | ${s.label} | ${s.status} | ${s.exit_code} |`
).join('\n');

writeMd(path.join(EPOCH_DIR, 'LIFE_SUMMARY.md'), [
  `# LIFE SUMMARY — EPOCH-LIFE-${RUN_ID}`, '',
  `STATUS: ${lifeStatus}`,
  `REASON_CODE: ${lifeReason}`,
  `RUN_ID: ${RUN_ID}`,
  aborted ? `ABORT_REASON: ${abortReason}` : '',
  '',
  '## STEP LOG',
  '',
  '| Step | Command | Status | Exit Code |',
  '|------|---------|--------|-----------|',
  stepRows,
  '',
  '## NEXT_ACTION',
  'npm run -s verify:fast',
  '',
].filter((l) => l !== null).join('\n'));

// ---------------------------------------------------------------------------
// Console summary
// ---------------------------------------------------------------------------
console.log('');
console.log(`[${lifeStatus}] ops:life — ${lifeReason}`);
console.log(`  EPOCH:   ${path.relative(ROOT, EPOCH_DIR)}`);
console.log(`  EVENTS:  ${path.relative(ROOT, busJsonlPath)}`);
console.log(`  STEPS:   ${stepResults.length}/${STEPS.length} run, ${stepResults.filter((s) => s.status === 'PASS').length} PASS, ${failed.length} FAIL`);
if (aborted) console.log(`  ABORT:   ${abortReason}`);

process.exit(lifeStatus === 'PASS' ? 0 : (lifeStatus === 'ABORT' ? 2 : 1));
