#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { E66_ROOT, LOCK_DIR, LOCK_PATH, writeMd, ensureDir } from './e66_lib.mjs';

ensureDir(E66_ROOT);
ensureDir(LOCK_DIR);

function runOnce(label) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), `e66-${label}-`));
  const env = { ...process.env, CI: 'true', TREASURE_RUN_DIR: runDir };
  const r = spawnSync('npm', ['run', '-s', 'verify:e66'], { encoding: 'utf8', env });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const m = out.match(/fingerprint=([a-f0-9]{64})/);
  const fingerprint = m ? m[1] : '';
  return { label, status: r.status ?? 1, fingerprint, run_dir: runDir, output: out };
}

const run1 = runOnce('run1');
const run2 = runOnce('run2');
const blocked = run1.status !== 0 && run2.status !== 0;

if (blocked) {
  const reason = `critical gate verify:e66 failed twice (${run1.status}, ${run2.status})`;
  fs.writeFileSync(LOCK_PATH, `${new Date().toISOString()} ${reason}\n`);
  writeMd(path.join(E66_ROOT, 'LOCK.md'), `# E66 LOCK\n\n- reason: ${reason}\n- unlock: rm -f ${LOCK_PATH}  # add operator reason in commit message`);
}

const same = run1.fingerprint !== '' && run1.fingerprint === run2.fingerprint;
const pass = run1.status === 0 && run2.status === 0 && same;

writeMd(path.join(E66_ROOT, 'RUNS.md'), [
  '# E66 RUNS',
  `- run1_status: ${run1.status}`,
  `- run2_status: ${run2.status}`,
  `- run1_fingerprint: ${run1.fingerprint || 'N/A'}`,
  `- run2_fingerprint: ${run2.fingerprint || 'N/A'}`,
  `- deterministic_match: ${same}`
].join('\n'));

writeMd(path.join(E66_ROOT, 'VERDICT.md'), `# E66 VERDICT\n\nStatus: ${pass ? 'PASS' : 'BLOCKED'}`);
writeMd(path.join(E66_ROOT, 'PACK.md'), `# E66 PACK\n\nStatus: ${pass ? 'COMPLETE' : 'BLOCKED'}`);
writeMd(path.join(E66_ROOT, 'DIFFS.md'), '# E66 DIFFS\n\nSee RUNS.md for x2 fingerprint comparison.');

if (!pass) {
  console.error('verify:phoenix:x2 FAILED');
  process.exit(1);
}
console.log('verify:phoenix:x2 PASSED');
