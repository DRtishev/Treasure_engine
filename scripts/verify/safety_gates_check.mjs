#!/usr/bin/env node

import { SafetyGateValidator } from '../../core/exec/safety_gate_validator.mjs';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`✓ ${msg}`);
  } else {
    failed++;
    console.error(`✗ ${msg}`);
  }
}

function baseIntent() {
  return {
    side: 'BUY',
    size: 0.01,
    price: 50000,
    type: 'MARKET',
    size_usd: 500,
  };
}

function testDryRunPass() {
  const v = new SafetyGateValidator({ mode: 'DRY_RUN' });
  const res = v.validate(baseIntent(), { run_id: 'r1' }, { currentPositionUsd: 100, dailyPnlUsd: 0 });
  assert(res.pass === true, 'DRY_RUN valid intent passes');
  assert(res.checks.includes('validateIntent'), 'validateIntent check executed');
  assert(res.checks.includes('checkPositionCap'), 'checkPositionCap executed');
  assert(res.checks.includes('checkDailyLossCap'), 'checkDailyLossCap executed');
}

function testInvalidIntentBlocked() {
  const v = new SafetyGateValidator({ mode: 'DRY_RUN' });
  const intent = baseIntent();
  intent.side = 'HOLD';
  const res = v.validate(intent, {}, {});
  assert(res.pass === false, 'invalid side blocked');
  assert(/Invalid side/.test(res.reason), 'invalid side reason present');
}

function testPositionCapBlocked() {
  const v = new SafetyGateValidator({ mode: 'DRY_RUN', maxPositionSizeUsd: 1000 });
  const intent = baseIntent();
  intent.size_usd = 700;
  const res = v.validate(intent, {}, { currentPositionUsd: 400, dailyPnlUsd: 0 });
  assert(res.pass === false, 'position cap breach blocked');
}

function testDailyLossCapBlocked() {
  const v = new SafetyGateValidator({ mode: 'DRY_RUN', maxDailyLossUsd: 100 });
  const res = v.validate(baseIntent(), {}, { currentPositionUsd: 0, dailyPnlUsd: -150 });
  assert(res.pass === false, 'daily loss cap breach blocked');
}

function testLiveNeedsConfirmation() {
  const v = new SafetyGateValidator({
    mode: 'LIVE_PRODUCTION',
    confirmationRequired: true,
    apiKey: 'A'.repeat(40),
    apiSecret: 'B'.repeat(40),
  });
  const res = v.validate(baseIntent(), { confirmationGiven: false }, { currentPositionUsd: 0, dailyPnlUsd: 0 });
  assert(res.pass === false, 'live mode requires confirmation');
}

function testLiveConfirmationPasses() {
  const events = [];
  const eventLog = { sys: (name, payload) => events.push({ name, payload }) };
  const v = new SafetyGateValidator({
    mode: 'LIVE_PRODUCTION',
    confirmationRequired: true,
    apiKey: 'A'.repeat(40),
    apiSecret: 'B'.repeat(40),
    maxPositionSizeUsd: 1000,
    maxDailyLossUsd: 200,
  });
  const res = v.validate(
    baseIntent(),
    { confirmationGiven: true, run_id: 'r1', hack_id: 'H1', mode: 'live', bar_idx: 1 },
    { currentPositionUsd: 0, dailyPnlUsd: -10 },
    eventLog
  );
  assert(res.pass === true, 'live mode passes with confirmation and env');
  assert(res.checks.includes('validateEnvironment'), 'validateEnvironment check executed');
  assert(res.checks.includes('auditLog'), 'auditLog check executed');
  assert(events.length === 1, 'audit event emitted');
}

function testLiveMissingEnvBlocked() {
  const v = new SafetyGateValidator({ mode: 'LIVE_PRODUCTION', confirmationRequired: false });
  const res = v.validate(baseIntent(), { confirmationGiven: true }, { currentPositionUsd: 0, dailyPnlUsd: 0 });
  assert(res.pass === false, 'live mode missing env blocked');
  assert(/BINANCE_API_KEY/.test(res.reason), 'missing key reason present');
}

function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SAFETY GATE VALIDATOR CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  testDryRunPass();
  testInvalidIntentBlocked();
  testPositionCapBlocked();
  testDailyLossCapBlocked();
  testLiveNeedsConfirmation();
  testLiveConfirmationPasses();
  testLiveMissingEnvBlocked();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main();
