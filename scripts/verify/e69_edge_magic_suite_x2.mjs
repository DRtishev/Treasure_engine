#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runEdgeMagicSuiteV2 } from '../../core/edge/alpha/edge_magic_suite_v2.mjs';
import { E69_LOCK_PATH, E69_ROOT, ensureDir, defaultNormalizedEnv } from './e69_lib.mjs';
import { stableJson, sha256Text, writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E69_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E69_EVIDENCE=1 forbidden when CI=true');
for (const key of Object.keys(process.env)) {
  if ((key.startsWith('UPDATE_') || key.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[key] || '').trim() !== '') {
    throw new Error(`${key} forbidden when CI=true`);
  }
}

function runOnce(label) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e69-${label}-`));
  const envNorm = defaultNormalizedEnv();
  try {
    const report = runEdgeMagicSuiteV2();
    const runFingerprint = sha256Text(stableJson(report));
    return { label, status: 0, tempRoot, runFingerprint, report, envNorm };
  } catch (error) {
    return { label, status: 1, tempRoot, runFingerprint: '', error: String(error?.message || error), envNorm };
  }
}

const run1 = runOnce('run1');
const run2 = runOnce('run2');
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint === run2.runFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

const doubleFailure = run1.status !== 0 && run2.status !== 0;
const deterministicMismatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint !== run2.runFingerprint;
if (!pass && (doubleFailure || deterministicMismatch)) {
  ensureDir(path.dirname(E69_LOCK_PATH));
  writeMd(E69_LOCK_PATH, [
    '# E69 KILL LOCK',
    '',
    `- reason: ${doubleFailure ? 'verify:edge:magic:suite:x2 failed twice' : 'deterministic mismatch across run1/run2'}`,
    `- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH) * 1000).toISOString()}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- run1_temp: ${run1.tempRoot}`,
    `- run2_temp: ${run2.tempRoot}`
  ].join('\n'));
}

if (pass && fs.existsSync(E69_LOCK_PATH) && process.env.CI !== 'true') fs.rmSync(E69_LOCK_PATH, { force: true });

if (update && process.env.CI !== 'true') {
  ensureDir(E69_ROOT);
  writeMd(path.join(E69_ROOT, 'RUNS_EDGE_MAGIC_SUITE_X2.md'), [
    '# E69 RUNS EDGE MAGIC SUITE X2',
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    `- run1_suite_fingerprint: ${run1.report?.deterministic_fingerprint || 'N/A'}`,
    `- run2_suite_fingerprint: ${run2.report?.deterministic_fingerprint || 'N/A'}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
}

if (!pass) {
  console.error('verify:edge:magic:suite:x2 FAILED');
  process.exit(1);
}

console.log(`verify:edge:magic:suite:x2 temp_roots run1=${run1.tempRoot} run2=${run2.tempRoot}`);
console.log(`verify:edge:magic:suite:x2 PASSED run_fingerprint=${run1.runFingerprint}`);
console.log(`verify:edge:magic:suite:x2 env=${JSON.stringify(defaultNormalizedEnv())}`);
