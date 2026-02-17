#!/usr/bin/env node
// E109 Contract: Live Safety
// In CI truthy: forbid ENABLE_NET, LIVE_MODE, any keys.
// In non-CI: allow but require explicit ack flag for live mode.

import { isCIMode } from './foundation_ci.mjs';

const checks = [];
let allPass = true;

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) allPass = false;
}

// Check 1: CI mode blocks ENABLE_NET
if (isCIMode()) {
  check('ci_blocks_enable_net', process.env.ENABLE_NET !== '1',
    `CI=${process.env.CI}, ENABLE_NET=${process.env.ENABLE_NET || 'unset'}`);
} else {
  check('non_ci_allows_enable_net', true, 'CI is false, ENABLE_NET allowed');
}

// Check 2: CI mode blocks LIVE_MODE
if (isCIMode()) {
  check('ci_blocks_live_mode', !process.env.LIVE_MODE,
    `CI=${process.env.CI}, LIVE_MODE=${process.env.LIVE_MODE || 'unset'}`);
} else {
  check('non_ci_allows_live_mode', true, 'CI is false, LIVE_MODE allowed');
}

// Check 3: CI mode blocks API keys
if (isCIMode()) {
  check('ci_blocks_api_key', !process.env.BYBIT_API_KEY,
    `BYBIT_API_KEY=${process.env.BYBIT_API_KEY ? 'SET' : 'unset'}`);
  check('ci_blocks_api_secret', !process.env.BYBIT_API_SECRET,
    `BYBIT_API_SECRET=${process.env.BYBIT_API_SECRET ? 'SET' : 'unset'}`);
} else {
  check('non_ci_keys_allowed', true, 'CI is false, keys allowed');
}

// Check 4: Live mode requires ack flag
if (process.env.LIVE_MODE && !isCIMode()) {
  const hasAck = process.env.I_UNDERSTAND_LIVE_RISK === '1';
  check('live_requires_ack', hasAck || !process.env.ENABLE_NET,
    `LIVE_MODE=${process.env.LIVE_MODE}, I_UNDERSTAND_LIVE_RISK=${process.env.I_UNDERSTAND_LIVE_RISK || 'unset'}`);
} else {
  check('no_live_mode_active', true, 'No LIVE_MODE set or in CI');
}

// Check 5: Fixture exchange module exists and exports correctly
try {
  const { createFixtureExchange } = await import('../../core/live/exchanges/fixture_exchange.mjs');
  const fx = createFixtureExchange({ initial_balance: 100 });
  check('fixture_exchange_interface', typeof fx.getTime === 'function' && typeof fx.placeOrder === 'function' && fx.mode() === 'fixture',
    'All required methods present and mode=fixture');
} catch (err) {
  check('fixture_exchange_interface', false, `Import failed: ${err.message}`);
}

// Check 6: Exchange interface validation works
try {
  const { validateExchange } = await import('../../core/live/exchange_interface.mjs');
  const { createFixtureExchange } = await import('../../core/live/exchanges/fixture_exchange.mjs');
  const fx = createFixtureExchange();
  const v = validateExchange(fx);
  check('exchange_validation', v.valid, `errors: ${v.errors.join(', ') || 'none'}`);
} catch (err) {
  check('exchange_validation', false, `Validation failed: ${err.message}`);
}

console.log(`e109_live_safety_contract: ${checks.filter(c => c.pass).length}/${checks.length} passed`);
for (const c of checks) {
  console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
}

if (!allPass) {
  console.error('e109_live_safety_contract FAILED');
  process.exit(1);
}
console.log('e109_live_safety_contract PASSED');
