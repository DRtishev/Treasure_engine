#!/usr/bin/env node
// E109 Contract: Data Quorum
// Enforces minimum bars, continuity (no gaps > 2x timeframe), monotonic timestamps.
// Deterministic and md-reportable.

import fs from 'node:fs';
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { stableFormatNumber } from './foundation_render.mjs';

const E109_ROOT = path.resolve('reports/evidence/E109');

// Configurable thresholds
const MIN_BARS = 50;
const MAX_GAP_MULTIPLIER = 2;

/**
 * Run data quorum contract on bars
 * @param {Array} bars - sorted OHLCV bars
 * @param {Object} opts - { minBars, maxGapMultiplier, interval }
 * @returns {{ passed: boolean, checks: Array, summary: string }}
 */
export function runDataQuorum(bars, opts = {}) {
  const minBars = opts.minBars || MIN_BARS;
  const maxGapMult = opts.maxGapMultiplier || MAX_GAP_MULTIPLIER;
  const intervalMs = opts.intervalMs || 300000; // default 5m

  const checks = [];
  let allPass = true;

  // Check 1: minimum bars
  const hasMinBars = bars.length >= minBars;
  checks.push({ name: 'min_bars', pass: hasMinBars, detail: `${bars.length} >= ${minBars}` });
  if (!hasMinBars) allPass = false;

  // Check 2: monotonic timestamps
  let monotonic = true;
  let monoViolations = 0;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].ts_open <= bars[i - 1].ts_open) {
      monotonic = false;
      monoViolations++;
    }
  }
  checks.push({ name: 'monotonic_ts', pass: monotonic, detail: `violations: ${monoViolations}` });
  if (!monotonic) allPass = false;

  // Check 3: no gaps beyond 2x timeframe
  let maxGap = 0;
  let gapViolations = 0;
  const maxAllowed = intervalMs * maxGapMult;
  for (let i = 1; i < bars.length; i++) {
    const gap = bars[i].ts_open - bars[i - 1].ts_open;
    if (gap > maxGap) maxGap = gap;
    if (gap > maxAllowed) gapViolations++;
  }
  const noLargeGaps = gapViolations === 0;
  checks.push({ name: 'no_large_gaps', pass: noLargeGaps, detail: `max_gap=${maxGap}ms, violations=${gapViolations}, threshold=${maxAllowed}ms` });
  if (!noLargeGaps) allPass = false;

  // Check 4: no duplicate timestamps
  const tsSet = new Set(bars.map(b => b.ts_open));
  const noDupes = tsSet.size === bars.length;
  checks.push({ name: 'no_duplicate_ts', pass: noDupes, detail: `unique=${tsSet.size}, total=${bars.length}` });
  if (!noDupes) allPass = false;

  return {
    passed: allPass,
    checks,
    total: checks.length,
    passed_count: checks.filter(c => c.pass).length
  };
}

// CLI mode
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''));
if (isMain) {
  // Load fixture capsule or E108 fixture
  const capsuleDir = path.resolve('data/capsules/fixture_btcusdt_5m_200bar');
  let bars;
  if (fs.existsSync(capsuleDir)) {
    const { loadCapsuleBars } = await import('../data/e109_capsule_build.mjs');
    bars = loadCapsuleBars(capsuleDir);
  } else {
    const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
    bars = fixture.candles;
  }

  const result = runDataQuorum(bars, { minBars: 50, intervalMs: 300000 });

  console.log(`e109_data_quorum_contract: ${result.passed_count}/${result.total} passed`);
  for (const c of result.checks) {
    console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
  }

  if (!result.passed) {
    console.error('e109_data_quorum_contract FAILED');
    process.exit(1);
  }
  console.log('e109_data_quorum_contract PASSED');
}
