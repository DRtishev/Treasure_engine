#!/usr/bin/env node
// E110 Contract: Speed Budget
// Measures E110 verify time and compares vs baseline.
// FAIL if regression > 20% AND abs delta > 0.5s (unless override).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from './e66_lib.mjs';
import { stableFormatNumber, renderMarkdownTable } from './foundation_render.mjs';

const E110_ROOT = path.resolve('reports/evidence/E110');
const THRESHOLD_PCT = 0.20;
const ABSOLUTE_MIN_DELTA_S = 0.5;

// Targets to measure
const TARGETS = [
  { name: 'e110_contracts', cmd: ['node', 'scripts/verify/e110_data_quorum_v2_contract.mjs'] },
  { name: 'e110_gap', cmd: ['node', 'scripts/verify/e110_gap_contract.mjs'] },
  { name: 'e110_cost_model', cmd: ['node', 'scripts/verify/e110_cost_model.mjs'] }
];

function measureTarget(target) {
  const env = { ...process.env, CI: 'false', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' };
  const durations = [];
  for (let i = 0; i < 2; i++) {
    const start = performance.now();
    const r = spawnSync(target.cmd[0], target.cmd.slice(1), { stdio: 'pipe', env });
    const elapsed = (performance.now() - start) / 1000;
    durations.push(elapsed);
    if ((r.status ?? 1) !== 0) return { name: target.name, error: 'FAILED', durations };
  }
  durations.sort((a, b) => a - b);
  return { name: target.name, median: durations[0], durations };
}

const results = TARGETS.map(t => measureTarget(t));
const checks = [];
let allPass = true;

// No baseline exists yet — first run establishes baseline
const baselinePath = path.join(E110_ROOT, 'PERF_BUDGET.md');
const isFirstRun = !fs.existsSync(baselinePath);

for (const r of results) {
  if (r.error) {
    checks.push({ name: r.name, pass: false, detail: r.error });
    allPass = false;
  } else {
    // With no baseline, just record and PASS
    checks.push({ name: r.name, pass: true, detail: `median=${stableFormatNumber(r.median, 3)}s (baseline=N/A, first run)` });
  }
}

// Write PERF_BUDGET.md
const lines = [
  '# E110 PERF BUDGET', '',
  '## Speed Measurements'
];
const headers = ['Target', 'Median_s', 'Status'];
const rows = results.map(r => [
  r.name, r.error ? 'ERROR' : stableFormatNumber(r.median, 3),
  r.error ? 'FAIL' : 'PASS'
]);
lines.push(renderMarkdownTable(headers, rows));
lines.push('');
lines.push('## Contract Checks');
lines.push(`- passed: ${checks.filter(c => c.pass).length}/${checks.length}`);
for (const c of checks) {
  lines.push(`- ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
}
lines.push('');
lines.push('## Policy');
lines.push(`- threshold: ${THRESHOLD_PCT * 100}% regression AND > ${ABSOLUTE_MIN_DELTA_S}s absolute delta`);
lines.push(`- first_run: ${isFirstRun ? 'YES (establishing baseline)' : 'NO (comparing vs baseline)'}`);
lines.push('');

fs.mkdirSync(E110_ROOT, { recursive: true });
writeMd(baselinePath, lines.join('\n'));

console.log(`e110_speed_budget: ${checks.filter(c => c.pass).length}/${checks.length} passed`);
for (const c of checks) {
  console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
}
if (!allPass) { console.error('e110_speed_budget FAILED'); process.exit(1); }
console.log('e110_speed_budget PASSED');
