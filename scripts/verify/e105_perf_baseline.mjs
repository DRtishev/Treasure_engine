#!/usr/bin/env node
// E105 Speed Budget Baseline Generator
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';

const E105_ROOT = path.resolve('reports/evidence/E105');
const BASELINE_PATH = path.join(E105_ROOT, 'PERF_BASELINE.md');

const update = process.env.UPDATE_E105_EVIDENCE === '1';

if (isCIMode() && update) {
  throw new Error('PERF_BASELINE generation forbidden in CI');
}

if (!update) {
  console.log('e105:perf:baseline SKIP (UPDATE_E105_EVIDENCE not set)');
  process.exit(0);
}

const TARGETS = [
  { name: 'e100', script: 'verify:e100' },
  { name: 'e101', script: 'verify:e101' },
  { name: 'e103', script: 'verify:e103' },
  { name: 'e104', script: 'verify:e104' }
];

/**
 * Measure execution time (3 runs, compute median)
 */
function measureTarget(target) {
  const durations = [];

  const env = {
    ...process.env,
    CI: 'false',
    CHAIN_MODE: 'FAST_PLUS',
    QUIET: '1'
  };
  delete env.UPDATE_E105_EVIDENCE;

  console.log(`  Measuring ${target.name} (3 runs)...`);

  for (let i = 1; i <= 3; i++) {
    const start = Date.now();
    const result = spawnSync('npm', ['run', '-s', target.script], {
      stdio: 'inherit',
      env
    });
    const duration = (Date.now() - start) / 1000;

    if ((result.status ?? 1) !== 0) {
      throw new Error(`${target.script} failed on run ${i}`);
    }

    durations.push(duration);
    console.log(`    Run ${i}: ${duration.toFixed(2)}s`);
  }

  // Compute median (middle value when sorted)
  durations.sort((a, b) => a - b);
  const median = durations[1]; // Middle value of 3
  const min = durations[0];
  const max = durations[2];

  return {
    run1: durations[0],
    run2: durations[1],
    run3: durations[2],
    median,
    min,
    max
  };
}

console.log('e105:perf:baseline: Measuring baseline performance...');

const measurements = new Map();
for (const target of TARGETS) {
  const m = measureTarget(target);
  measurements.set(target.name, m);
}

// Generate baseline markdown
const lines = [
  '# E105 PERF BASELINE',
  '',
  '## Measurement Method',
  '- Command: CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:<target>',
  '- Runs: 3 per target',
  '- Metric: Median duration (seconds)',
  '- Timing: Wall-clock time (Date.now() before/after)',
  '- Format: Seconds with 2 decimal places',
  '',
  '## Hardware/Environment Caveat',
  'Performance measurements are environment-dependent.',
  'Baseline captured on this specific system configuration.',
  'Regression thresholds account for system noise (+20% default).',
  '',
  '## Baseline Measurements'
];

for (const target of TARGETS) {
  const m = measurements.get(target.name);
  lines.push('');
  lines.push(`### ${target.name.toUpperCase()}`);
  lines.push(`- run1: ${m.run1.toFixed(2)}s`);
  lines.push(`- run2: ${m.run2.toFixed(2)}s`);
  lines.push(`- run3: ${m.run3.toFixed(2)}s`);
  lines.push(`- median: ${m.median.toFixed(2)}s`);
  lines.push(`- min: ${m.min.toFixed(2)}s`);
  lines.push(`- max: ${m.max.toFixed(2)}s`);
}

lines.push('');
lines.push('## Regression Threshold');
lines.push('- default: 20% above median');
lines.push('- absolute_min_delta: 0.5s (for fast targets < 2s baseline)');
lines.push('- override: PERF_BUDGET_OVERRIDE=1 (must be documented)');

fs.mkdirSync(E105_ROOT, { recursive: true });
writeMd(BASELINE_PATH, lines.join('\n'));

console.log('');
console.log('e105:perf:baseline: Baseline established');
for (const target of TARGETS) {
  const m = measurements.get(target.name);
  console.log(`  ${target.name}: median ${m.median.toFixed(2)}s (${m.min.toFixed(2)}-${m.max.toFixed(2)}s)`);
}
