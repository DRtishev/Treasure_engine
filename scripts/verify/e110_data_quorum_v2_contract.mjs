#!/usr/bin/env node
// E110 Contract: Data Quorum v2
// Enhanced: per-symbol checks for min bars, monotonic ts, no gaps, no NaN, sane OHLC.

import fs from 'node:fs';
import path from 'node:path';
import { loadCapsuleBars } from '../data/e109_capsule_build.mjs';
import { runDataQuorumV2 } from '../data/e110_capsule_builder.mjs';

// Try E110 capsules first, fall back to fixture
const e110Dir = path.resolve('data/capsules/E110');
const fixtureDir = path.resolve('data/capsules/fixture_btcusdt_5m_200bar');
const fixturePath = path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json');

let bars;
let source;

if (fs.existsSync(e110Dir)) {
  const subdirs = fs.readdirSync(e110Dir).filter(d => fs.statSync(path.join(e110Dir, d)).isDirectory());
  if (subdirs.length > 0) {
    bars = loadCapsuleBars(path.join(e110Dir, subdirs[0]));
    source = `E110/${subdirs[0]}`;
  }
}
if (!bars && fs.existsSync(fixtureDir)) {
  bars = loadCapsuleBars(fixtureDir);
  source = 'fixture_btcusdt_5m_200bar';
}
if (!bars && fs.existsSync(fixturePath)) {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  bars = fixture.candles;
  source = 'E108_fixture';
}
if (!bars) {
  console.error('e110_data_quorum_v2_contract: NO DATA FOUND');
  process.exit(1);
}

const result = runDataQuorumV2(bars, { minBars: 50, intervalMs: 300000 });

console.log(`e110_data_quorum_v2_contract: ${result.passed_count}/${result.total} passed (source=${source})`);
for (const c of result.checks) {
  console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
}

if (!result.passed) {
  console.error('e110_data_quorum_v2_contract FAILED');
  process.exit(1);
}
console.log('e110_data_quorum_v2_contract PASSED');
