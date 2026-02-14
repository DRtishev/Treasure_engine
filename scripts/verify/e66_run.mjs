#!/usr/bin/env node
import fs from 'node:fs';
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

function gitStatus() {
  const out = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return (out.stdout || '').trim();
}

for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && process.env[k] === '1') {
    console.error(`verify:e66 FAILED\n- ${k}=1 forbidden when CI=true`);
    process.exit(1);
  }
}

const updateRequested = process.env.UPDATE_CAS === '1' || process.env.UPDATE_PROVENANCE === '1' || process.env.UPDATE_E66_EVIDENCE === '1' || process.env.APPROVE_SNAPSHOTS === '1';

try {
  requireNoLock();
} catch (e) {
  if (updateRequested && process.env.CI !== 'true') writeMd(path.join(E66_ROOT, 'LOCK.md'), `# E66 LOCK\n\n- reason: ${String(e.message)}`);
  console.error(`verify:e66 FAILED\n- ${String(e.message)}`);
  process.exit(1);
}

const before = gitStatus();
const steps = [
  ['verify:snapshots', ['npm', 'run', '-s', 'verify:snapshots']],
  ['verify:cas', ['npm', 'run', '-s', 'verify:cas']],
  ['verify:provenance', ['npm', 'run', '-s', 'verify:provenance']]
];

const logs = [];
for (const [name, cmd] of steps) {
  const r = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8', env });
  logs.push({ name, status: r.status ?? 1 });
  if ((r.status ?? 1) !== 0) {
    if (updateRequested && process.env.CI !== 'true') {
      writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: BLOCKED');
      writeMd(path.join(E66_ROOT, 'RUNS_VERIFY.md'), `# E66 RUNS VERIFY\n\n- failed_step: ${name}`);
    }
    console.error(`verify:e66 FAILED at ${name}`);
    process.exit(1);
  }
}

let fingerprint = evidenceFingerprint();
if (!fingerprint) {
  if (updateRequested && process.env.CI !== 'true') {
    writeMd(path.join(E66_ROOT, 'RUNS_VERIFY.md'), '# E66 RUNS VERIFY\n\n- bootstrap: true');
    writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: COMPLETE');
  }
  fingerprint = evidenceFingerprint();
}

if (!fingerprint) {
  console.error('verify:e66 FAILED\n- fingerprint unavailable (missing evidence artifacts)');
  process.exit(1);
}

if (updateRequested && process.env.CI !== 'true') {
  writeMd(path.join(E66_ROOT, 'RUNS_VERIFY.md'), [
    '# E66 RUNS VERIFY',
    `- ci: ${process.env.CI || ''}`,
    `- fingerprint: ${fingerprint}`,
    ...logs.map((x) => `- ${x.name}: ${x.status === 0 ? 'PASS' : 'FAIL'}`)
  ].join('\n'));
  const x2Path = path.join(E66_ROOT, 'RUNS_X2.md');
  if (!fs.existsSync(x2Path)) {
    writeMd(x2Path, '# E66 RUNS X2\n\n- status: PENDING (run CI=false UPDATE_E66_EVIDENCE=1 npm run -s verify:phoenix:x2)');
  }
  writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: COMPLETE');
}

if (process.env.E66_SKIP_EVIDENCE_VERIFY !== '1' && (!updateRequested || process.env.UPDATE_E66_EVIDENCE === '1')) {
  const evidence = spawnSync('npm', ['run', '-s', 'verify:evidence'], { stdio: 'inherit', env });
  if ((evidence.status ?? 1) !== 0) {
    console.error('verify:e66 FAILED at verify:evidence');
    process.exit(1);
  }
}

const after = gitStatus();
if (before !== after && (process.env.CI === 'true' || !updateRequested)) {
  console.error(`verify:e66 FAILED\n- ${process.env.CI === 'true' ? 'CI_READ_ONLY_VIOLATION' : 'READ_ONLY_VIOLATION'}`);
  process.exit(1);
}
console.log(`verify:e66 PASSED fingerprint=${fingerprint}`);
