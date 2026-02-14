#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const baselinePath = path.resolve('truth/BASELINE.json');
if (!fs.existsSync(baselinePath) && process.env.UPDATE_BASELINE !== '1') {
  console.error('verify:baseline FAILED\n- missing truth/BASELINE.json');
  process.exit(1);
}

const committed = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath, 'utf8') : null;
const regen = spawnSync('node', ['scripts/truth/baseline_builder.mjs'], { encoding: 'utf8', env: process.env });
if (regen.status !== 0) {
  console.error('verify:baseline FAILED\n- baseline_builder failed');
  process.stderr.write(regen.stderr || regen.stdout || '');
  process.exit(1);
}

const rebuilt = fs.readFileSync(baselinePath, 'utf8');
if (process.env.UPDATE_BASELINE === '1') {
  console.log('verify:baseline PASSED (UPDATED)');
  process.exit(0);
}

if (committed !== rebuilt) {
  fs.writeFileSync(path.resolve('reports/truth/baseline_drift.diff'), [
    'truth/BASELINE.json drift detected.',
    'Re-run with UPDATE_BASELINE=1 to accept new canonical baseline.'
  ].join('\n') + '\n');
  if (committed !== null) fs.writeFileSync(baselinePath, committed);
  console.error('verify:baseline FAILED\n- baseline drift detected');
  process.exit(1);
}

console.log('verify:baseline PASSED');
