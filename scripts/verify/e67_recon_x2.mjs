#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalStringify } from '../../core/edge/contracts.mjs';
import { spawnSync } from 'node:child_process';
import { E67_ROOT, E67_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e67_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const root = process.cwd();
const update = process.env.UPDATE_E67_EVIDENCE === '1';
if (process.env.CI === 'true' && update) {
  throw new Error('UPDATE_E67_EVIDENCE=1 forbidden when CI=true');
}

function scrubMutableFlags(src) {
  const clean = { ...src };
  for (const k of Object.keys(clean)) {
    if (k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) delete clean[k];
  }
  return clean;
}

function runEdgeEpoch(tempRoot, epoch) {
  const env = {
    ...scrubMutableFlags(process.env),
    ...defaultNormalizedEnv(),
    CI: 'true',
    EVIDENCE_ROOT: tempRoot,
    EVIDENCE_EPOCH: 'E67-EDGE-RECON',
    UPDATE_GOLDENS: '0'
  };
  const r = spawnSync('npm', ['run', '-s', `verify:epoch${epoch}`], { encoding: 'utf8', env, cwd: root });
  return { status: r.status ?? 1, stdout: `${r.stdout || ''}${r.stderr || ''}` };
}

function buildReconFingerprint(tempRoot, epochs) {
  const joined = {};
  for (const epoch of epochs) {
    const file = path.join(tempRoot, 'E67-EDGE-RECON', `epoch${epoch}`, 'CONTRACT_OUTPUTS.json');
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    joined[`epoch${epoch}`] = Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, v?.deterministic_fingerprint || null]));
  }
  const canonical = canonicalStringify(joined);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function runOnce(label, epochsToRun, epochsForFingerprint) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e67-${label}-`));
  const steps = [];
  for (const epoch of epochsToRun) {
    const r = runEdgeEpoch(tempRoot, epoch);
    steps.push({ epoch, status: r.status });
    if (r.status !== 0) return { label, status: r.status, tempRoot, reconFingerprint: '', steps };
  }
  const reconFingerprint = buildReconFingerprint(tempRoot, epochsForFingerprint);
  return { label, status: 0, tempRoot, reconFingerprint, steps };
}

const epochsToRun = ['31','32','33','34','35','36','37','38','39','40'];
const epochsForFingerprint = ['31','32','33','34','35','36','37','38','39','40'];
const run1 = runOnce('run1', epochsToRun, epochsForFingerprint);
const run2 = runOnce('run2', epochsToRun, epochsForFingerprint);
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.reconFingerprint === run2.reconFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

const doubleFailure = run1.status !== 0 && run2.status !== 0;
const deterministicMismatch = run1.status === 0 && run2.status === 0 && run1.reconFingerprint !== run2.reconFingerprint;
if (!pass && (doubleFailure || deterministicMismatch)) {
  ensureDir(path.dirname(E67_LOCK_PATH));
  fs.writeFileSync(E67_LOCK_PATH, [
    '# E67 KILL LOCK',
    '',
    `- reason: ${doubleFailure ? 'verify:edge:recon:x2 failed twice' : 'deterministic mismatch across run1/run2'}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_recon_fingerprint: ${run1.reconFingerprint || 'N/A'}`,
    `- run2_recon_fingerprint: ${run2.reconFingerprint || 'N/A'}`,
    `- run1_temp: ${run1.tempRoot}`,
    `- run2_temp: ${run2.tempRoot}`
  ].join('\n') + '\n');
}

if (update && process.env.CI !== 'true') {
  ensureDir(E67_ROOT);
  writeMd(path.join(E67_ROOT, 'RUNS_RECON_X2.md'), [
    '# E67 RUNS RECON X2',
    `- epochs_ran: ${epochsToRun.join(', ')}`,
    `- epochs_fingerprint_set: ${epochsForFingerprint.join(', ')}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_recon_fingerprint: ${run1.reconFingerprint || 'N/A'}`,
    `- run2_recon_fingerprint: ${run2.reconFingerprint || 'N/A'}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
}

if (!pass) {
  console.error('verify:edge:recon:x2 FAILED');
  if (update && process.env.CI !== 'true' && run1.reconFingerprint && run2.reconFingerprint && run1.reconFingerprint !== run2.reconFingerprint) {
    ensureDir(E67_ROOT);
    writeMd(path.join(E67_ROOT, 'DIFFS.md'), [
      '# E67 DIFFS',
      `- run1_recon_fingerprint: ${run1.reconFingerprint}`,
      `- run2_recon_fingerprint: ${run2.reconFingerprint}`,
      '- note: mismatch detected between independent recon runs'
    ].join('\n'));
  }
  process.exit(1);
}

console.log(`verify:edge:recon:x2 temp_roots run1=${run1.tempRoot} run2=${run2.tempRoot}`);
console.log(`verify:edge:recon:x2 PASSED recon_fingerprint=${run1.reconFingerprint}`);
