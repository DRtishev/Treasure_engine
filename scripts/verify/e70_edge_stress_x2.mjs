#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runEdgeStressSuiteV1 } from '../../core/edge/alpha/edge_magic_stress_suite_v1.mjs';
import { E70_LOCK_PATH, E70_ROOT, ensureDir, defaultNormalizedEnv } from './e70_lib.mjs';
import { stableJson, sha256Text, writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E70_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E70_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}

function runOnce(label, seed) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e70-${label}-`));
  try {
    const report = runEdgeStressSuiteV1({ seed });
    const runFingerprint = sha256Text(stableJson(report));
    return { status: 0, tempRoot, report, runFingerprint, seed };
  } catch (error) {
    return { status: 1, tempRoot, report: null, runFingerprint: '', seed, error: String(error?.message || error) };
  }
}

const baseSeed = Number(process.env.SEED || '12345');
const run1Seed = Number(process.env.E70_RUN1_SEED || baseSeed);
const run2Seed = Number(process.env.E70_RUN2_SEED || (process.env.FORCE_E70_MISMATCH === '1' ? baseSeed + 17 : baseSeed));
const run1 = runOnce('run1', run1Seed);
const run2 = runOnce('run2', run2Seed);
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint === run2.runFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

const doubleFailure = run1.status !== 0 && run2.status !== 0;
const deterministicMismatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint !== run2.runFingerprint;
if (!pass && (doubleFailure || deterministicMismatch)) {
  ensureDir(path.dirname(E70_LOCK_PATH));
  writeMd(E70_LOCK_PATH, [
    '# E70 KILL LOCK',
    '',
    `- reason: ${doubleFailure ? 'verify:edge:stress:x2 failed twice' : 'deterministic mismatch across run1/run2'}`,
    `- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH) * 1000).toISOString()}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_temp: ${run1.tempRoot}`,
    `- run2_temp: ${run2.tempRoot}`
  ].join('\n'));
}
if (pass && fs.existsSync(E70_LOCK_PATH) && process.env.CI !== 'true') fs.rmSync(E70_LOCK_PATH, { force: true });

if (update && process.env.CI !== 'true') {
  ensureDir(E70_ROOT);
  writeMd(path.join(E70_ROOT, 'RUNS_EDGE_STRESS_X2.md'), [
    '# E70 RUNS EDGE STRESS X2',
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
}

if (!pass) {
  console.error('verify:edge:stress:x2 FAILED');
  process.exit(1);
}
console.log(`verify:edge:stress:x2 temp_roots run1=${run1.tempRoot} run2=${run2.tempRoot}`);
console.log(`verify:edge:stress:x2 PASSED run_fingerprint=${run1.runFingerprint}`);
console.log(`verify:edge:stress:x2 env=${JSON.stringify(defaultNormalizedEnv())}`);
