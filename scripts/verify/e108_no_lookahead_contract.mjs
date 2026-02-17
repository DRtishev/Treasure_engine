#!/usr/bin/env node
// E108 Contract: No Lookahead
// Static + runtime checks proving strategies cannot see future bars

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { runStrategyOnBars } from '../../core/edge/strategy_interface.mjs';
import * as s1 from '../../core/edge/strategies/s1_breakout_atr.mjs';
import * as s2 from '../../core/edge/strategies/s2_mean_revert_rsi.mjs';

const E108_ROOT = path.resolve('reports/evidence/E108');
const update = process.env.UPDATE_E108_EVIDENCE === '1';
const results = [];

function test(name, fn) {
  try { fn(); results.push({ name, status: 'PASS', detail: '' }); }
  catch (e) { results.push({ name, status: 'FAIL', detail: e.message }); }
}

// Static: strategy source must not use bars[i+N] or futures-referencing patterns
function staticCheck(name, filePath) {
  const src = fs.readFileSync(path.resolve(filePath), 'utf8');
  // Check for forward-indexing patterns
  const forwardPatterns = [/bars\[i\s*\+\s*\d+\]/, /history\[i\s*\+\s*\d+\]/, /\.slice\(\s*i\s*\+\s*1/];
  for (const p of forwardPatterns) {
    if (p.test(src)) {
      throw new Error(`Found forward-looking pattern: ${p}`);
    }
  }
  // Strategy must not import the full bars array directly
  if (/bars\.length/.test(src) && /bars\[bars\.length/.test(src)) {
    throw new Error('Suspicious bars.length access in strategy');
  }
}

test('s1_breakout_atr_static', () => staticCheck('s1', 'core/edge/strategies/s1_breakout_atr.mjs'));
test('s2_mean_revert_rsi_static', () => staticCheck('s2', 'core/edge/strategies/s2_mean_revert_rsi.mjs'));

// Static: backtest engine only passes history[0..i] to strategy
test('backtest_engine_no_lookahead', () => {
  const src = fs.readFileSync(path.resolve('core/backtest/engine.mjs'), 'utf8');
  if (!src.includes('bars.slice(0, i + 1)')) {
    throw new Error('Backtest engine must use bars.slice(0, i + 1) for history');
  }
});

// Static: strategy_interface enforces slice(0, i+1)
test('strategy_interface_enforces', () => {
  const src = fs.readFileSync(path.resolve('core/edge/strategy_interface.mjs'), 'utf8');
  if (!src.includes('bars.slice(0, i + 1)')) {
    throw new Error('strategy_interface must use bars.slice(0, i + 1)');
  }
});

// Runtime: signals from partial data must equal signals from full data (up to that point)
test('s1_runtime_no_lookahead', () => {
  const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
  const full = fixture.candles;
  const partial = full.slice(0, 50);
  const fullRun = runStrategyOnBars(s1, full);
  const partialRun = runStrategyOnBars(s1, partial);
  // First 50 signals must be identical
  for (let i = 0; i < 50; i++) {
    if (fullRun.signals[i].signal !== partialRun.signals[i].signal) {
      throw new Error(`Signal mismatch at bar ${i}: full=${fullRun.signals[i].signal} partial=${partialRun.signals[i].signal}`);
    }
  }
});

test('s2_runtime_no_lookahead', () => {
  const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
  const full = fixture.candles;
  const partial = full.slice(0, 50);
  const fullRun = runStrategyOnBars(s2, full);
  const partialRun = runStrategyOnBars(s2, partial);
  for (let i = 0; i < 50; i++) {
    if (fullRun.signals[i].signal !== partialRun.signals[i].signal) {
      throw new Error(`Signal mismatch at bar ${i}: full=${fullRun.signals[i].signal} partial=${partialRun.signals[i].signal}`);
    }
  }
});

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

if (update && !isCIMode()) {
  const lines = ['# E108 NO-LOOKAHEAD CONTRACT', '', `- total: ${results.length}`, `- passed: ${passed}`, `- failed: ${failed}`, ''];
  for (const r of results) { lines.push(`### ${r.name}`, `- status: ${r.status}`, r.detail ? `- detail: ${r.detail}` : '', ''); }
  lines.push('## Verdict', `${failed === 0 ? 'PASS' : 'FAIL'} - ${passed}/${results.length} no-lookahead checks`);
  fs.mkdirSync(E108_ROOT, { recursive: true });
  writeMd(path.join(E108_ROOT, 'NO_LOOKAHEAD_CONTRACT.md'), lines.join('\n'));
}

console.log(`e108_no_lookahead_contract: ${passed}/${results.length} passed`);
if (failed > 0) { console.error('FAILED'); process.exit(1); }
console.log('e108_no_lookahead_contract PASSED');
