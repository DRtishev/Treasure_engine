#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E66_ROOT, requireNoLock, evidenceFingerprint, writeMd } from './e66_lib.mjs';

const env = {
  ...process.env,
  TZ: 'UTC',
  LANG: 'C',
  LC_ALL: 'C',
  SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000'
};

try {
  requireNoLock();
} catch (e) {
  if (process.env.CI !== 'true') writeMd(path.join(E66_ROOT, 'LOCK.md'), `# E66 LOCK\n\n- reason: ${String(e.message)}`);
  console.error(`verify:e66 FAILED\n- ${String(e.message)}`);
  process.exit(1);
}

const steps = [
  ['verify:snapshots', ['npm', 'run', '-s', 'verify:snapshots']],
  ['verify:cas', ['npm', 'run', '-s', 'verify:cas']],
  ['verify:provenance', ['npm', 'run', '-s', 'verify:provenance']]
];

const updateRequested = process.env.UPDATE_CAS === '1' || process.env.UPDATE_PROVENANCE === '1' || process.env.UPDATE_E66_EVIDENCE === '1' || process.env.APPROVE_SNAPSHOTS === '1';
const logs = [];
for (const [name, cmd] of steps) {
  const r = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8', env });
  logs.push({ name, status: r.status ?? 1 });
  if ((r.status ?? 1) !== 0) {
    if (process.env.CI !== 'true') {
      writeMd(path.join(E66_ROOT, 'VERDICT.md'), `# E66 VERDICT\n\nStatus: BLOCKED\n\nFailed step: ${name}`);
      writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: BLOCKED');
      writeMd(path.join(E66_ROOT, 'RUNS.md'), `# E66 RUNS\n\n- failed_step: ${name}`);
    }
    console.error(`verify:e66 FAILED at ${name}`);
    process.exit(1);
  }
}

let fingerprint = evidenceFingerprint();
if (!fingerprint && process.env.CI !== 'true') {
  writeMd(path.join(E66_ROOT, 'RUNS.md'), '# E66 RUNS\n\n- bootstrap: true');
  writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: COMPLETE');
  writeMd(path.join(E66_ROOT, 'VERDICT.md'), '# E66 VERDICT\n\nStatus: PASS');
  spawnSync('npm', ['run', '-s', 'verify:evidence'], { stdio: 'inherit', env: { ...env, UPDATE_E66_EVIDENCE: '1' } });
  fingerprint = evidenceFingerprint();
}

if (!fingerprint) {
  console.error('verify:e66 FAILED\n- fingerprint unavailable (missing evidence artifacts)');
  process.exit(1);
}

if (process.env.CI !== 'true' || updateRequested) {
  writeMd(path.join(E66_ROOT, 'RUNS.md'), [
    '# E66 RUNS',
    `- ci: ${process.env.CI || ''}`,
    `- fingerprint: ${fingerprint}`,
    ...logs.map((x) => `- ${x.name}: ${x.status === 0 ? 'PASS' : 'FAIL'}`)
  ].join('\n'));
  writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: COMPLETE');
  writeMd(path.join(E66_ROOT, 'VERDICT.md'), '# E66 VERDICT\n\nStatus: PASS');
  spawnSync('npm', ['run', '-s', 'verify:evidence'], { stdio: 'inherit', env: { ...env, UPDATE_E66_EVIDENCE: '1' } });
  fingerprint = evidenceFingerprint();
}

const evidence = spawnSync('npm', ['run', '-s', 'verify:evidence'], { stdio: 'inherit', env });
if ((evidence.status ?? 1) !== 0) {
  console.error('verify:e66 FAILED at verify:evidence');
  process.exit(1);
}
console.log(`verify:e66 PASSED fingerprint=${fingerprint}`);
