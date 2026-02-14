#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { E66_ROOT, LOCK_DIR, LOCK_PATH, writeMd, ensureDir, evidenceFingerprint } from './e66_lib.mjs';

ensureDir(LOCK_DIR);


function shortSha() {
  const out = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return (out.stdout || '').trim() || 'UNKNOWN';
}

function scrubMutableFlags(src) {
  const clean = { ...src };
  for (const k of Object.keys(clean)) {
    if (k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) delete clean[k];
  }
  return clean;
}

function runOnce(label) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), `e66-${label}-`));
  const env = {
    ...scrubMutableFlags(process.env),
    CI: 'true',
    TREASURE_RUN_DIR: runDir,
    TZ: 'UTC',
    LANG: 'C',
    LC_ALL: 'C',
    SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000'
  };
  const r = spawnSync('npm', ['run', '-s', 'verify:e66'], { encoding: 'utf8', env });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const m = out.match(/fingerprint=([a-f0-9]{64})/);
  return { label, status: r.status ?? 1, fingerprint: m ? m[1] : '', run_dir: runDir };
}

const run1 = runOnce('run1');
const run2 = runOnce('run2');
const same = run1.fingerprint !== '' && run1.fingerprint === run2.fingerprint;
const pass = run1.status === 0 && run2.status === 0 && same;
const updateRequested = process.env.UPDATE_E66_EVIDENCE === '1';

if (!pass && run1.status !== 0 && run2.status !== 0) {
  const lockText = `# E66 KILL LOCK\n\n- reason: verify:e66 failed twice\n- run1_status: ${run1.status}\n- run2_status: ${run2.status}\n- run1_dir: ${run1.run_dir}\n- run2_dir: ${run2.run_dir}\n`;
  fs.writeFileSync(LOCK_PATH, lockText);
  if (updateRequested && process.env.CI !== 'true') {
    ensureDir(E66_ROOT);
    writeMd(path.join(E66_ROOT, 'LOCK.md'), `${lockText}\n- unlock: CLEAR_LOCK=1 CI=false npm run -s verify:e66`);
  }
}

if (updateRequested && process.env.CI !== 'true') {
  ensureDir(E66_ROOT);
  writeMd(path.join(E66_ROOT, 'RUNS_X2.md'), [
    '# E66 RUNS X2',
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.fingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.fingerprint || 'N/A'}`,
    `- deterministic_match: ${same}`
  ].join('\n'));
  const fp = evidenceFingerprint() || 'N/A';
  writeMd(path.join(E66_ROOT, 'CLOSEOUT.md'), [
    '# E66 CLOSEOUT',
    '',
    `- commit: ${shortSha()}`,
    `- utc: ${new Date().toISOString()}`,
    '- mode: update ritual',
    '- commands:',
    '  - CI=false UPDATE_CAS=1 UPDATE_PROVENANCE=1 UPDATE_E66_EVIDENCE=1 APPROVE_SNAPSHOTS=1 npm run -s verify:e66',
    '  - CI=false UPDATE_E66_EVIDENCE=1 npm run -s verify:phoenix:x2',
    '',
    `- evidence_fingerprint: ${fp}`,
    '- links:',
    '  - VERDICT.md',
    '  - RUNS_VERIFY.md',
    '  - RUNS_X2.md',
    '  - SHA256SUMS.md',
    '  - PROVENANCE.md',
    '  - CAS.md'
  ].join('\n'));
}

if (!pass) {
  console.error('verify:phoenix:x2 FAILED');
  process.exit(1);
}
console.log(`verify:phoenix:x2 PASSED fingerprint=${run1.fingerprint}`);
