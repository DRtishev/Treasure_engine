#!/usr/bin/env node
// E110 Contract: Execution Gap
// Verifies that sim→live gap is within acceptable thresholds.

import fs from 'node:fs';
import path from 'node:path';
import { runGapAnalysis, runGapContract } from './e110_cost_model.mjs';
import { stableFormatNumber } from './foundation_render.mjs';

const fixturePath = path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const gapResult = runGapAnalysis(fixture.candles);
const contractResult = runGapContract(gapResult);

console.log(`e110_gap_contract: ${contractResult.passed_count}/${contractResult.total} passed`);
for (const c of contractResult.checks) {
  console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
}

if (!contractResult.passed) {
  console.error('e110_gap_contract FAILED');
  process.exit(1);
}
console.log('e110_gap_contract PASSED');
