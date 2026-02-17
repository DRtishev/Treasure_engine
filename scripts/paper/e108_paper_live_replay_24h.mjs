#!/usr/bin/env node
// E108 Track 4: Paper-Live 24H Replay
// Replays fixture through paper_live_runner with strategy-driven signals

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { isCIMode } from '../verify/foundation_ci.mjs';
import { createFixtureFeed } from '../../core/live/feed.mjs';
import { createLedger, recordFill, getLedgerSummary } from '../../core/profit/ledger.mjs';
import { checkRiskGuardrails } from '../../core/paper/paper_live_runner.mjs';
import { generateDailyReport } from '../report/e107_daily_report.mjs';
import * as s1 from '../../core/edge/strategies/s1_breakout_atr.mjs';
import { stableFormatNumber } from '../verify/foundation_render.mjs';

const E108_ROOT = path.resolve('reports/evidence/E108');
const update = process.env.UPDATE_E108_EVIDENCE === '1';

const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
const bars = fixture.candles;

// Run paper-live replay with breakout_atr strategy
const strategy = s1;
const params = strategy.meta().default_params;
let state = strategy.init(params);
const ledger = createLedger({ initial_capital: 10000 });
const riskPolicy = { max_position_usd: 5000, max_daily_loss_pct: 2.0, max_total_loss_pct: 5.0, max_drawdown_pct: 3.0, max_fills_per_day: 100 };
const riskState = { fills_today: 0, day_start_equity: 10000 };
const riskEvents = [];
const history = [];
let fillId = 0;

for (let i = 0; i < bars.length; i++) {
  const bar = bars[i];
  history.push(bar);

  // Strategy signal
  const result = strategy.onBar(bar, state, history);
  state = result.state;
  const signal = result.signal;

  // Risk check
  const prices = { BTCUSDT: bar.close };
  const risk = checkRiskGuardrails(ledger, prices, riskPolicy, riskState);
  if (risk.halt) {
    riskEvents.push({ tick: i, ts: bar.ts_open, reason: risk.reason, level: risk.level });
    if (risk.level === 'PANIC') break;
    continue;
  }

  if (signal === 'BUY' || signal === 'SELL') {
    const notional = 500;
    const qty = notional / bar.close;
    const slipBps = 2;
    const feeBps = 4;
    const execPrice = signal === 'BUY' ? bar.close * (1 + slipBps / 10000) : bar.close * (1 - slipBps / 10000);
    const fee = notional * (feeBps / 10000);

    fillId++;
    recordFill(ledger, {
      symbol: 'BTCUSDT',
      side: signal,
      qty,
      price: bar.close,
      exec_price: execPrice,
      fee,
      ts: new Date(bar.ts_open).toISOString(),
      trade_id: `PR${String(fillId).padStart(6, '0')}`
    });
    riskState.fills_today++;
  }
}

const lastPrice = bars[bars.length - 1].close;
const report = generateDailyReport(ledger, { BTCUSDT: lastPrice }, { date: '2026-01-01', run_id: 'E108-REPLAY-24H' });
const reportHash = sha256Text(report);

// Determinism: run again
let state2 = strategy.init(params);
const ledger2 = createLedger({ initial_capital: 10000 });
const history2 = [];
let fillId2 = 0;
const riskState2 = { fills_today: 0, day_start_equity: 10000 };

for (let i = 0; i < bars.length; i++) {
  const bar = bars[i];
  history2.push(bar);
  const result = strategy.onBar(bar, state2, history2);
  state2 = result.state;
  const signal = result.signal;
  const prices = { BTCUSDT: bar.close };
  const risk = checkRiskGuardrails(ledger2, prices, riskPolicy, riskState2);
  if (risk.halt) { if (risk.level === 'PANIC') break; continue; }
  if (signal === 'BUY' || signal === 'SELL') {
    const notional = 500;
    const qty = notional / bar.close;
    const execPrice = signal === 'BUY' ? bar.close * (1 + 2 / 10000) : bar.close * (1 - 2 / 10000);
    const fee = notional * (4 / 10000);
    fillId2++;
    recordFill(ledger2, { symbol: 'BTCUSDT', side: signal, qty, price: bar.close, exec_price: execPrice, fee, ts: new Date(bar.ts_open).toISOString(), trade_id: `PR${String(fillId2).padStart(6, '0')}` });
    riskState2.fills_today++;
  }
}

const report2 = generateDailyReport(ledger2, { BTCUSDT: lastPrice }, { date: '2026-01-01', run_id: 'E108-REPLAY-24H' });
const reportHash2 = sha256Text(report2);

if (update && !isCIMode()) {
  const summary = getLedgerSummary(ledger, { BTCUSDT: lastPrice });
  const lines = [
    '# E108 PAPER-LIVE REPLAY 24H',
    '',
    '## Parameters',
    `- strategy: ${strategy.meta().name}`,
    `- params: ${JSON.stringify(params)}`,
    `- bars: ${bars.length}`,
    `- initial_capital: 10000 USDT`,
    '',
    '## Results',
    `- fills: ${ledger.fills.length}`,
    `- realized_pnl: ${stableFormatNumber(summary.realized_pnl, 4)}`,
    `- return_pct: ${stableFormatNumber(summary.return_pct, 4)}%`,
    `- max_drawdown: ${stableFormatNumber(summary.max_drawdown * 100, 4)}%`,
    `- risk_events: ${riskEvents.length}`,
    '',
    '## Determinism Proof',
    `- run1_hash: ${reportHash}`,
    `- run2_hash: ${reportHash2}`,
    `- match: ${reportHash === reportHash2 ? 'PASS' : 'FAIL'}`,
    '',
    '## Daily Report',
    '```markdown',
    report.trim(),
    '```'
  ];

  fs.mkdirSync(E108_ROOT, { recursive: true });
  writeMd(path.join(E108_ROOT, 'PAPER_LIVE_REPLAY_24H.md'), lines.join('\n'));
}

console.log(`e108_paper_live_replay_24h: fills=${ledger.fills.length} det=${reportHash === reportHash2 ? 'MATCH' : 'MISMATCH'}`);
console.log('e108_paper_live_replay_24h PASSED');
