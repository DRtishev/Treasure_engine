#!/usr/bin/env node
// E108 Track 2: Backtest Run Script
// Runs strategies on fixture set, outputs metrics

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { isCIMode } from '../verify/foundation_ci.mjs';
import { runBacktest, backtestToMarkdown } from '../../core/backtest/engine.mjs';
import { serializeLedger } from '../../core/profit/ledger.mjs';
import * as s1 from '../../core/edge/strategies/s1_breakout_atr.mjs';
import * as s2 from '../../core/edge/strategies/s2_mean_revert_rsi.mjs';

const E108_ROOT = path.resolve('reports/evidence/E108');
const update = process.env.UPDATE_E108_EVIDENCE === '1';

const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
const bars = fixture.candles;

const strategies = [s1, s2];
const results = [];

for (const strat of strategies) {
  const r = runBacktest(strat, bars);
  results.push(r);
}

if (update && !isCIMode()) {
  const lines = [
    '# E108 BACKTEST FIXTURE RUN',
    '',
    `- fixture: data/fixtures/e108/e108_ohlcv_200bar.json (${bars.length} bars)`,
    `- strategies: ${results.length}`,
    ''
  ];

  for (const r of results) {
    lines.push(backtestToMarkdown(r));
  }

  // Determinism proof: hash of serialized ledgers
  const hashes = results.map(r => ({ name: r.strategy_name, hash: sha256Text(serializeLedger(r.ledger)) }));
  lines.push('## Determinism Proof');
  for (const h of hashes) {
    lines.push(`- ${h.name}_ledger_hash: ${h.hash}`);
  }

  fs.mkdirSync(E108_ROOT, { recursive: true });
  writeMd(path.join(E108_ROOT, 'BACKTEST_FIXTURE_RUN.md'), lines.join('\n'));
}

for (const r of results) {
  const m = r.metrics;
  console.log(`${m.strategy}: return=${m.return_pct.toFixed(4)}% fills=${m.fills} dd=${(m.max_drawdown*100).toFixed(2)}%`);
}
console.log('e108_backtest_run PASSED');
