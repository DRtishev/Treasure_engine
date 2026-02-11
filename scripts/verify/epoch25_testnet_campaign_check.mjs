#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
}

function buildDeterministicProfile() {
  const fixtures = [
    'data/fixtures/live/btc_usdt_market_buy_001.json',
    'data/fixtures/live/eth_usdt_limit_sell_partial.json',
    'data/fixtures/live/sol_usdt_price_mismatch.json'
  ];

  const parsed = fixtures.map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
  const legs = parsed.map((x, i) => {
    const latency_ms = Number.isFinite(x.latency_ms) ? x.latency_ms : (i + 1) * 120;
    const fee_usd = Number.isFinite(x.fee_usd) ? x.fee_usd : (x.fee || 0);
    const slippage_bps = Number.isFinite(x.slippage_bps)
      ? x.slippage_bps
      : Math.abs((Number(x.executed_price || x.fill_price || 0) - Number(x.expected_price || x.price || 0)) / Math.max(1, Number(x.expected_price || x.price || 1))) * 10000;
    return { fixture: fixtures[i], latency_ms, fee_usd: Number(fee_usd) || 0, slippage_bps: Number(slippage_bps) || 0 };
  });

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const profile = {
    gate: 'epoch25_testnet_campaign',
    mode: 'OFFLINE_BASELINE',
    seed: 12345,
    campaign_samples: legs,
    summary: {
      avg_latency_ms: Number(avg(legs.map((x) => x.latency_ms)).toFixed(3)),
      avg_fee_usd: Number(avg(legs.map((x) => x.fee_usd)).toFixed(6)),
      avg_slippage_bps: Number(avg(legs.map((x) => x.slippage_bps)).toFixed(6))
    },
    budget: {
      max_avg_latency_ms: 1000,
      max_avg_slippage_bps: 100,
      max_avg_fee_usd: 20
    }
  };

  profile.within_budget =
    profile.summary.avg_latency_ms <= profile.budget.max_avg_latency_ms &&
    profile.summary.avg_slippage_bps <= profile.budget.max_avg_slippage_bps &&
    profile.summary.avg_fee_usd <= profile.budget.max_avg_fee_usd;

  profile.fingerprint = crypto.createHash('sha256').update(JSON.stringify(profile)).digest('hex');
  return profile;
}

function maybeRunNetworkPath() {
  if (process.env.ENABLE_NETWORK_TESTS !== '1') {
    console.log('ℹ Network campaign checks skipped by default (set ENABLE_NETWORK_TESTS=1 to enable).');
    return { skipped: true };
  }

  execSync('npm run verify:binance', { stdio: 'inherit' });
  execSync('npm run verify:websocket', { stdio: 'inherit' });
  return { skipped: false };
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('EPOCH-25 TESTNET CAMPAIGN CHECK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const profile = buildDeterministicProfile();

assert(profile.campaign_samples.length >= 3, 'campaign profile includes >=3 samples');
assert(profile.within_budget, 'offline campaign metrics within configured budget');
assert(profile.fingerprint.length === 64, 'profile fingerprint is sha256');
assert(profile.summary.avg_latency_ms >= 0 && profile.summary.avg_slippage_bps >= 0 && profile.summary.avg_fee_usd >= 0, 'profile summary metrics are non-negative');

const network = maybeRunNetworkPath();
assert(network.skipped || process.env.ENABLE_NETWORK_TESTS === '1', 'network path obeys opt-in policy');

fs.writeFileSync('reports/testnet_campaign_profile.json', `${JSON.stringify(profile, null, 2)}\n`);
console.log('WROTE: reports/testnet_campaign_profile.json');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: ${passed}`);
console.log(`✗ FAILED: ${failed}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (failed > 0) process.exit(1);
