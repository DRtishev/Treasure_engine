#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { E77_ROOT, E77_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e77_lib.mjs';
import { runE77CanaryEval } from '../edge/e77_canary_eval.mjs';

const update = process.env.UPDATE_E77_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E77_EVIDENCE forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_') || k === 'ENABLE_DEMO_ADAPTER' || k === 'ALLOW_MANUAL_RECON') && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') throw new Error(`${k} forbidden when CI=true`);
}
if (fs.existsSync(E77_LOCK_PATH) && process.env.CLEAR_E77_LOCK !== '1') throw new Error(`kill-lock active: ${E77_LOCK_PATH}`);
if (process.env.CLEAR_E77_LOCK === '1' && process.env.CI !== 'true') fs.rmSync(E77_LOCK_PATH, { force: true });

function runOnce(label, seed) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e77-${label}-`));
  const out = runE77CanaryEval({ seed });
  return { status: 0, tempRoot, fp: out.run_fingerprint, counts: out.counts };
}

const base = Number(process.env.SEED || defaultNormalizedEnv().SEED || '12345');
const s1 = Number(process.env.E77_RUN1_SEED || base);
const s2 = Number(process.env.E77_RUN2_SEED || (process.env.FORCE_E77_MISMATCH === '1' ? base + 88 : base));
const r1 = runOnce('run1', s1);
const r2 = runOnce('run2', s2);
const deterministic = r1.status === 0 && r2.status === 0 && r1.fp === r2.fp;
const pass = r1.status === 0 && r2.status === 0 && deterministic;

if (!pass) {
  ensureDir(path.dirname(E77_LOCK_PATH));
  writeMd(E77_LOCK_PATH, [
    '# E77 KILL LOCK',
    `- reason: ${deterministic ? 'DOUBLE_CRITICAL_FAIL' : 'DETERMINISTIC_MISMATCH'}`,
    `- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH) * 1000).toISOString()}`,
    `- run1_fingerprint: ${r1.fp || 'N/A'}`,
    `- run2_fingerprint: ${r2.fp || 'N/A'}`,
    `- run1_seed: ${s1}`,
    `- run2_seed: ${s2}`,
    `- run1_root: ${r1.tempRoot}`,
    `- run2_root: ${r2.tempRoot}`
  ].join('\n'));
  throw new Error('verify:edge:canary:x2 FAILED');
}

if (update && process.env.CI !== 'true') {
  ensureDir(E77_ROOT);
  writeMd(path.join(E77_ROOT, 'RUNS_EDGE_CANARY_X2.md'), [
    '# E77 RUNS EDGE CANARY X2',
    `- ci: ${process.env.CI === 'true'}`,
    `- run1_seed: ${s1}`,
    `- run2_seed: ${s2}`,
    `- run1_fingerprint: ${r1.fp}`,
    `- run2_fingerprint: ${r2.fp}`,
    `- deterministic_match: ${String(deterministic)}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
} else if (!fs.existsSync(path.join(E77_ROOT, 'RUNS_EDGE_CANARY_X2.md'))) throw new Error('missing RUNS_EDGE_CANARY_X2.md');

console.log(`verify:edge:canary:x2 run1=${r1.tempRoot} run2=${r2.tempRoot}`);
console.log(`verify:edge:canary:x2 PASSED run_fingerprint=${r1.fp}`);
