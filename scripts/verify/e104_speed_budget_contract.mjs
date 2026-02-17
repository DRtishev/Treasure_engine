#!/usr/bin/env node
// E104-E1: Speed Budget Contract - Performance regression detection
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';

const PERF_BASELINE_PATH = path.resolve('reports/evidence/E104/PERF_BASELINE.md');
const PERF_BUDGET_COURT_PATH = path.resolve('reports/evidence/E104/PERF_BUDGET_COURT.md');
const REGRESSION_THRESHOLD = parseFloat(process.env.PERF_BUDGET_THRESHOLD || '0.20'); // 20% default
const OVERRIDE = process.env.PERF_BUDGET_OVERRIDE === '1';

const TARGETS = [
  { name: 'e100', script: 'verify:e100' },
  { name: 'e101', script: 'verify:e101' },
  { name: 'e103', script: 'verify:e103' }
];

/**
 * Measure execution time of npm run -s script
 * Returns duration in seconds
 */
function measureDuration(script) {
  const env = {
    ...process.env,
    CI: 'false',
    CHAIN_MODE: 'FAST_PLUS',
    QUIET: '1'
  };

  const start = Date.now();
  const result = spawnSync('npm', ['run', '-s', script], {
    stdio: 'inherit',
    env
  });
  const duration = (Date.now() - start) / 1000;

  if ((result.status ?? 1) !== 0) {
    throw new Error(`${script} failed with exit code ${result.status}`);
  }

  return duration;
}

/**
 * Read baseline from PERF_BASELINE.md
 * Returns Map<targetName, baselineDuration>
 */
function readBaseline() {
  if (!fs.existsSync(PERF_BASELINE_PATH)) {
    return null;
  }

  const content = fs.readFileSync(PERF_BASELINE_PATH, 'utf8');
  const baseline = new Map();

  for (const target of TARGETS) {
    const regex = new RegExp(`^- ${target.name}_duration:\\s*([0-9.]+)s`, 'm');
    const match = content.match(regex);
    if (match) {
      baseline.set(target.name, parseFloat(match[1]));
    }
  }

  return baseline.size > 0 ? baseline : null;
}

/**
 * Write baseline to PERF_BASELINE.md
 */
function writeBaseline(measurements) {
  const lines = [
    '# E104 PERF BASELINE',
    '',
    '## Measurement Method',
    '- Command: CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:<target>',
    '- Environment: See PREFLIGHT.md for node/npm/os versions',
    '- Timing: Wall-clock time (Date.now() before/after)',
    '- Format: Seconds with 2 decimal places',
    '',
    '## Baseline Durations'
  ];

  for (const { name } of TARGETS) {
    const duration = measurements.get(name);
    if (duration !== undefined) {
      lines.push(`- ${name}_duration: ${duration.toFixed(2)}s`);
    }
  }

  lines.push('');
  lines.push('## Notes');
  lines.push('- Baseline captured in update mode (no baseline file present)');
  lines.push('- Regression threshold: ' + (REGRESSION_THRESHOLD * 100).toFixed(0) + '%');

  writeMd(PERF_BASELINE_PATH, lines.join('\n'));
}

/**
 * Write regression analysis to PERF_BUDGET_COURT.md
 */
function writeBudgetCourt(baseline, current, regressions) {
  const lines = [
    '# E104 PERF BUDGET COURT',
    '',
    '## Regression Analysis',
    `- threshold: ${(REGRESSION_THRESHOLD * 100).toFixed(0)}%`,
    `- override: ${OVERRIDE}`,
    ''
  ];

  for (const { name } of TARGETS) {
    const base = baseline.get(name);
    const curr = current.get(name);
    if (base !== undefined && curr !== undefined) {
      const delta = curr - base;
      const pct = (delta / base) * 100;
      const regressed = pct > (REGRESSION_THRESHOLD * 100);

      lines.push(`## ${name.toUpperCase()}`);
      lines.push(`- baseline: ${base.toFixed(2)}s`);
      lines.push(`- current: ${curr.toFixed(2)}s`);
      lines.push(`- delta: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}s`);
      lines.push(`- regression: ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`);
      lines.push(`- status: ${regressed ? 'REGRESSED' : 'OK'}`);
      lines.push('');
    }
  }

  lines.push('## Verdict');
  if (regressions.length === 0) {
    lines.push('- status: PASS (no regressions)');
  } else if (OVERRIDE) {
    lines.push(`- status: PASS (override active, ${regressions.length} regressions ignored)`);
    lines.push('- regressions: ' + regressions.join(', '));
  } else {
    lines.push(`- status: FAIL (${regressions.length} regressions detected)`);
    lines.push('- regressions: ' + regressions.join(', '));
  }

  writeMd(PERF_BUDGET_COURT_PATH, lines.join('\n'));
}

// Main execution
console.log('e104:speed_budget_contract: Measuring performance...');

const current = new Map();
for (const target of TARGETS) {
  console.log(`  Measuring ${target.name}...`);
  const duration = measureDuration(target.script);
  current.set(target.name, duration);
  console.log(`  ${target.name}: ${duration.toFixed(2)}s`);
}

const baseline = readBaseline();

if (!baseline) {
  // No baseline, this is the first run - write baseline
  console.log('e104:speed_budget_contract: No baseline found, writing baseline...');
  writeBaseline(current);
  console.log('e104:speed_budget_contract: PASS (baseline established)');
  process.exit(0);
}

// Compare against baseline
const regressions = [];
for (const { name } of TARGETS) {
  const base = baseline.get(name);
  const curr = current.get(name);
  if (base !== undefined && curr !== undefined) {
    const delta = curr - base;
    const pct = (delta / base) * 100;
    if (pct > (REGRESSION_THRESHOLD * 100)) {
      regressions.push(name);
    }
  }
}

writeBudgetCourt(baseline, current, regressions);

if (regressions.length > 0 && !OVERRIDE) {
  console.error(`\ne104:speed_budget_contract: FAILED - ${regressions.length} regression(s):`);
  for (const name of regressions) {
    const base = baseline.get(name);
    const curr = current.get(name);
    const pct = ((curr - base) / base) * 100;
    console.error(`  ${name}: ${base.toFixed(2)}s → ${curr.toFixed(2)}s (+${pct.toFixed(1)}%)`);
  }
  console.error(`\nSet PERF_BUDGET_OVERRIDE=1 to ignore regressions (not recommended)`);
  throw new Error('Performance budget exceeded');
}

console.log('e104:speed_budget_contract: PASS');
