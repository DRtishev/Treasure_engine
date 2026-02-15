#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { E74_ROOT, E74_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e74_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E74_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E74_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}

function scrub(env) {
  const clean = { ...env };
  for (const k of Object.keys(clean)) if (k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) delete clean[k];
  return clean;
}

function runPrepInTemp(label, seed) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e74-${label}-`));
  const env = { ...scrub(process.env), ...defaultNormalizedEnv(), CI: 'true', SEED: String(seed), TREASURE_RUN_DIR: tempRoot };
  const steps = [
    ['node', ['scripts/verify/e74_contract_snapshots.mjs']],
    ['node', ['scripts/verify/e74_contract_court.mjs']]
  ];
  for (const [cmd, args] of steps) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', env });
    if ((r.status ?? 1) !== 0) return { status: 1, tempRoot, error: `${cmd} ${args.join(' ')} failed` };
  }
  const files = ['CONTRACT_SNAPSHOT_PREV.md', 'CONTRACT_SNAPSHOT_NEW.md', 'CONTRACT_COURT.md', 'CONTRACT_DIFF.md', 'CONTRACT_CHANGELOG.md', 'CONTRACT_COURT_SELFTEST.md'];
  const chunks = files.map((f) => fs.readFileSync(path.join(E74_ROOT, f), 'utf8'));
  const payload = JSON.stringify({ seed: String(seed), files, chunks }, null, 2);
  return { status: 0, tempRoot, runFingerprint: crypto.createHash('sha256').update(payload).digest('hex') };
}

const baseSeed = Number(process.env.SEED || '12345');
const run1Seed = Number(process.env.E74_RUN1_SEED || baseSeed);
const run2Seed = Number(process.env.E74_RUN2_SEED || (process.env.FORCE_E74_MISMATCH === '1' ? baseSeed + 99 : baseSeed));
const run1 = runPrepInTemp('run1', run1Seed);
const run2 = runPrepInTemp('run2', run2Seed);
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint === run2.runFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

const doubleFail = run1.status !== 0 && run2.status !== 0;
const mismatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint !== run2.runFingerprint;
if (!pass && (doubleFail || mismatch)) {
  ensureDir(path.dirname(E74_LOCK_PATH));
  writeMd(E74_LOCK_PATH, [
    '# E74 KILL LOCK',
    `- reason: ${doubleFail ? 'verify:edge:contract:x2 failed twice' : 'deterministic mismatch across run1/run2'}`,
    `- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH) * 1000).toISOString()}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_root: ${run1.tempRoot}`,
    `- run2_root: ${run2.tempRoot}`
  ].join('\n'));
}
if (pass && fs.existsSync(E74_LOCK_PATH) && process.env.CI !== 'true') fs.rmSync(E74_LOCK_PATH, { force: true });

if (update && process.env.CI !== 'true') {
  ensureDir(E74_ROOT);
  writeMd(path.join(E74_ROOT, 'RUNS_EDGE_CONTRACT_X2.md'), [
    '# E74 RUNS EDGE CONTRACT X2',
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
} else {
  const p = path.join(E74_ROOT, 'RUNS_EDGE_CONTRACT_X2.md');
  if (!fs.existsSync(p)) throw new Error('missing RUNS_EDGE_CONTRACT_X2.md');
}

if (!pass) throw new Error('verify:edge:contract:x2 FAILED');
console.log(`verify:edge:contract:x2 PASSED run_fingerprint=${run1.runFingerprint}`);
