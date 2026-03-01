/**
 * node_toolchain_bootstrap.mjs — ops:node:toolchain:bootstrap
 *
 * One-command bootstrap: unlock → acquire → lock.
 *
 * Step 1: ops:net:unlock   — create ALLOW_NETWORK (key 1 of 2)
 * Step 2: ops:node:toolchain:acquire --enable-network  — download + install node (key 2 of 2)
 * Step 3: ops:net:lock     — remove ALLOW_NETWORK (always attempted, even on acquire fail)
 *
 * EC=0 only if all three steps succeed.
 * EC=2 if any step fails (receipt describes which step and reason).
 *
 * After bootstrap succeeds, daily loop must pass offline:
 *   npm run -s verify:fast (x2) + npm run -s ops:life
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const SCRIPT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const ROOT_CANDIDATE = path.resolve(SCRIPT_DIR, '..', '..');
const gitRoot = spawnSync('git', ['-C', ROOT_CANDIDATE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
const ROOT = gitRoot.status === 0 ? String(gitRoot.stdout || '').trim() : ROOT_CANDIDATE;

const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const UNLOCK_SCRIPT = path.join(ROOT, 'scripts/ops/net_unlock.mjs');
const ACQUIRE_SCRIPT = path.join(ROOT, 'scripts/ops/node_toolchain_acquire.mjs');
const LOCK_SCRIPT = path.join(ROOT, 'scripts/ops/net_lock.mjs');

function runStep(label, script, args = []) {
  console.log(`  [${label}] running...`);
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const out = (r.stdout || '').trim();
  const err = (r.stderr || '').trim();
  if (out) out.split('\n').forEach((l) => console.log(`         ${l}`));
  if (err) err.split('\n').forEach((l) => console.error(`         ERR: ${l}`));
  return { label, ec: r.status ?? 2, stdout: out, stderr: err };
}

console.log('[ops:node:toolchain:bootstrap] START');
const steps = [];

// Step 1: unlock
const s1 = runStep('S1:net:unlock', UNLOCK_SCRIPT);
steps.push(s1);

if (s1.ec !== 0) {
  console.error(`  [BLOCKED] net:unlock failed (EC=${s1.ec}) — aborting bootstrap`);
  // Still attempt lock cleanup in case something was partially written
  const s3 = runStep('S3:net:lock(cleanup)', LOCK_SCRIPT);
  steps.push({ ...s3, label: 'S3:net:lock(cleanup)' });

  writeJsonDeterministic(path.join(MANUAL, 'node_toolchain_bootstrap.json'), {
    schema_version: '1.0.0',
    gate_id: 'RG_BOOTSTRAP',
    status: 'BLOCKED',
    reason_code: 'ACQ_LOCK01',
    detail: { kind: 'unlock_failed', message: `net:unlock EC=${s1.ec}`, next_action: 'npm run -s ops:node:toolchain:bootstrap' },
    run_id: RUN_ID,
    steps,
  });
  process.exit(2);
}

// Step 2: acquire (with --enable-network flag; ALLOW_NETWORK file provides second key)
const s2 = runStep('S2:toolchain:acquire', ACQUIRE_SCRIPT, ['--enable-network']);
steps.push(s2);

// Step 3: lock (ALWAYS — regardless of acquire outcome)
const s3 = runStep('S3:net:lock', LOCK_SCRIPT);
steps.push(s3);

const allOk = s2.ec === 0 && s3.ec === 0;
const status = allOk ? 'PASS' : 'BLOCKED';
const reason_code = allOk ? 'NONE' : (s2.ec !== 0 ? 'ACQ_LOCK01' : 'NET_UNLOCK01');

let detail;
if (allOk) {
  detail = { kind: 'bootstrap_complete', message: 'toolchain acquired and network locked', next_action: 'npm run -s verify:fast' };
} else if (s2.ec !== 0) {
  detail = { kind: 'acquire_failed', message: `toolchain acquire EC=${s2.ec} — lock was still applied`, next_action: 'npm run -s ops:node:toolchain:bootstrap' };
} else {
  detail = { kind: 'lock_failed', message: `net:lock EC=${s3.ec} — ALLOW_NETWORK may still be present`, next_action: 'npm run -s ops:net:lock' };
}

writeMd(path.join(EXEC, 'NODE_TOOLCHAIN_BOOTSTRAP.md'), [
  '# NODE_TOOLCHAIN_BOOTSTRAP.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `DETAIL_KIND: ${detail.kind}`,
  `DETAIL_MSG: ${detail.message}`,
  `NEXT_ACTION: ${detail.next_action}`,
  `RUN_ID: ${RUN_ID}`, '',
  '## STEPS',
  steps.map((s) => `- ${s.label}: EC=${s.ec}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'node_toolchain_bootstrap.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_BOOTSTRAP',
  status,
  reason_code,
  detail,
  run_id: RUN_ID,
  steps,
});

console.log(`[${status}] ops:node:toolchain:bootstrap — ${reason_code}`);
if (status === 'PASS') {
  console.log('  Bootstrap complete. Run: npm run -s verify:fast');
} else {
  console.log(`  BLOCKED: ${detail.message}`);
  console.log(`  NEXT:    ${detail.next_action}`);
}
process.exit(status === 'PASS' ? 0 : 2);
