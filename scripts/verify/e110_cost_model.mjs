#!/usr/bin/env node
// E110 Track B: Execution Cost Model v1 + Gap Monitor
// Deterministic cost model for fees + slippage + latency budget.
// Gap Monitor compares expected vs observed costs.

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from './e66_lib.mjs';
import { stableFormatNumber, renderMarkdownTable } from './foundation_render.mjs';
import { createFixtureExchange } from '../../core/live/exchanges/fixture_exchange.mjs';

const E110_ROOT = path.resolve('reports/evidence/E110');

// ── Cost Model Configuration (per venue) ──
const VENUE_PROFILES = {
  bybit_linear: {
    maker_bps: 1,      // 0.01%
    taker_bps: 6,      // 0.06%
    slippage_bps: 2,   // estimated 0.02% for small orders
    latency_ms: 50     // round-trip budget
  },
  fixture: {
    maker_bps: 4,
    taker_bps: 4,
    slippage_bps: 2,
    latency_ms: 0      // instant in fixture
  }
};

/**
 * Compute expected execution cost for a trade.
 * @param {Object} opts - { notional_usd, side, venue, orderType }
 * @returns {Object} { fee_usd, slippage_usd, total_cost_usd, cost_bps }
 */
export function expectedCost(opts) {
  const profile = VENUE_PROFILES[opts.venue || 'fixture'] || VENUE_PROFILES.fixture;
  const notional = opts.notional_usd || 100;
  const feeBps = opts.orderType === 'LIMIT' ? profile.maker_bps : profile.taker_bps;
  const fee_usd = notional * (feeBps / 10000);
  const slippage_usd = notional * (profile.slippage_bps / 10000);
  const total_cost_usd = fee_usd + slippage_usd;
  const cost_bps = (total_cost_usd / notional) * 10000;
  return { fee_usd, slippage_usd, total_cost_usd, cost_bps, latency_ms: profile.latency_ms };
}

/**
 * Run gap analysis: expected vs observed fills from fixture exchange.
 * @param {Array} bars - OHLCV bars to replay
 * @returns {Object} gap analysis results
 */
export function runGapAnalysis(bars) {
  const exchange = createFixtureExchange({ initial_balance: 10000, fee_bps: 4, slip_bps: 2 });

  // Replay and collect fills
  const observations = [];
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    exchange.feedBar(bar);

    // Place a buy every 50 bars, sell 25 bars later
    if (i % 50 === 10) {
      const price = bar.close;
      const qty = 20 / price; // $20 notional
      const result = exchange.placeOrder({ symbol: bar.symbol || 'BTCUSDT', side: 'BUY', type: 'MARKET', qty });
      if (result.status === 'FILLED') {
        const expected = expectedCost({ notional_usd: 20, side: 'BUY', venue: 'fixture', orderType: 'MARKET' });
        const fills = exchange.fetchFills(bar.ts_open);
        const lastFill = fills[fills.length - 1];
        const observedSlipBps = Math.abs(lastFill.price - price) / price * 10000;
        const observedFeeBps = lastFill.fee / (qty * lastFill.price) * 10000;
        observations.push({
          side: 'BUY',
          bar_index: i,
          expected_cost_bps: expected.cost_bps,
          observed_slip_bps: observedSlipBps,
          observed_fee_bps: observedFeeBps,
          observed_total_bps: observedSlipBps + observedFeeBps,
          gap_bps: (observedSlipBps + observedFeeBps) - expected.cost_bps
        });
      }
    }
    if (i % 50 === 35 && exchange.getPositions()['BTCUSDT']?.qty > 0) {
      const price = bar.close;
      const pos = exchange.getPositions()['BTCUSDT'];
      const qty = pos.qty;
      const result = exchange.placeOrder({ symbol: bar.symbol || 'BTCUSDT', side: 'SELL', type: 'MARKET', qty });
      if (result.status === 'FILLED') {
        const expected = expectedCost({ notional_usd: qty * price, side: 'SELL', venue: 'fixture', orderType: 'MARKET' });
        const fills = exchange.fetchFills(bar.ts_open);
        const lastFill = fills[fills.length - 1];
        const observedSlipBps = Math.abs(price - lastFill.price) / price * 10000;
        const observedFeeBps = lastFill.fee / (qty * lastFill.price) * 10000;
        observations.push({
          side: 'SELL',
          bar_index: i,
          expected_cost_bps: expected.cost_bps,
          observed_slip_bps: observedSlipBps,
          observed_fee_bps: observedFeeBps,
          observed_total_bps: observedSlipBps + observedFeeBps,
          gap_bps: (observedSlipBps + observedFeeBps) - expected.cost_bps
        });
      }
    }
  }

  if (observations.length === 0) {
    return { observations: [], stats: { median_gap_bps: 0, p90_gap_bps: 0, worst_gap_bps: 0, count: 0 } };
  }

  // Compute gap statistics
  const gaps = observations.map(o => Math.abs(o.gap_bps)).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const p90 = gaps[Math.floor(gaps.length * 0.9)];
  const worst = gaps[gaps.length - 1];

  return {
    observations,
    stats: {
      median_gap_bps: median,
      p90_gap_bps: p90,
      worst_gap_bps: worst,
      count: observations.length,
      mean_gap_bps: gaps.reduce((a, b) => a + b, 0) / gaps.length
    }
  };
}

// Gap threshold contract: FAIL if median gap > 5 bps
const GAP_THRESHOLD_BPS = 5;

export function runGapContract(gapResult) {
  const checks = [];
  let allPass = true;

  function check(name, pass, detail) {
    checks.push({ name, pass, detail });
    if (!pass) allPass = false;
  }

  check('has_observations', gapResult.stats.count > 0, `count: ${gapResult.stats.count}`);
  check('median_gap_within_budget', gapResult.stats.median_gap_bps <= GAP_THRESHOLD_BPS,
    `median=${stableFormatNumber(gapResult.stats.median_gap_bps, 2)} <= ${GAP_THRESHOLD_BPS}`);
  check('p90_gap_reasonable', gapResult.stats.p90_gap_bps <= GAP_THRESHOLD_BPS * 3,
    `p90=${stableFormatNumber(gapResult.stats.p90_gap_bps, 2)} <= ${GAP_THRESHOLD_BPS * 3}`);

  return { passed: allPass, checks, total: checks.length, passed_count: checks.filter(c => c.pass).length };
}

export function costModelToMarkdown() {
  const lines = [
    '# E110 EXECUTION COST MODEL', '',
    '## Venue Profiles'
  ];
  const headers = ['Venue', 'Maker_bps', 'Taker_bps', 'Slip_bps', 'Latency_ms'];
  const rows = Object.entries(VENUE_PROFILES).map(([name, p]) => [
    name, String(p.maker_bps), String(p.taker_bps), String(p.slippage_bps), String(p.latency_ms)
  ]);
  lines.push(renderMarkdownTable(headers, rows));
  lines.push('');

  lines.push('## Expected Cost Examples');
  const examples = [
    { notional_usd: 20, venue: 'fixture', orderType: 'MARKET' },
    { notional_usd: 100, venue: 'fixture', orderType: 'MARKET' },
    { notional_usd: 100, venue: 'bybit_linear', orderType: 'MARKET' },
    { notional_usd: 100, venue: 'bybit_linear', orderType: 'LIMIT' }
  ];
  const eHeaders = ['Notional', 'Venue', 'Type', 'Fee$', 'Slip$', 'Total$', 'Cost_bps'];
  const eRows = examples.map(e => {
    const c = expectedCost(e);
    return [`$${e.notional_usd}`, e.venue, e.orderType,
      stableFormatNumber(c.fee_usd, 4), stableFormatNumber(c.slippage_usd, 4),
      stableFormatNumber(c.total_cost_usd, 4), stableFormatNumber(c.cost_bps, 2)];
  });
  lines.push(renderMarkdownTable(eHeaders, eRows));
  lines.push('');

  lines.push('## Model Properties');
  lines.push('- Deterministic: same inputs produce same outputs');
  lines.push('- Configurable per venue: maker/taker, slippage, latency');
  lines.push('- No hidden costs: all components explicit');
  lines.push('');

  return lines.join('\n');
}

export function gapReportToMarkdown(gapResult, contractResult) {
  const lines = [
    '# E110 GAP REPORT', '',
    '## Gap Analysis Summary',
    `- observations: ${gapResult.stats.count}`,
    `- median_gap_bps: ${stableFormatNumber(gapResult.stats.median_gap_bps, 4)}`,
    `- p90_gap_bps: ${stableFormatNumber(gapResult.stats.p90_gap_bps, 4)}`,
    `- worst_gap_bps: ${stableFormatNumber(gapResult.stats.worst_gap_bps, 4)}`,
    `- mean_gap_bps: ${stableFormatNumber(gapResult.stats.mean_gap_bps, 4)}`,
    `- threshold_bps: ${GAP_THRESHOLD_BPS}`,
    ''
  ];

  if (gapResult.observations.length > 0) {
    lines.push('## Observations');
    const headers = ['Side', 'BarIdx', 'Expected_bps', 'Observed_bps', 'Gap_bps'];
    const rows = gapResult.observations.map(o => [
      o.side, String(o.bar_index),
      stableFormatNumber(o.expected_cost_bps, 2),
      stableFormatNumber(o.observed_total_bps, 2),
      stableFormatNumber(o.gap_bps, 4)
    ]);
    lines.push(renderMarkdownTable(headers, rows));
    lines.push('');
  }

  lines.push('## Gap Contract');
  lines.push(`- passed: ${contractResult.passed_count}/${contractResult.total}`);
  for (const c of contractResult.checks) {
    lines.push(`- ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
  }
  lines.push('');

  // Determinism hash
  const content = lines.join('\n');
  lines.push(`## Determinism`);
  lines.push(`- report_hash: ${sha256Text(content)}`);
  lines.push('');

  return lines.join('\n');
}

// CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''));
if (isMain) {
  const fixturePath = path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const bars = fixture.candles;

  const gapResult = runGapAnalysis(bars);
  const contractResult = runGapContract(gapResult);

  fs.mkdirSync(E110_ROOT, { recursive: true });
  writeMd(path.join(E110_ROOT, 'EXEC_COST_MODEL.md'), costModelToMarkdown());
  writeMd(path.join(E110_ROOT, 'GAP_REPORT.md'), gapReportToMarkdown(gapResult, contractResult));

  console.log(`e110_cost_model: ${gapResult.stats.count} obs, median_gap=${stableFormatNumber(gapResult.stats.median_gap_bps, 2)}bps`);
  console.log(`e110_gap_contract: ${contractResult.passed_count}/${contractResult.total}`);
  if (!contractResult.passed) { console.error('e110_gap_contract FAILED'); process.exit(1); }
  console.log('e110_cost_model PASSED');
}
