#!/usr/bin/env node
// E107 Contract: Profit Ledger deterministic behavior
// Tests ledger operations, PnL calculations, deterministic ordering

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { stableFormatNumber } from './foundation_render.mjs';
import { E107_ROOT } from './e107_lib.mjs';
import {
  createLedger, recordFill, getLedgerSummary, getEquity,
  getUnrealizedPnL, fillsToMarkdownTable, serializeLedger,
  detectAnomalies
} from '../../core/profit/ledger.mjs';

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

function assertClose(actual, expected, tolerance = 0.0001, msg = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg}: expected ~${expected}, got ${actual} (diff=${Math.abs(actual - expected)})`);
  }
}

// Test 1: createLedger returns valid initial state
test('createLedger_defaults', () => {
  const l = createLedger();
  assertEqual(l.initial_capital, 10000);
  assertEqual(l.currency, 'USDT');
  assertEqual(l.fills.length, 0);
  assertEqual(l.realized_pnl, 0);
  assertEqual(l.total_fees, 0);
});

// Test 2: createLedger with custom config
test('createLedger_custom', () => {
  const l = createLedger({ initial_capital: 50000, currency: 'BTC' });
  assertEqual(l.initial_capital, 50000);
  assertEqual(l.currency, 'BTC');
});

// Test 3: recordFill BUY
test('recordFill_buy', () => {
  const l = createLedger();
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42010, fee: 1.68, ts: '2026-01-01T00:00:00Z' });
  assertEqual(l.fills.length, 1);
  assertEqual(l.positions.BTCUSDT.qty, 0.1);
  assertClose(l.positions.BTCUSDT.avg_price, 42010);
  assertClose(l.total_fees, 1.68);
});

// Test 4: recordFill SELL with realized PnL
test('recordFill_sell_pnl', () => {
  const l = createLedger();
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42000, fee: 1.68, ts: '2026-01-01T00:00:00Z' });
  recordFill(l, { symbol: 'BTCUSDT', side: 'SELL', qty: 0.1, price: 42500, exec_price: 42500, fee: 1.70, ts: '2026-01-01T00:05:00Z' });
  // PnL = (42500 - 42000) * 0.1 - 1.70 = 50 - 1.70 = 48.30
  assertClose(l.realized_pnl, 48.30, 0.01);
  assertEqual(l.positions.BTCUSDT.qty, 0);
});

// Test 5: getEquity with unrealized PnL
test('getEquity_unrealized', () => {
  const l = createLedger({ initial_capital: 10000 });
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42000, fee: 0, ts: '2026-01-01T00:00:00Z' });
  const equity = getEquity(l, { BTCUSDT: 43000 });
  // equity = 10000 + 0 (realized) + (43000 - 42000) * 0.1 (unrealized) = 10100
  assertClose(equity, 10100, 0.01);
});

// Test 6: getUnrealizedPnL
test('getUnrealizedPnL', () => {
  const l = createLedger();
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42000, fee: 0, ts: '2026-01-01T00:00:00Z' });
  const upnl = getUnrealizedPnL(l, { BTCUSDT: 41000 });
  assertClose(upnl, -100, 0.01);
});

// Test 7: getLedgerSummary
test('getLedgerSummary', () => {
  const l = createLedger({ initial_capital: 10000 });
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42000, fee: 1, ts: '2026-01-01T00:00:00Z' });
  recordFill(l, { symbol: 'BTCUSDT', side: 'SELL', qty: 0.1, price: 42500, exec_price: 42500, fee: 1, ts: '2026-01-01T00:05:00Z' });
  const s = getLedgerSummary(l, {});
  assertEqual(s.total_fills, 2);
  assertClose(s.total_fees, 2);
});

// Test 8: fillsToMarkdownTable is deterministic
test('fillsToMarkdownTable_deterministic', () => {
  const l = createLedger();
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42010, fee: 1.68, ts: '2026-01-01T00:00:00Z', trade_id: 'T000001' });
  const table1 = fillsToMarkdownTable(l);
  const table2 = fillsToMarkdownTable(l);
  assertEqual(table1, table2);
  assertEqual(sha256Text(table1), sha256Text(table2));
});

// Test 9: serializeLedger is deterministic
test('serializeLedger_deterministic', () => {
  const l = createLedger();
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42010, fee: 1.68, ts: '2026-01-01T00:00:00Z' });
  recordFill(l, { symbol: 'ETHUSDT', side: 'BUY', qty: 1.0, price: 2200, exec_price: 2201, fee: 0.88, ts: '2026-01-01T00:01:00Z' });
  const s1 = serializeLedger(l);
  const s2 = serializeLedger(l);
  assertEqual(sha256Text(s1), sha256Text(s2));
});

// Test 10: detectAnomalies returns empty for clean ledger
test('detectAnomalies_clean', () => {
  const l = createLedger();
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.001, price: 42000, exec_price: 42001, fee: 0.01, ts: '2026-01-01T00:00:00Z' });
  const a = detectAnomalies(l);
  assertEqual(a.length, 0);
});

// Test 11: drawdown tracking
test('drawdown_tracking', () => {
  const l = createLedger({ initial_capital: 10000 });
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.5, price: 42000, exec_price: 42000, fee: 0, ts: '2026-01-01T00:00:00Z' });
  recordFill(l, { symbol: 'BTCUSDT', side: 'SELL', qty: 0.5, price: 41000, exec_price: 41000, fee: 0, ts: '2026-01-01T00:05:00Z' });
  // Lost (42000 - 41000) * 0.5 = 500
  assertClose(l.realized_pnl, -500, 0.01);
});

// Test 12: multiple symbols
test('multiple_symbols', () => {
  const l = createLedger();
  recordFill(l, { symbol: 'BTCUSDT', side: 'BUY', qty: 0.1, price: 42000, exec_price: 42000, fee: 0, ts: '2026-01-01T00:00:00Z' });
  recordFill(l, { symbol: 'ETHUSDT', side: 'BUY', qty: 1.0, price: 2200, exec_price: 2200, fee: 0, ts: '2026-01-01T00:01:00Z' });
  assertEqual(l.positions.BTCUSDT.qty, 0.1);
  assertEqual(l.positions.ETHUSDT.qty, 1.0);
});

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const total = results.length;

console.log(`e107_profit_ledger_contract: ${passed}/${total} passed`);

if (update && !isCIMode()) {
  const lines = [
    '# E107 PROFIT LEDGER CONTRACT',
    '',
    '## Purpose',
    'Verify profit ledger deterministic behavior:',
    '- Fill recording, position tracking',
    '- Realized/unrealized PnL computation',
    '- Deterministic serialization and markdown output',
    '- Anomaly detection',
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
  lines.push(`${failed === 0 ? 'PASS' : 'FAIL'} - ${passed}/${total} ledger tests`);

  fs.mkdirSync(E107_ROOT, { recursive: true });
  writeMd(path.join(E107_ROOT, 'PROFIT_LEDGER_CONTRACT.md'), lines.join('\n'));
}

if (failed > 0) {
  console.error(`e107_profit_ledger_contract FAILED: ${failed}/${total}`);
  process.exit(1);
}

console.log('e107_profit_ledger_contract PASSED');
