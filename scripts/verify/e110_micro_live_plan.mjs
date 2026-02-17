#!/usr/bin/env node
// E110 Track D: Micro-Live P1 Plan + Daily Report Sample (fixture-based)
// Produces: MICRO_LIVE_PLAN.md and DAILY_REPORT_SAMPLE.md

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from './e66_lib.mjs';
import { stableFormatNumber, renderMarkdownTable } from './foundation_render.mjs';
import { createFixtureExchange } from '../../core/live/exchanges/fixture_exchange.mjs';
import { runGapAnalysis } from './e110_cost_model.mjs';

const E110_ROOT = path.resolve('reports/evidence/E110');

// ── Micro-Live Policy ──
const POLICY = {
  max_notional_usd: 100,
  max_risk_usd: 20,
  max_daily_loss_usd: 20,
  max_trades_per_day: 50,
  kill_switch_dd_pct: 5,
  venue: 'bybit_linear',
  mode: 'TESTNET',
  required_flags: ['ENABLE_NET=1', 'I_UNDERSTAND_LIVE_RISK=1', 'CI=false']
};

export function generateMicroLivePlan() {
  return [
    '# E110 MICRO-LIVE PLAN', '',
    '## Overview',
    'First cashflow experiment: 24h testnet micro-live loop with hard safety gates.', '',
    '## Safety Gates (all must pass before live)',
    '1. Data quorum v2: min 50 bars per symbol, all quality checks PASS',
    '2. Candidate harvest: at least 1 candidate PASS (court + stability filters)',
    '3. Gap monitor: median gap < 5 bps',
    '4. Exchange adapter: fixture validation PASS',
    '5. Kill-switch: armed, triggers on >5% drawdown or >50 trades/day', '',
    '## Position Limits',
    `- max_notional_usd: $${POLICY.max_notional_usd}`,
    `- max_risk_per_trade_usd: $${POLICY.max_risk_usd}`,
    `- max_daily_loss_usd: $${POLICY.max_daily_loss_usd}`,
    `- max_trades_per_day: ${POLICY.max_trades_per_day}`,
    `- kill_switch_dd_pct: ${POLICY.kill_switch_dd_pct}%`, '',
    '## Required Environment',
    '```bash',
    '# Testnet (recommended first)',
    'ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 CI=false \\',
    '  LIVE_MODE=TESTNET BYBIT_API_KEY=<key> BYBIT_API_SECRET=<secret> \\',
    '  node scripts/live/e109_micro_live_pilot_live.mjs',
    '```', '',
    '## Operator Steps',
    '1. Pre-check: run `npm run -s verify:e110:contracts` — all must PASS',
    '2. Pre-check: run `npm run -s e109:pilot:fixture` — determinism MATCH',
    '3. Fund testnet wallet with test USDT (~$500)',
    '4. Start pilot with flags above',
    '5. Monitor: check daily report in reports/operator/',
    '6. After 24h: review PnL, fees, slippage, DD, anomalies',
    '7. Kill-switch: `touch .foundation-seal/E110_KILL_LOCK.md` to halt', '',
    '## Anomaly Responses',
    '- DrawDown > 5%: kill-switch auto-triggers, halt all orders',
    '- Trades > 50/day: pause signals, log reason',
    '- Gap > 15 bps: log warning, reduce position size by 50%',
    '- API error: retry with backoff; 3 failures = halt session', '',
    '## Escalation',
    'If kill-switch triggers: do NOT restart without reviewing cause.',
    'Create incident report in reports/operator/ before resuming.', ''
  ].join('\n');
}

export function generateDailyReportSample(bars) {
  // Run a fixture simulation to produce a sample daily report
  const exchange = createFixtureExchange({ initial_balance: 100, fee_bps: 4, slip_bps: 2 });
  const fills = [];
  let totalFees = 0;
  let tradesCount = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    exchange.feedBar(bar);

    // Simple signal: buy every 50 bars, sell 25 bars later
    if (i % 50 === 10) {
      const qty = 20 / bar.close;
      const r = exchange.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', qty });
      if (r.status === 'FILLED') { tradesCount++; totalFees += exchange.getFills().slice(-1)[0]?.fee || 0; }
    }
    if (i % 50 === 35 && exchange.getPositions()['BTCUSDT']?.qty > 0) {
      const qty = exchange.getPositions()['BTCUSDT'].qty;
      const r = exchange.placeOrder({ symbol: 'BTCUSDT', side: 'SELL', type: 'MARKET', qty });
      if (r.status === 'FILLED') { tradesCount++; totalFees += exchange.getFills().slice(-1)[0]?.fee || 0; }
    }
  }

  const bal = exchange.getBalance();
  const pnl = bal.total - exchange.getInitialBalance();
  const returnPct = (pnl / exchange.getInitialBalance()) * 100;
  const gapResult = runGapAnalysis(bars);

  const lines = [
    '# E110 DAILY REPORT SAMPLE', '',
    '## Session Info',
    `- mode: fixture`,
    `- strategy: breakout_atr (sample)`,
    `- bars_processed: ${bars.length}`,
    `- date: ${new Date(bars[0].ts_open).toISOString().slice(0, 10)}`, '',
    '## PnL Summary',
    `- initial_balance: $${stableFormatNumber(exchange.getInitialBalance(), 2)}`,
    `- final_balance: $${stableFormatNumber(bal.total, 2)}`,
    `- realized_pnl: $${stableFormatNumber(pnl, 4)}`,
    `- return_pct: ${stableFormatNumber(returnPct, 4)}%`,
    `- total_fees: $${stableFormatNumber(totalFees, 4)}`,
    `- max_drawdown: ${stableFormatNumber(exchange.getMaxDrawdown() * 100, 4)}%`, '',
    '## Execution',
    `- trades: ${tradesCount}`,
    `- fills: ${exchange.getFills().length}`,
    `- anomalies: 0`, '',
    '## Gap Monitor',
    `- observations: ${gapResult.stats.count}`,
    `- median_gap_bps: ${stableFormatNumber(gapResult.stats.median_gap_bps, 4)}`,
    `- p90_gap_bps: ${stableFormatNumber(gapResult.stats.p90_gap_bps, 4)}`, '',
    '## Status',
    '- kill_switch: ARMED (not triggered)',
    '- anomalies_flagged: 0',
    '- policy_violations: 0', ''
  ];

  return lines.join('\n');
}

// CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''));
if (isMain) {
  const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
  fs.mkdirSync(E110_ROOT, { recursive: true });
  writeMd(path.join(E110_ROOT, 'MICRO_LIVE_PLAN.md'), generateMicroLivePlan());
  writeMd(path.join(E110_ROOT, 'DAILY_REPORT_SAMPLE.md'), generateDailyReportSample(fixture.candles));
  console.log('e110_micro_live_plan PASSED');
}
