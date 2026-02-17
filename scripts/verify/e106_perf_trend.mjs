#!/usr/bin/env node
// E106 Performance Trend Snapshot
// Compares current performance against E105 baseline

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';

const BASELINE_PATH = path.resolve('reports/evidence/E105/PERF_BASELINE.md');
const TREND_PATH = path.resolve('reports/evidence/E106/PERF_TREND.md');
const updateEvidence = process.env.UPDATE_E106_EVIDENCE === '1';

const TARGETS = [
  { name: 'e100', script: 'verify:e100' },
  { name: 'e101', script: 'verify:e101' },
  { name: 'e103', script: 'verify:e103' },
  { name: 'e104', script: 'verify:e104' }
];

/**
 * Read baseline from PERF_BASELINE.md
 */
function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return null;
  }

  const content = fs.readFileSync(BASELINE_PATH, 'utf8');
  const baseline = new Map();

  for (const target of TARGETS) {
    const sectionRegex = new RegExp(`### ${target.name.toUpperCase()}([\\s\\S]*?)(?=###|$)`);
    const sectionMatch = content.match(sectionRegex);

    if (sectionMatch) {
      const regex = new RegExp(`- median:\\s*([0-9.]+)s`);
      const match = sectionMatch[1].match(regex);
      if (match) {
        baseline.set(target.name, parseFloat(match[1]));
      }
    }
  }

  return baseline.size > 0 ? baseline : null;
}

/**
 * Measure current median (3 runs)
 */
function measureCurrent(target) {
  const durations = [];
  const env = {
    ...process.env,
    CI: 'false',
    CHAIN_MODE: 'FAST_PLUS',
    QUIET: '1'
  };

  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    const result = spawnSync('npm', ['run', '-s', target.script], {
      stdio: 'pipe',
      env
    });
    const duration = (Date.now() - start) / 1000;

    if ((result.status ?? 1) !== 0) {
      throw new Error(`${target.script} failed during measurement`);
    }

    durations.push(duration);
  }

  durations.sort((a, b) => a - b);
  return durations[1]; // median
}

const baseline = readBaseline();
if (!baseline) {
  console.error('e106:perf_trend: No E105 baseline found');
  console.error('Run: npm run -s verify:e105:perf:baseline');
  throw new Error('PERF_BASELINE.md not found');
}

console.log('e106:perf_trend: Measuring current performance...');

const current = new Map();
for (const target of TARGETS) {
  console.log(`  Measuring ${target.name}...`);
  const median = measureCurrent(target);
  current.set(target.name, median);
  console.log(`  ${target.name}: ${median.toFixed(2)}s`);
}

// Generate trend evidence
if (updateEvidence) {
  const lines = [
    '# E106 PERF TREND',
    '',
    '## Methodology',
    '- Baseline: E105 PERF_BASELINE.md (3-run median, captured 2026-02-17)',
    '- Current: E106 measurement (3-run median)',
    '- Command: CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:<target>',
    '',
    '## Trend Table',
    '',
    '| Target | E105 Baseline (s) | E106 Current (s) | Delta (s) | Delta (%) | Status |',
    '|--------|-------------------|------------------|-----------|-----------|--------|'
  ];

  for (const target of TARGETS) {
    const baselineMedian = baseline.get(target.name);
    const currentMedian = current.get(target.name);
    const deltaSeconds = currentMedian - baselineMedian;
    const deltaPercent = ((deltaSeconds / baselineMedian) * 100);
    const status = deltaPercent > 20 ? 'REGRESSED' : deltaPercent < -10 ? 'IMPROVED' : 'STABLE';

    lines.push(`| ${target.name} | ${baselineMedian.toFixed(2)} | ${currentMedian.toFixed(2)} | ${deltaSeconds > 0 ? '+' : ''}${deltaSeconds.toFixed(2)} | ${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(1)}% | ${status} |`);
  }

  lines.push('');
  lines.push('## Interpretation');
  lines.push('- STABLE: Within ±20% of baseline (normal variance)');
  lines.push('- IMPROVED: >10% faster than baseline');
  lines.push('- REGRESSED: >20% slower than baseline (triggers speed budget contract failure)');
  lines.push('');
  lines.push('## Verdict');
  lines.push('Trend snapshot captured. Regression detection enforced by e105_speed_budget_contract.mjs.');

  writeMd(TREND_PATH, lines.join('\n'));
}

console.log('e106:perf_trend PASSED');
