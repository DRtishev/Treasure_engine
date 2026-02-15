#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runProfitSearchHarness } from '../../core/edge/e75_profit_harness.mjs';
import { writeMd } from './e66_lib.mjs';
import { E75_ROOT, E75_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e75_lib.mjs';

const update = process.env.UPDATE_E75_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E75_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}
if (fs.existsSync(E75_LOCK_PATH) && process.env.CLEAR_E75_LOCK !== '1') throw new Error(`kill-lock active: ${E75_LOCK_PATH}`);
if (process.env.CLEAR_E75_LOCK === '1' && process.env.CI !== 'true') fs.rmSync(E75_LOCK_PATH, { force: true });

function runOnce(label, seed) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e75-${label}-`));
  const report = runProfitSearchHarness({ costModel: { seed } });
  return {
    status: 0,
    tempRoot,
    runFingerprint: report.runner_fingerprint,
    bestCandidateId: report.best_candidate_id,
    edgeFound: report.edge_found
  };
}

const baseSeed = Number(process.env.SEED || defaultNormalizedEnv().SEED || '12345');
const run1Seed = Number(process.env.E75_RUN1_SEED || baseSeed);
const run2Seed = Number(process.env.E75_RUN2_SEED || (process.env.FORCE_E75_MISMATCH === '1' ? baseSeed + 1 : baseSeed));

const run1 = runOnce('run1', run1Seed);
const run2 = runOnce('run2', run2Seed);
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint === run2.runFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

if (!pass) {
  ensureDir(path.dirname(E75_LOCK_PATH));
  writeMd(E75_LOCK_PATH, [
    '# E75 KILL LOCK',
    `- reason: ${deterministicMatch ? 'DOUBLE_FAIL' : 'DETERMINISTIC_MISMATCH'}`,
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
  throw new Error('verify:edge:profit:x2 FAILED');
}

if (update && process.env.CI !== 'true') {
  ensureDir(E75_ROOT);
  writeMd(path.join(E75_ROOT, 'RUNS_EDGE_PROFIT_X2.md'), [
    '# E75 RUNS EDGE PROFIT X2',
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_fingerprint: ${run1.runFingerprint}`,
    `- run2_fingerprint: ${run2.runFingerprint}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
} else if (!fs.existsSync(path.join(E75_ROOT, 'RUNS_EDGE_PROFIT_X2.md'))) {
  throw new Error('missing RUNS_EDGE_PROFIT_X2.md');
}

console.log(`verify:edge:profit:x2 PASSED run_fingerprint=${run1.runFingerprint}`);
