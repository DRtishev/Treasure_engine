#!/usr/bin/env node
// E108 Track 3: WFO Run Script
// Runs walk-forward optimization on fixture dataset

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { isCIMode } from '../verify/foundation_ci.mjs';
import { generateParamGrid, runWalkForward, wfoToMarkdown } from '../../core/wfo/walk_forward.mjs';
import { runOverfitCourt, overfitCourtToMarkdown } from '../../core/wfo/overfit_court.mjs';
import * as s1 from '../../core/edge/strategies/s1_breakout_atr.mjs';
import * as s2 from '../../core/edge/strategies/s2_mean_revert_rsi.mjs';

const E108_ROOT = path.resolve('reports/evidence/E108');
const update = process.env.UPDATE_E108_EVIDENCE === '1';

const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
const bars = fixture.candles;

const strategies = [
  { strategy: s1, grid: { lookback: { min: 8, max: 12, step: 2 }, atr_period: { min: 10, max: 14, step: 2 }, atr_mult: { min: 1.0, max: 2.0, step: 0.5 } } },
  { strategy: s2, grid: { rsi_period: { min: 10, max: 14, step: 2 }, oversold: { min: 25, max: 35, step: 5 }, overbought: { min: 65, max: 75, step: 5 } } }
];

const wfoLines = ['# E108 WFO REPORT', '', `- fixture: ${bars.length} bars`, ''];
const courtLines = ['# E108 OVERFIT COURT', '', `- fixture: ${bars.length} bars`, ''];
let recommended = null;

for (const { strategy, grid } of strategies) {
  const paramGrid = generateParamGrid(grid);
  const wfo = runWalkForward(strategy, bars, { folds: 3, train_pct: 0.6, param_grid: paramGrid });
  const court = runOverfitCourt(wfo);

  wfoLines.push(wfoToMarkdown(strategy.meta().name, wfo));
  courtLines.push(overfitCourtToMarkdown(strategy.meta().name, court));

  console.log(`WFO ${strategy.meta().name}: best=${JSON.stringify(wfo.best_config)} stability=${wfo.stability.toFixed(4)}`);
  console.log(`  Court: ${court.verdict} ${court.reasons.length > 0 ? '(' + court.reasons.join('; ') + ')' : ''}`);

  if (court.verdict === 'PASS' && !recommended) {
    recommended = { strategy: strategy.meta().name, config: wfo.best_config, court_verdict: court.verdict };
  }
}

if (recommended) {
  wfoLines.push('## Recommended Candidate');
  wfoLines.push(`- strategy: ${recommended.strategy}`);
  wfoLines.push(`- config: ${JSON.stringify(recommended.config)}`);
  wfoLines.push(`- court: ${recommended.court_verdict}`);
} else {
  wfoLines.push('## Recommended Candidate');
  wfoLines.push('- NONE: no strategy passed overfit court');
}

courtLines.push('## Overall Verdict');
courtLines.push(recommended ? `PASS - ${recommended.strategy} recommended` : 'FAIL - No strategy passed all checks');

if (update && !isCIMode()) {
  fs.mkdirSync(E108_ROOT, { recursive: true });
  writeMd(path.join(E108_ROOT, 'WFO_REPORT.md'), wfoLines.join('\n'));
  writeMd(path.join(E108_ROOT, 'OVERFIT_COURT.md'), courtLines.join('\n'));
}

console.log('e108_wfo_run PASSED');
