#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { E68_ROOT, E68_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e68_lib.mjs';
import { runEdgeMagicV1 } from '../../core/edge/alpha/edge_magic_v1.mjs';
import { writeMd, stableJson, sha256Text } from './e66_lib.mjs';

const update = process.env.UPDATE_E68_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E68_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}

function runOnce(label) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e68-${label}-`));
  try {
    const report = runEdgeMagicV1();
    const runFingerprint = sha256Text(stableJson(report));
    return { label, status: 0, tempRoot, report, runFingerprint };
  } catch (error) {
    return { label, status: 1, tempRoot, error: String(error?.message || error), runFingerprint: '' };
  }
}

const run1 = runOnce('run1');
const run2 = runOnce('run2');
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint === run2.runFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

const doubleFailure = run1.status !== 0 && run2.status !== 0;
const deterministicMismatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint !== run2.runFingerprint;
if (!pass && (doubleFailure || deterministicMismatch)) {
  ensureDir(path.dirname(E68_LOCK_PATH));
  writeMd(E68_LOCK_PATH, [
    '# E68 KILL LOCK',
    '',
    `- reason: ${doubleFailure ? 'verify:edge:magic:x2 failed twice' : 'deterministic mismatch across run1/run2'}`,
    `- timestamp_utc: ${new Date(Number((process.env.SOURCE_DATE_EPOCH || '1700000000')) * 1000).toISOString()}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- run1_temp: ${run1.tempRoot}`,
    `- run2_temp: ${run2.tempRoot}`
  ].join('\n'));
}

if (pass && fs.existsSync(E68_LOCK_PATH) && process.env.CI !== 'true') {
  fs.rmSync(E68_LOCK_PATH, { force: true });
}

if (update && process.env.CI !== 'true') {
  ensureDir(E68_ROOT);
  writeMd(path.join(E68_ROOT, 'RUNS_EDGE_MAGIC_X2.md'), [
    '# E68 RUNS EDGE MAGIC X2',
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    `- run1_trade_count: ${run1.report?.trade_count ?? 'N/A'}`,
    `- run2_trade_count: ${run2.report?.trade_count ?? 'N/A'}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
}

if (!pass) {
  console.error('verify:edge:magic:x2 FAILED');
  process.exit(1);
}

console.log(`verify:edge:magic:x2 temp_roots run1=${run1.tempRoot} run2=${run2.tempRoot}`);
console.log(`verify:edge:magic:x2 PASSED run_fingerprint=${run1.runFingerprint}`);
console.log(`verify:edge:magic:x2 report_fingerprint=${run1.report?.deterministic_fingerprint || ''}`);
console.log(`verify:edge:magic:x2 env=${JSON.stringify(defaultNormalizedEnv())}`);
