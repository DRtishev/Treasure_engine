#!/usr/bin/env node
// E107 Contract: Paper-Live Runner end-to-end test
// Tests full loop: Feed → Fills → Ledger → Report on fixture data

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { E107_ROOT } from './e107_lib.mjs';
import { createFixtureFeed, createLiveFeed } from '../../core/live/feed.mjs';
import { runPaperLiveLoop, checkRiskGuardrails, paperExecute, simpleSignal } from '../../core/paper/paper_live_runner.mjs';
import { createLedger } from '../../core/profit/ledger.mjs';

const update = process.env.UPDATE_E107_EVIDENCE === '1';
const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS', detail: '' });
  } catch (e) {
    results.push({ name, status: 'FAIL', detail: e.message });
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

// Load fixture
const fixtureRaw = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e107/e107_ohlcv_fixture.json'), 'utf8'));

// Test 1: createFixtureFeed works
test('fixture_feed_basic', () => {
  const feed = createFixtureFeed(fixtureRaw.candles);
  assertEqual(feed.mode, 'fixture');
  assertEqual(feed.length(), 20);
  assertEqual(feed.hasMore(), true);
  const tick = feed.next();
  assertEqual(tick.type, 'candle');
  assertEqual(tick.symbol, 'BTCUSDT');
});

// Test 2: fixture feed exhaustion
test('fixture_feed_exhaustion', () => {
  const feed = createFixtureFeed(fixtureRaw.candles);
  let count = 0;
  while (feed.hasMore()) { feed.next(); count++; }
  assertEqual(count, 20);
  assertEqual(feed.hasMore(), false);
  assertEqual(feed.next(), null);
});

// Test 3: fixture feed reset
test('fixture_feed_reset', () => {
  const feed = createFixtureFeed(fixtureRaw.candles);
  feed.next(); feed.next();
  assertEqual(feed.consumed(), 2);
  feed.reset();
  assertEqual(feed.consumed(), 0);
  assertEqual(feed.hasMore(), true);
});

// Test 4: simpleSignal returns valid values
test('simpleSignal_valid', () => {
  const hold = simpleSignal([]);
  assertEqual(hold, 'HOLD');
  const hold2 = simpleSignal([{ price: 100 }]);
  assertEqual(hold2, 'HOLD');
});

// Test 5: simpleSignal momentum
test('simpleSignal_momentum', () => {
  // Rising prices -> BUY
  const history = [{ price: 100 }, { price: 100.5 }, { price: 101.2 }];
  const sig = simpleSignal(history);
  assertEqual(sig === 'BUY' || sig === 'HOLD', true);
});

// Test 6: paperExecute returns fill for BUY/SELL
test('paperExecute_buy', () => {
  const tick = { symbol: 'BTCUSDT', price: 42000, ts: '2026-01-01T00:00:00Z' };
  const policy = { max_position_usd: 5000 };
  const fill = paperExecute(tick, 'BUY', policy);
  assertEqual(fill.side, 'BUY');
  assertEqual(fill.symbol, 'BTCUSDT');
  assertEqual(fill.exec_price > fill.price, true); // slippage for BUY
});

// Test 7: paperExecute returns null for HOLD
test('paperExecute_hold', () => {
  const tick = { symbol: 'BTCUSDT', price: 42000, ts: '2026-01-01T00:00:00Z' };
  const fill = paperExecute(tick, 'HOLD', {});
  assertEqual(fill, null);
});

// Test 8: checkRiskGuardrails OK
test('risk_guardrails_ok', () => {
  const l = createLedger({ initial_capital: 10000 });
  const policy = { max_position_usd: 5000, max_daily_loss_pct: 2, max_total_loss_pct: 5, max_drawdown_pct: 3, max_fills_per_day: 100 };
  const risk = checkRiskGuardrails(l, {}, policy, { fills_today: 0, day_start_equity: 10000 });
  assertEqual(risk.halt, false);
});

// Test 9: checkRiskGuardrails max fills
test('risk_guardrails_max_fills', () => {
  const l = createLedger({ initial_capital: 10000 });
  const policy = { max_position_usd: 5000, max_daily_loss_pct: 2, max_total_loss_pct: 5, max_drawdown_pct: 3, max_fills_per_day: 5 };
  const risk = checkRiskGuardrails(l, {}, policy, { fills_today: 5, day_start_equity: 10000 });
  assertEqual(risk.halt, true);
  assertEqual(risk.reason, 'MAX_FILLS_PER_DAY');
});

// Test 10: Full paper-live loop on fixture
test('paper_live_loop_full', () => {
  const feed = createFixtureFeed(fixtureRaw.candles);
  const result = runPaperLiveLoop(feed, {
    initial_capital: 10000,
    date: '2026-01-01',
    run_id: 'E107-TEST-001'
  });
  assertEqual(result.status, 'COMPLETED');
  assertEqual(result.ticks_processed, 20);
  assertEqual(typeof result.report, 'string');
  assertEqual(result.report.includes('# E107 Daily Report'), true);
  assertEqual(result.report.includes('PnL Summary'), true);
});

// Test 11: Paper-live loop determinism
test('paper_live_loop_deterministic', () => {
  const feed1 = createFixtureFeed(fixtureRaw.candles);
  const r1 = runPaperLiveLoop(feed1, { initial_capital: 10000, date: '2026-01-01', run_id: 'E107-DET-001' });
  const feed2 = createFixtureFeed(fixtureRaw.candles);
  const r2 = runPaperLiveLoop(feed2, { initial_capital: 10000, date: '2026-01-01', run_id: 'E107-DET-001' });
  assertEqual(sha256Text(r1.report), sha256Text(r2.report));
  assertEqual(r1.fills_count, r2.fills_count);
  assertEqual(r1.ticks_processed, r2.ticks_processed);
});

// Test 12: createLiveFeed requires ENABLE_NET
test('liveFeed_requires_net', () => {
  let threw = false;
  try {
    createLiveFeed();
    threw = false;
  } catch (e) {
    threw = true;
  }
  assertEqual(threw, true);
});

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const total = results.length;

console.log(`e107_paper_live_contract: ${passed}/${total} passed`);

if (update && !isCIMode()) {
  const lines = [
    '# E107 PAPER-LIVE CONTRACT',
    '',
    '## Purpose',
    'End-to-end test of paper-live loop:',
    '- Feed abstraction (fixture mode)',
    '- Signal generation',
    '- Paper execution',
    '- Risk guardrails',
    '- Full loop determinism',
    '',
    '## Results',
    `- total: ${total}`,
    `- passed: ${passed}`,
    `- failed: ${failed}`,
    ''
  ];

  for (const r of results) {
    lines.push(`### ${r.name}`);
    lines.push(`- status: ${r.status}`);
    if (r.detail) lines.push(`- detail: ${r.detail}`);
    lines.push('');
  }

  lines.push('## Verdict');
  lines.push(`${failed === 0 ? 'PASS' : 'FAIL'} - ${passed}/${total} paper-live tests`);

  fs.mkdirSync(E107_ROOT, { recursive: true });
  writeMd(path.join(E107_ROOT, 'PAPER_LIVE_CONTRACT.md'), lines.join('\n'));
}

if (failed > 0) {
  console.error(`e107_paper_live_contract FAILED: ${failed}/${total}`);
  process.exit(1);
}

console.log('e107_paper_live_contract PASSED');
