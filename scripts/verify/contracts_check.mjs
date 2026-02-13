#!/usr/bin/env node
import fs from 'node:fs';
import { runPaperFitnessLabV1 } from '../../core/paper/paper_fitness_lab_v1.mjs';
import { runPaperFitnessLab } from '../../core/paper/paper_fitness_lab.mjs';

let passed = 0;
let failed = 0;
const check = (ok, msg) => {
  if (ok) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
};

const v1 = runPaperFitnessLabV1({ seed: 5501 });
check(v1.schema_version === '1.0.0', 'v1 schema_version fixed');
check(Number.isInteger(v1.grid_size) && Array.isArray(v1.top_k), 'v1 grid/top_k present');
check(v1.all_results.every((r) => r.params && Number.isFinite(r.net_pnl) && Number.isFinite(r.hard_stops) && Number.isFinite(r.score)), 'v1 result fields present');

const v2 = runPaperFitnessLab({ seed: 5601, strict: true, purpose: 'tuning' });
check(v2.schema_version === '2.0.0', 'v2 schema_version fixed');
check(v2.all_results.every((r) => r.metrics && Number.isFinite(r.fitness_score) && typeof r.score_formula === 'string'), 'v2 fitness contract fields present');

const e55Path = 'reports/evidence/EPOCH-55/gates/manual/epoch55_frontier.json';
const e56Path = 'reports/evidence/EPOCH-56/gates/manual/epoch56_fitness_v2.json';
check(fs.existsSync(e55Path), 'E55 machine output exists');
check(fs.existsSync(e56Path), 'E56 machine output exists');
if (fs.existsSync(e55Path)) {
  const e55 = JSON.parse(fs.readFileSync(e55Path, 'utf8'));
  check(e55.schema_version === '1.0.0', 'E55 output schema_version=1.0.0');
  check(Array.isArray(e55.all_results), 'E55 output has all_results');
}
if (fs.existsSync(e56Path)) {
  const e56 = JSON.parse(fs.readFileSync(e56Path, 'utf8'));
  check(typeof e56.schema_version === 'string', 'E56 output has schema_version');
  check(Array.isArray(e56.scenarios), 'E56 output has scenarios');
}

if (failed > 0) {
  console.error(`verify:contracts FAILED passed=${passed} failed=${failed}`);
  process.exit(1);
}
console.log(`verify:contracts PASSED checks=${passed}`);
