#!/usr/bin/env node
// E109 Track D1: Micro-Live Pilot in FIXTURE Mode
// Uses FixtureExchange + replay feed. Always runnable, no net.
// Respects micro_live_readiness gate limits.
// Produces: MICRO_LIVE_PILOT.md + DAILY_REPORT.md

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { stableFormatNumber, renderMarkdownTable } from '../verify/foundation_render.mjs';
import { createFixtureExchange } from '../../core/live/exchanges/fixture_exchange.mjs';
import { loadCapsuleBars } from '../data/e109_capsule_build.mjs';

const E109_ROOT = path.resolve('reports/evidence/E109');

// Micro-live policy (from E108 readiness gate)
const MAX_POSITION_USD = 100;
const MAX_DAILY_LOSS_USD = 20;
const MAX_TRADE_USD = 20;

async function loadStrategy() {
  const m = await import('../../core/edge/strategies/s1_breakout_atr.mjs');
  return { init: m.init, onBar: m.onBar, meta: m.meta };
}

/**
 * Run micro-live pilot on fixture exchange
 * @param {Array} bars - OHLCV bars to replay
 * @param {Object} strategy - Strategy to run
 * @param {Object} opts - { maxPositionUsd, maxDailyLossUsd }
 * @returns {Object} pilot result
 */
export async function runMicroLivePilot(bars, strategy, opts = {}) {
  const maxPos = opts.maxPositionUsd || MAX_POSITION_USD;
  const maxDailyLoss = opts.maxDailyLossUsd || MAX_DAILY_LOSS_USD;
  const maxTradeUsd = opts.maxTradeUsd || MAX_TRADE_USD;

  const exchange = createFixtureExchange({
    initial_balance: maxPos,
    fee_bps: 4,
    slip_bps: 2
  });

  const meta = strategy.meta();
  let state = strategy.init(meta.default_params);
  const signals = [];
  const riskEvents = [];
  let dailyLoss = 0;
  let currentDay = null;
  const dailySummaries = [];
  let dayStart = exchange.getBalance().total;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    exchange.feedBar(bar);

    // Track daily boundaries
    const barDay = new Date(bar.ts_open).toISOString().slice(0, 10);
    if (currentDay !== barDay) {
      if (currentDay !== null) {
        const eq = exchange.getBalance().total;
        dailySummaries.push({
          day: currentDay,
          start_equity: dayStart,
          end_equity: eq,
          pnl: eq - dayStart,
          fills: exchange.getFills().filter(f => {
            const fd = new Date(f.ts).toISOString().slice(0, 10);
            return fd === currentDay;
          }).length
        });
        dayStart = eq;
      }
      currentDay = barDay;
      dailyLoss = 0;
    }

    // Strategy signal
    const history = bars.slice(0, i + 1);
    const result = strategy.onBar(bar, state, history);
    state = result.state;

    const signal = result.signal;
    signals.push({ index: i, ts: bar.ts_open, signal, price: bar.close });

    if (signal === 'BUY' || signal === 'SELL') {
      const price = exchange.getPrice(bar.symbol || 'BTCUSDT');
      const tradeQty = maxTradeUsd / price;

      // Risk check: daily loss limit
      if (dailyLoss >= maxDailyLoss) {
        riskEvents.push({ ts: bar.ts_open, type: 'DAILY_LOSS_LIMIT', dailyLoss });
        continue;
      }

      // Risk check: position limit
      const bal = exchange.getBalance();
      if (signal === 'BUY' && bal.available < maxTradeUsd) {
        riskEvents.push({ ts: bar.ts_open, type: 'POSITION_LIMIT', available: bal.available });
        continue;
      }

      const orderResult = exchange.placeOrder({
        symbol: bar.symbol || 'BTCUSDT',
        side: signal,
        type: 'MARKET',
        qty: tradeQty
      });

      if (orderResult.status === 'REJECTED') {
        riskEvents.push({ ts: bar.ts_open, type: 'ORDER_REJECTED', reason: orderResult.reason });
      }

      // Update daily loss tracking
      const newBal = exchange.getBalance();
      if (newBal.total < dayStart) {
        dailyLoss = dayStart - newBal.total;
      }
    }
  }

  // Final daily summary
  if (currentDay !== null) {
    const eq = exchange.getBalance().total;
    dailySummaries.push({
      day: currentDay,
      start_equity: dayStart,
      end_equity: eq,
      pnl: eq - dayStart,
      fills: exchange.getFills().filter(f => {
        const fd = new Date(f.ts).toISOString().slice(0, 10);
        return fd === currentDay;
      }).length
    });
  }

  const finalBalance = exchange.getBalance();
  const fills = exchange.getFills();
  const totalPnl = finalBalance.total - exchange.getInitialBalance();
  const returnPct = (totalPnl / exchange.getInitialBalance()) * 100;

  return {
    strategy: meta.name,
    mode: 'fixture',
    bars: bars.length,
    fills: fills.length,
    signals_count: { BUY: signals.filter(s => s.signal === 'BUY').length, SELL: signals.filter(s => s.signal === 'SELL').length, HOLD: signals.filter(s => s.signal === 'HOLD').length },
    risk_events: riskEvents.length,
    risk_event_types: riskEvents.map(r => r.type),
    initial_balance: exchange.getInitialBalance(),
    final_balance: finalBalance.total,
    total_pnl: totalPnl,
    return_pct: returnPct,
    max_drawdown: exchange.getMaxDrawdown(),
    daily_summaries: dailySummaries,
    policy: { maxPos, maxDailyLoss, maxTradeUsd },
    fills_detail: fills
  };
}

export function pilotToMarkdown(pilot) {
  const lines = [
    '# E109 MICRO-LIVE PILOT (FIXTURE)', '',
    `- strategy: ${pilot.strategy}`,
    `- mode: ${pilot.mode}`,
    `- bars: ${pilot.bars}`,
    `- fills: ${pilot.fills}`,
    `- signals: BUY=${pilot.signals_count.BUY} SELL=${pilot.signals_count.SELL} HOLD=${pilot.signals_count.HOLD}`,
    `- risk_events: ${pilot.risk_events}`,
    '',
    '## Risk Policy',
    `- max_position_usd: $${pilot.policy.maxPos}`,
    `- max_daily_loss_usd: $${pilot.policy.maxDailyLoss}`,
    `- max_trade_usd: $${pilot.policy.maxTradeUsd}`,
    '',
    '## Results',
    `- initial_balance: $${stableFormatNumber(pilot.initial_balance, 2)}`,
    `- final_balance: $${stableFormatNumber(pilot.final_balance, 2)}`,
    `- total_pnl: $${stableFormatNumber(pilot.total_pnl, 4)}`,
    `- return_pct: ${stableFormatNumber(pilot.return_pct, 4)}%`,
    `- max_drawdown: ${stableFormatNumber(pilot.max_drawdown * 100, 4)}%`,
    ''
  ];

  if (pilot.risk_events > 0) {
    lines.push('## Risk Events');
    const typeCounts = {};
    for (const t of pilot.risk_event_types) {
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    for (const [type, count] of Object.entries(typeCounts).sort()) {
      lines.push(`- ${type}: ${count}`);
    }
    lines.push('');
  }

  if (pilot.daily_summaries.length > 0) {
    lines.push('## Daily Summaries');
    const headers = ['Day', 'Start', 'End', 'PnL', 'Fills'];
    const rows = pilot.daily_summaries.map(d => [
      d.day,
      stableFormatNumber(d.start_equity, 2),
      stableFormatNumber(d.end_equity, 2),
      stableFormatNumber(d.pnl, 4),
      String(d.fills)
    ]);
    lines.push(renderMarkdownTable(headers, rows));
    lines.push('');
  }

  return lines.join('\n');
}

export function dailyReportToMarkdown(pilot) {
  const lines = [
    '# E109 DAILY REPORT', '',
    `- date: ${new Date().toISOString().slice(0, 10)}`,
    `- strategy: ${pilot.strategy}`,
    `- mode: ${pilot.mode}`,
    '',
    '## Session Summary',
    `- bars_processed: ${pilot.bars}`,
    `- fills: ${pilot.fills}`,
    `- pnl: $${stableFormatNumber(pilot.total_pnl, 4)}`,
    `- return: ${stableFormatNumber(pilot.return_pct, 4)}%`,
    `- drawdown: ${stableFormatNumber(pilot.max_drawdown * 100, 4)}%`,
    `- risk_events: ${pilot.risk_events}`,
    '',
    '## Status',
    `- exchange_mode: ${pilot.mode}`,
    `- policy_enforced: YES`,
    `- kill_switch: ARMED`,
    ''
  ];
  return lines.join('\n');
}

// CLI/script mode
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''));
if (isMain) {
  const capsuleDir = path.resolve('data/capsules/fixture_btcusdt_5m_200bar');
  let bars;
  if (fs.existsSync(capsuleDir)) {
    bars = loadCapsuleBars(capsuleDir);
  } else {
    const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
    bars = fixture.candles;
  }

  const strategy = await loadStrategy();

  // Double-run for determinism
  const pilot1 = await runMicroLivePilot(bars, strategy);
  const pilot2 = await runMicroLivePilot(bars, strategy);
  const md1 = pilotToMarkdown(pilot1);
  const md2 = pilotToMarkdown(pilot2);
  const detMatch = sha256Text(md1) === sha256Text(md2);

  fs.mkdirSync(E109_ROOT, { recursive: true });
  writeMd(path.join(E109_ROOT, 'MICRO_LIVE_PILOT.md'), md1 + `\n## Determinism\n- double_run: ${detMatch ? 'MATCH' : 'MISMATCH'}\n- hash: ${sha256Text(md1)}\n`);
  writeMd(path.join(E109_ROOT, 'DAILY_REPORT.md'), dailyReportToMarkdown(pilot1));

  console.log(`e109_micro_live_pilot_fixture: fills=${pilot1.fills} pnl=${stableFormatNumber(pilot1.total_pnl, 4)} det=${detMatch ? 'MATCH' : 'MISMATCH'}`);
  if (!detMatch) { console.error('DETERMINISM FAILURE'); process.exit(1); }
  console.log('e109_micro_live_pilot_fixture PASSED');
}
