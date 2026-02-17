#!/usr/bin/env node
// E108 Track 1: Strategy Smoke Test
// Runs each strategy on fixture, produces deterministic STRATEGY_CARD

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { isCIMode } from '../verify/foundation_ci.mjs';
import { validateStrategy, runStrategyOnBars, generateStrategyCard } from '../../core/edge/strategy_interface.mjs';
import * as s1 from '../../core/edge/strategies/s1_breakout_atr.mjs';
import * as s2 from '../../core/edge/strategies/s2_mean_revert_rsi.mjs';

const E108_ROOT = path.resolve('reports/evidence/E108');
const update = process.env.UPDATE_E108_EVIDENCE === '1';

const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
const bars = fixture.candles;

const strategies = [s1, s2];
const results = [];

for (const strat of strategies) {
  const v = validateStrategy(strat);
  if (!v.valid) {
    console.error(`FAIL: ${strat.meta().name}: ${v.errors.join(', ')}`);
    process.exit(1);
  }
  const run = runStrategyOnBars(strat, bars);
  results.push({ strategy: strat, run, card: generateStrategyCard(strat, run, bars) });
}

if (update && !isCIMode()) {
  const cards = [
    '# E108 STRATEGY CARDS',
    '',
    `- fixture: data/fixtures/e108/e108_ohlcv_200bar.json (${bars.length} bars)`,
    `- strategies_evaluated: ${results.length}`,
    ''
  ];

  for (const r of results) {
    cards.push(r.card);
  }

  const cardText = cards.join('\n');
  const cardHash = sha256Text(cardText);
  cards.push(`## Determinism Proof`);
  cards.push(`- cards_hash: ${cardHash}`);

  fs.mkdirSync(E108_ROOT, { recursive: true });
  writeMd(path.join(E108_ROOT, 'STRATEGY_CARDS.md'), cards.join('\n'));
}

console.log(`e108_strategy_smoke: ${results.length} strategies validated and smoke-tested`);
for (const r of results) {
  const m = r.strategy.meta();
  const buys = r.run.signals.filter(s => s.signal === 'BUY').length;
  const sells = r.run.signals.filter(s => s.signal === 'SELL').length;
  console.log(`  ${m.name}: BUY=${buys} SELL=${sells} HOLD=${r.run.signals.length - buys - sells}`);
}
console.log('e108_strategy_smoke PASSED');
