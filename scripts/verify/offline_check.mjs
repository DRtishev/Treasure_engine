#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(cmd, args, env = process.env) {
  return spawnSync(cmd, args, { encoding: 'utf8', env });
}

let failed = 0;
let passed = 0;
const check = (ok, msg, extra = '') => {
  if (ok) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}${extra ? ` (${extra})` : ''}`);
  }
};

const blocked1 = run('node', ['scripts/data/provider_binance_klines.mjs'], { ...process.env, ENABLE_NETWORK: '0', PROVIDER_ALLOWLIST: '' });
check(blocked1.status !== 0, 'provider_binance_klines blocks without flags');

const blocked2 = run('node', ['scripts/data/fetch_private_fills_binance.mjs'], { ...process.env, ENABLE_NETWORK: '0', PROVIDER_ALLOWLIST: '' });
check(blocked2.status !== 0, 'fetch_private_fills_binance blocks without flags');

const blocked3 = run('node', ['scripts/data/fetch_binance_history.mjs', 'BTCUSDT', '1m', '10'], { ...process.env, ENABLE_NETWORK: '0', PROVIDER_ALLOWLIST: '' });
check(blocked3.status !== 0, 'fetch_binance_history blocks without flags');

const treasure = run('npm', ['run', '-s', 'verify:treasure'], { ...process.env, CI: 'true', ENABLE_NETWORK: '0', PROVIDER_ALLOWLIST: '' });
check(treasure.status === 0, 'verify:treasure passes in offline mode');

if (failed > 0) {
  console.error(`verify:offline FAILED passed=${passed} failed=${failed}`);
  process.exit(1);
}
console.log(`verify:offline PASSED checks=${passed}`);
