#!/usr/bin/env node
// E103-1: Fast Apply - Performance + Correctness
// Goal: <30s OR 2x faster than baseline, with idempotence proof

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E103_ROOT, ensureDir } from './e103_lib.mjs';
import { sha256File } from './e66_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';

const update = process.env.UPDATE_E103_EVIDENCE === '1';

if (isCIMode() && update) {
  throw new Error('UPDATE_E103_EVIDENCE forbidden in CI');
}

if (!update) {
  console.log('e103:goal1_fast_apply SKIP (UPDATE_E103_EVIDENCE not set)');
  process.exit(0);
}

ensureDir(E103_ROOT);

function run(name, cmd, env) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    throw new Error(`${name} failed: exit ${r.status}`);
  }
}

const overlayPath = path.resolve('core/edge/contracts/e97_envelope_tuning_overlay.md');
const ledgerPath = path.resolve('core/edge/state/profit_ledger_state.md');

// Baseline benchmark: Current e101_apply_txn approach (FAST_PLUS)
console.log('=== BASELINE: FAST_PLUS mode ===');
const baselineEnv = {
  ...process.env,
  CI: 'false',
  UPDATE_E97_EVIDENCE: '1',
  UPDATE_E97_APPLY: '1',
  APPLY_MODE: 'APPLY',
  CHAIN_MODE: 'FAST_PLUS',
  QUIET: '1'
};
delete baselineEnv.UPDATE_E103_EVIDENCE;

const baselineStart = Date.now();
run('baseline-run1', ['npm', 'run', '-s', 'verify:e97'], baselineEnv);
const baselineDur1 = ((Date.now() - baselineStart) / 1000).toFixed(2);

const baselineHash1 = {
  overlay: sha256File(overlayPath),
  ledger: sha256File(ledgerPath)
};

const baseline2Start = Date.now();
run('baseline-run2', ['npm', 'run', '-s', 'verify:e97'], baselineEnv);
const baselineDur2 = ((Date.now() - baseline2Start) / 1000).toFixed(2);

const baselineHash2 = {
  overlay: sha256File(overlayPath),
  ledger: sha256File(ledgerPath)
};

const baselineTotal = (parseFloat(baselineDur1) + parseFloat(baselineDur2)).toFixed(2);

// Optimized benchmark: FAST mode (minimal checks)
console.log('=== OPTIMIZED: FAST mode ===');
const optimizedEnv = {
  ...process.env,
  CI: 'false',
  UPDATE_E97_EVIDENCE: '1',
  UPDATE_E97_APPLY: '1',
  APPLY_MODE: 'APPLY',
  CHAIN_MODE: 'FAST',
  QUIET: '1'
};
delete optimizedEnv.UPDATE_E103_EVIDENCE;

const opt1Start = Date.now();
run('optimized-run1', ['npm', 'run', '-s', 'verify:e97'], optimizedEnv);
const optDur1 = ((Date.now() - opt1Start) / 1000).toFixed(2);

const optHash1 = {
  overlay: sha256File(overlayPath),
  ledger: sha256File(ledgerPath)
};

const opt2Start = Date.now();
run('optimized-run2', ['npm', 'run', '-s', 'verify:e97'], optimizedEnv);
const optDur2 = ((Date.now() - opt2Start) / 1000).toFixed(2);

const optHash2 = {
  overlay: sha256File(overlayPath),
  ledger: sha256File(ledgerPath)
};

const optimizedTotal = (parseFloat(optDur1) + parseFloat(optDur2)).toFixed(2);

// Correctness check: idempotence
const idempotent = optHash1.overlay === optHash2.overlay &&
  optHash1.ledger === optHash2.ledger;

// Performance check
const speedup = (parseFloat(baselineTotal) / parseFloat(optimizedTotal)).toFixed(2);
const under30s = parseFloat(optimizedTotal) < 30;
const twice_faster = parseFloat(speedup) >= 2.0;

const pass = idempotent && (under30s || twice_faster);

// Generate report
const report = [
  '# E103 GOAL 1: FAST APPLY',
  '',
  '## Baseline Performance (FAST_PLUS)',
  `- run1_duration: ${baselineDur1}s`,
  `- run2_duration: ${baselineDur2}s`,
  `- total_duration: ${baselineTotal}s`,
  `- run1_overlay_sha256: ${baselineHash1.overlay}`,
  `- run1_ledger_sha256: ${baselineHash1.ledger}`,
  `- run2_overlay_sha256: ${baselineHash2.overlay}`,
  `- run2_ledger_sha256: ${baselineHash2.ledger}`,
  '',
  '## Optimized Performance (FAST)',
  `- run1_duration: ${optDur1}s`,
  `- run2_duration: ${optDur2}s`,
  `- total_duration: ${optimizedTotal}s`,
  `- run1_overlay_sha256: ${optHash1.overlay}`,
  `- run1_ledger_sha256: ${optHash1.ledger}`,
  `- run2_overlay_sha256: ${optHash2.overlay}`,
  `- run2_ledger_sha256: ${optHash2.ledger}`,
  '',
  '## Performance Analysis',
  `- baseline_total: ${baselineTotal}s`,
  `- optimized_total: ${optimizedTotal}s`,
  `- speedup: ${speedup}x`,
  `- under_30s: ${under30s}`,
  `- twice_faster: ${twice_faster}`,
  `- performance_goal: ${under30s || twice_faster ? 'PASS' : 'FAIL'}`,
  '',
  '## Correctness Verification',
  `- idempotent: ${idempotent ? 'YES' : 'NO'}`,
  `- overlay_match: ${optHash1.overlay === optHash2.overlay}`,
  `- ledger_match: ${optHash1.ledger === optHash2.ledger}`,
  '',
  '## Verdict',
  `- correctness: ${idempotent ? 'PASS' : 'FAIL'}`,
  `- performance: ${under30s || twice_faster ? 'PASS' : 'FAIL'}`,
  `- overall: ${pass ? 'PASS' : 'FAIL'}`
].join('\n');

writeMd(path.join(E103_ROOT, 'GOAL_1_FAST_APPLY.md'), report);

if (!pass) {
  if (!idempotent) {
    throw new Error('Fast Apply FAILED: idempotence violated');
  }
  if (!under30s && !twice_faster) {
    throw new Error(`Fast Apply FAILED: not fast enough (${optimizedTotal}s, ${speedup}x speedup)`);
  }
}

console.log(`e103:goal1_fast_apply PASSED (${optimizedTotal}s, ${speedup}x speedup, idempotent=${idempotent})`);
