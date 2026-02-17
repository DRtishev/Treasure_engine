#!/usr/bin/env node
// E108 Contract: Backtest Determinism X2
// Run same backtest twice -> identical ledger sha + report sha

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { runBacktest, backtestToMarkdown } from '../../core/backtest/engine.mjs';
import { serializeLedger } from '../../core/profit/ledger.mjs';
import * as s1 from '../../core/edge/strategies/s1_breakout_atr.mjs';
import * as s2 from '../../core/edge/strategies/s2_mean_revert_rsi.mjs';

const E108_ROOT = path.resolve('reports/evidence/E108');
const update = process.env.UPDATE_E108_EVIDENCE === '1';
const results = [];

function test(name, fn) {
  try { fn(); results.push({ name, status: 'PASS', detail: '' }); }
  catch (e) { results.push({ name, status: 'FAIL', detail: e.message }); }
}

const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
const bars = fixture.candles;

for (const strat of [s1, s2]) {
  const name = strat.meta().name;

  test(`${name}_ledger_determinism`, () => {
    const r1 = runBacktest(strat, bars);
    const r2 = runBacktest(strat, bars);
    const h1 = sha256Text(serializeLedger(r1.ledger));
    const h2 = sha256Text(serializeLedger(r2.ledger));
    if (h1 !== h2) throw new Error(`Ledger hash mismatch: ${h1} vs ${h2}`);
  });

  test(`${name}_report_determinism`, () => {
    const r1 = runBacktest(strat, bars);
    const r2 = runBacktest(strat, bars);
    const h1 = sha256Text(backtestToMarkdown(r1));
    const h2 = sha256Text(backtestToMarkdown(r2));
    if (h1 !== h2) throw new Error(`Report hash mismatch: ${h1} vs ${h2}`);
  });

  test(`${name}_signals_determinism`, () => {
    const r1 = runBacktest(strat, bars);
    const r2 = runBacktest(strat, bars);
    const h1 = sha256Text(JSON.stringify(r1.signals));
    const h2 = sha256Text(JSON.stringify(r2.signals));
    if (h1 !== h2) throw new Error(`Signals hash mismatch: ${h1} vs ${h2}`);
  });
}

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

if (update && !isCIMode()) {
  const lines = ['# E108 BACKTEST DETERMINISM X2', '', `- total: ${results.length}`, `- passed: ${passed}`, `- failed: ${failed}`, ''];
  for (const r of results) { lines.push(`### ${r.name}`, `- status: ${r.status}`, r.detail ? `- detail: ${r.detail}` : '', ''); }
  lines.push('## Verdict', `${failed === 0 ? 'PASS' : 'FAIL'} - ${passed}/${results.length} determinism checks`);
  fs.mkdirSync(E108_ROOT, { recursive: true });
  writeMd(path.join(E108_ROOT, 'DETERMINISM_X2.md'), lines.join('\n'));
}

console.log(`e108_backtest_determinism_x2: ${passed}/${results.length} passed`);
if (failed > 0) { console.error('FAILED'); process.exit(1); }
console.log('e108_backtest_determinism_x2 PASSED');
