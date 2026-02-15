#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runE76ProfitEnvelope } from '../../core/edge/e76_profit_reality_bridge.mjs';
import { writeMd } from './e66_lib.mjs';
import { E76_ROOT, E76_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e76_lib.mjs';

const update = process.env.UPDATE_E76_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E76_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_') || k === 'ENABLE_DEMO_ADAPTER' || k === 'ALLOW_MANUAL_RECON') && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}
if (fs.existsSync(E76_LOCK_PATH) && process.env.CLEAR_E76_LOCK !== '1') throw new Error(`kill-lock active: ${E76_LOCK_PATH}`);
if (process.env.CLEAR_E76_LOCK === '1' && process.env.CI !== 'true') fs.rmSync(E76_LOCK_PATH, { force: true });

function runOnce(label, seed) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e76-${label}-`));
  const out = runE76ProfitEnvelope({ seed });
  return { status: 0, tempRoot, run_fingerprint: out.run_fingerprint, envelope_fingerprint: out.envelope.envelope_fingerprint };
}

const baseSeed = Number(process.env.SEED || defaultNormalizedEnv().SEED || '12345');
const run1Seed = Number(process.env.E76_RUN1_SEED || baseSeed);
const run2Seed = Number(process.env.E76_RUN2_SEED || (process.env.FORCE_E76_MISMATCH === '1' ? baseSeed + 77 : baseSeed));

const run1 = runOnce('run1', run1Seed);
const run2 = runOnce('run2', run2Seed);
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.run_fingerprint === run2.run_fingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

if (!pass) {
  ensureDir(path.dirname(E76_LOCK_PATH));
  writeMd(E76_LOCK_PATH, [
    '# E76 KILL LOCK',
    `- reason: ${deterministicMatch ? 'DOUBLE_CRITICAL_FAIL' : 'DETERMINISTIC_MISMATCH'}`,
    `- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH) * 1000).toISOString()}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.run_fingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.run_fingerprint || 'N/A'}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_root: ${run1.tempRoot}`,
    `- run2_root: ${run2.tempRoot}`
  ].join('\n'));
  throw new Error('verify:edge:profit:envelope:x2 FAILED');
}

if (update && process.env.CI !== 'true') {
  ensureDir(E76_ROOT);
  writeMd(path.join(E76_ROOT, 'RUNS_EDGE_PROFIT_ENVELOPE_X2.md'), [
    '# E76 RUNS EDGE PROFIT ENVELOPE X2',
    `- ci: ${process.env.CI === 'true'}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_fingerprint: ${run1.run_fingerprint}`,
    `- run2_fingerprint: ${run2.run_fingerprint}`,
    `- run1_envelope_fingerprint: ${run1.envelope_fingerprint}`,
    `- run2_envelope_fingerprint: ${run2.envelope_fingerprint}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
} else if (!fs.existsSync(path.join(E76_ROOT, 'RUNS_EDGE_PROFIT_ENVELOPE_X2.md'))) {
  throw new Error('missing RUNS_EDGE_PROFIT_ENVELOPE_X2.md');
}

console.log(`verify:edge:profit:envelope:x2 run1=${run1.tempRoot} run2=${run2.tempRoot}`);
console.log(`verify:edge:profit:envelope:x2 PASSED run_fingerprint=${run1.run_fingerprint}`);
