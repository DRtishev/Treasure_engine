#!/usr/bin/env node
// E109 Track D2: Operator Live Pilot (optional, NOT in CI)
// Requires: ENABLE_NET=1, LIVE_MODE=TESTNET|MAINNET, I_UNDERSTAND_LIVE_RISK=1
// Must NEVER run during CI truthy mode.
// Produces operator report md locally (NOT required for CI gates).

import fs from 'node:fs';
import path from 'node:path';
import { isCIMode } from '../verify/foundation_ci.mjs';
import { writeMd } from '../verify/e66_lib.mjs';
import { stableFormatNumber } from '../verify/foundation_render.mjs';

// Strict safety checks
if (isCIMode()) {
  console.error('BLOCKED: Live pilot cannot run in CI mode');
  process.exit(1);
}
if (process.env.ENABLE_NET !== '1') {
  console.error('BLOCKED: Set ENABLE_NET=1 to enable live pilot');
  process.exit(1);
}
if (process.env.I_UNDERSTAND_LIVE_RISK !== '1') {
  console.error('BLOCKED: Set I_UNDERSTAND_LIVE_RISK=1 to acknowledge live trading risk');
  process.exit(1);
}

const LIVE_MODE = process.env.LIVE_MODE || 'TESTNET';
if (!['TESTNET', 'MAINNET'].includes(LIVE_MODE)) {
  console.error('BLOCKED: LIVE_MODE must be TESTNET or MAINNET');
  process.exit(1);
}

console.log(`WARNING: Starting LIVE pilot in ${LIVE_MODE} mode`);
console.log('This script is for operator use only and is NOT part of CI gates.');
console.log('');

// Dynamic import of bybit adapter (only when actually running live)
const { createBybitExchange } = await import('../../core/live/exchanges/bybit_rest_testnet.mjs');

const exchange = createBybitExchange({
  mode: LIVE_MODE.toLowerCase(),
  dryRun: process.env.DRY_RUN === '1'
});

// Load strategy
const strategy = (await import('../../core/edge/strategies/s1_breakout_atr.mjs')).default;
const meta = strategy.meta();

console.log(`Strategy: ${meta.name} v${meta.version}`);
console.log(`Exchange mode: ${exchange.mode()}`);
console.log(`Dry run: ${exchange.isDryRun()}`);
console.log('');

// Simple one-shot pilot: get current state and report
try {
  const time = await exchange.getTime();
  const balance = await exchange.getBalance();
  const price = await exchange.getPrice('BTCUSDT');

  const report = [
    '# E109 OPERATOR LIVE PILOT REPORT', '',
    `- mode: ${LIVE_MODE}`,
    `- dry_run: ${exchange.isDryRun()}`,
    `- strategy: ${meta.name}`,
    `- timestamp: ${new Date(time).toISOString()}`,
    '',
    '## Account State',
    `- balance_total: $${stableFormatNumber(balance.total, 2)}`,
    `- balance_available: $${stableFormatNumber(balance.available, 2)}`,
    `- currency: ${balance.currency}`,
    '',
    '## Market State',
    `- BTCUSDT: $${stableFormatNumber(price, 2)}`,
    '',
    '## Notes',
    'This report is for operator reference only.',
    'It is NOT part of CI evidence and should NOT be committed.',
    ''
  ];

  const reportDir = path.resolve('reports/operator');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `e109_live_pilot_${new Date().toISOString().slice(0, 10)}.md`);
  writeMd(reportPath, report.join('\n'));

  console.log(`Balance: $${stableFormatNumber(balance.total, 2)} (available: $${stableFormatNumber(balance.available, 2)})`);
  console.log(`BTCUSDT: $${stableFormatNumber(price, 2)}`);
  console.log(`Report written to: ${reportPath}`);
  console.log('e109_micro_live_pilot_live DONE');
} catch (err) {
  console.error(`Live pilot error: ${err.message}`);
  process.exit(1);
}
