#!/usr/bin/env node
// E105 Speed Budget Contract - Performance regression detection
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';

const E105_ROOT = path.resolve('reports/evidence/E105');
const BASELINE_PATH = path.join(E105_ROOT, 'PERF_BASELINE.md');
const COURT_PATH = path.join(E105_ROOT, 'PERF_BUDGET_COURT.md');

const THRESHOLD = parseFloat(process.env.PERF_BUDGET_THRESHOLD || '0.20'); // 20% default
const OVERRIDE = process.env.PERF_BUDGET_OVERRIDE === '1';
const ABSOLUTE_MIN_DELTA = 0.5; // seconds

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
    // Find the section for this target
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

// Check for baseline
const baseline = readBaseline();

if (!baseline) {
  console.error('e105:speed_budget_contract: No baseline found');
  console.error('Run: npm run -s verify:e105:perf:baseline');
  throw new Error('PERF_BASELINE.md not found');
}

console.log('e105:speed_budget_contract: Measuring current performance...');

const current = new Map();
for (const target of TARGETS) {
  console.log(`  Measuring ${target.name}...`);
  const median = measureCurrent(target);
  current.set(target.name, median);
  console.log(`  ${target.name}: ${median.toFixed(2)}s`);
}

// Analyze regressions
const regressions = [];
const results = [];

for (const target of TARGETS) {
  const base = baseline.get(target.name);
  const curr = current.get(target.name);

  if (base === undefined || curr === undefined) continue;

  const delta = curr - base;
  const pct = (delta / base) * 100;

  // Regression detection:
  // 1. Exceeds percentage threshold (20% by default)
  // 2. For fast targets (< 2s), also check absolute delta
  let regressed = false;
  if (pct > (THRESHOLD * 100)) {
    if (base < 2.0) {
      // Fast target: also check absolute delta
      regressed = delta > ABSOLUTE_MIN_DELTA;
    } else {
      regressed = true;
    }
  }

  results.push({
    name: target.name,
    base,
    curr,
    delta,
    pct,
    regressed
  });

  if (regressed) {
    regressions.push(target.name);
  }
}

// Generate court document
const lines = [
  '# E105 PERF BUDGET COURT',
  '',
  '## Regression Analysis',
  `- threshold: ${(THRESHOLD * 100).toFixed(0)}%`,
  `- absolute_min_delta: ${ABSOLUTE_MIN_DELTA}s (for fast targets < 2s)`,
  `- override: ${OVERRIDE}`,
  ''
];

for (const r of results) {
  lines.push(`### ${r.name.toUpperCase()}`);
  lines.push(`- baseline_median: ${r.base.toFixed(2)}s`);
  lines.push(`- current_median: ${r.curr.toFixed(2)}s`);
  lines.push(`- delta: ${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)}s`);
  lines.push(`- regression_pct: ${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(1)}%`);
  lines.push(`- status: ${r.regressed ? 'REGRESSED' : 'OK'}`);
  lines.push('');
}

lines.push('## Verdict');
if (regressions.length === 0) {
  lines.push('- status: PASS (no regressions detected)');
} else if (OVERRIDE) {
  lines.push(`- status: PASS (override active, ${regressions.length} regressions ignored)`);
  lines.push('- regressed_targets: ' + regressions.join(', '));
  lines.push('- WARNING: Override should be temporary and documented');
} else {
  lines.push(`- status: FAIL (${regressions.length} regressions detected)`);
  lines.push('- regressed_targets: ' + regressions.join(', '));
}

fs.mkdirSync(E105_ROOT, { recursive: true });
writeMd(COURT_PATH, lines.join('\n'));

// Output verdict
if (regressions.length > 0 && !OVERRIDE) {
  console.error('');
  console.error(`e105:speed_budget_contract: FAILED - ${regressions.length} regression(s):`);
  for (const name of regressions) {
    const r = results.find(x => x.name === name);
    console.error(`  ${name}: ${r.base.toFixed(2)}s → ${r.curr.toFixed(2)}s (+${r.pct.toFixed(1)}%)`);
  }
  console.error('');
  console.error('Set PERF_BUDGET_OVERRIDE=1 to ignore (must be documented in evidence)');
  throw new Error('Performance budget exceeded');
}

console.log('e105:speed_budget_contract: PASS');
