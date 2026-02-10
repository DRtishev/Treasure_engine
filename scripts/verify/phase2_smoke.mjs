#!/usr/bin/env node
// scripts/verify/phase2_smoke.mjs
// Smoke tests для Phase 2 компонентов: QualityFilter, ExecutionPolicy, RiskGovernor

import * as qualityFilter from '../../core/quality/quality_filter.mjs';
import * as executionPolicy from '../../core/exec/execution_policy.mjs';
import * as riskGovernor from '../../core/risk/risk_governor.mjs';
import { readFileSync } from 'fs';

const SSOT = JSON.parse(readFileSync('spec/ssot.json', 'utf8'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('=== PHASE 2 SMOKE TESTS ===\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUALITY FILTER TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('🔍 Quality Filter Tests');

test('QualityFilter: High quality bar passes', () => {
  const bar = {
    atr_pct: 0.015,
    volume_usd: 500000,
    spread_bps: 10,
    volatility: 0.015
  };
  const signal = { side: 'long' };
  const result = qualityFilter.evaluate(signal, bar, SSOT);
  assert(result.pass === true, 'Should pass high quality bar');
  assert(result.score > 0.6, 'Score should be > 0.6');
});

test('QualityFilter: Low quality bar fails', () => {
  const bar = {
    atr_pct: 0.0001,
    volume_usd: 10000,
    spread_bps: 100,
    volatility: 0.001
  };
  const signal = { side: 'long' };
  const result = qualityFilter.evaluate(signal, bar, SSOT);
  assert(result.pass === false, 'Should fail low quality bar');
});

test('QualityFilter: Wide spread fails', () => {
  const bar = {
    atr_pct: 0.015,
    volume_usd: 500000,
    spread_bps: 150, // Above max_spread_bps=100
    volatility: 0.015
  };
  const signal = { side: 'long' };
  const result = qualityFilter.evaluate(signal, bar, SSOT);
  assert(result.pass === false, 'Should fail on wide spread');
  assert(result.reason.includes('Spread too wide'), 'Should mention wide spread');
});

test('QualityFilter: Low volume fails', () => {
  const bar = {
    atr_pct: 0.015,
    volume_usd: 5000, // Below min_volume_usd=10000
    spread_bps: 10,
    volatility: 0.015
  };
  const signal = { side: 'long' };
  const result = qualityFilter.evaluate(signal, bar, SSOT);
  assert(result.pass === false, 'Should fail on low volume');
  assert(result.reason.includes('Volume too low'), 'Should mention low volume');
});

test('QualityFilter: aggregateStats works', () => {
  const checks = [
    { pass: true, score: 0.8 },
    { pass: false, score: 0.4 },
    { pass: true, score: 0.7 }
  ];
  const stats = qualityFilter.aggregateStats(checks);
  assert(stats.total === 3, 'Total should be 3');
  assert(stats.passed === 2, 'Passed should be 2');
  assert(stats.filtered === 1, 'Filtered should be 1');
  assert(stats.pass_rate === 2/3, 'Pass rate should be 2/3');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTION POLICY TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n⚡ Execution Policy Tests');

test('ExecutionPolicy: High competition → shorter TTL, higher tip', () => {
  const bar = {
    volatility: 0.03,
    volume_usd: 200000,
    spread_bps: 25
  };
  const signal = { side: 'long' };
  const params = executionPolicy.compute(signal, bar, SSOT);
  
  assert(params.competition_score > 0.6, 'Competition should be high');
  assert(params.ttl_ms < SSOT.execution_policy.default_ttl_ms, 'TTL should be shorter');
  assert(params.tip_bps > 2, 'Tip should be higher');
});

test('ExecutionPolicy: Low competition → longer TTL, lower tip', () => {
  const bar = {
    volatility: 0.005,
    volume_usd: 5000000,
    spread_bps: 5
  };
  const signal = { side: 'long' };
  const params = executionPolicy.compute(signal, bar, SSOT);
  
  assert(params.competition_score < 0.4, 'Competition should be low');
  assert(params.ttl_ms >= SSOT.execution_policy.default_ttl_ms, 'TTL should be longer or equal');
  assert(params.tip_bps < 3, 'Tip should be lower');
});

test('ExecutionPolicy: validate() rejects invalid params', () => {
  const invalidParams = {
    ttl_ms: 50000, // exceeds max
    tip_bps: 10, // exceeds max
    competition_score: 0.5
  };
  const result = executionPolicy.validate(invalidParams, SSOT);
  assert(result.valid === false, 'Should reject invalid params');
});

test('ExecutionPolicy: validate() accepts valid params', () => {
  const validParams = {
    ttl_ms: 5000,
    tip_bps: 2.5,
    competition_score: 0.75
  };
  const result = executionPolicy.validate(validParams, SSOT);
  assert(result.valid === true, 'Should accept valid params');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RISK GOVERNOR TESTS (CRITICAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n🛡️  Risk Governor Tests (CRITICAL)');

test('RiskGovernor: Blocks oversized position', () => {
  const state = new riskGovernor.RiskGovernorState(SSOT.risk_governor);
  state.updateEquity(10000);
  
  const signal = { size_usd: 2000 }; // exceeds 1000 cap
  const result = riskGovernor.preCheck(signal, state, SSOT);
  
  assert(result.pass === false, 'Should block oversized position');
  assert(result.reason.includes('Position size'), 'Should mention position size');
});

test('RiskGovernor: Blocks when daily loss cap exceeded', () => {
  const state = new riskGovernor.RiskGovernorState(SSOT.risk_governor);
  state.updateEquity(10000);
  state.daily_pnl = -150; // exceeds -100 cap
  
  const signal = { size_usd: 500 };
  const result = riskGovernor.preCheck(signal, state, SSOT);
  
  assert(result.pass === false, 'Should block when daily loss cap exceeded');
  assert(result.reason.includes('Daily loss'), 'Should mention daily loss');
});

test('RiskGovernor: Blocks when drawdown cap exceeded', () => {
  const state = new riskGovernor.RiskGovernorState(SSOT.risk_governor);
  state.peak_equity = 10000;
  state.updateEquity(9400); // 6% drawdown, exceeds 5% cap
  
  const signal = { size_usd: 500 };
  const result = riskGovernor.preCheck(signal, state, SSOT);
  
  assert(result.pass === false, 'Should block when drawdown cap exceeded');
  assert(result.reason.includes('Drawdown'), 'Should mention drawdown');
});

test('RiskGovernor: KILL SWITCH activates at threshold', () => {
  const state = new riskGovernor.RiskGovernorState(SSOT.risk_governor);
  state.peak_equity = 10000;
  state.updateEquity(8900); // 11% drawdown, exceeds 10% kill switch
  
  const signal = { size_usd: 500 };
  const result = riskGovernor.preCheck(signal, state, SSOT);
  
  assert(result.pass === false, 'Should block at kill switch threshold');
  assert(state.kill_switch_active === true, 'Kill switch should be active');
  assert(result.reason.includes('KILL SWITCH') || result.reason.includes('kill switch'), 'Should mention kill switch');
});

test('RiskGovernor: Passes valid trade', () => {
  const state = new riskGovernor.RiskGovernorState(SSOT.risk_governor);
  state.updateEquity(10000);
  
  const signal = { size_usd: 500 };
  const result = riskGovernor.preCheck(signal, state, SSOT);
  
  assert(result.pass === true, 'Should pass valid trade');
  assert(result.caps.remaining_daily_loss_budget > 0, 'Should have remaining budget');
});

test('RiskGovernor: update() tracks equity and drawdown', () => {
  const state = new riskGovernor.RiskGovernorState(SSOT.risk_governor);
  state.updateEquity(10000);
  
  const trade = { pnl: -50 };
  const result = riskGovernor.update(trade, state, SSOT);
  
  assert(result.updated === true, 'Should update successfully');
  assert(state.daily_pnl === -50, 'Daily PnL should be -50');
  assert(state.current_equity === 9950, 'Equity should be 9950');
});

test('RiskGovernor: FAIL-SAFE blocks on invalid state', () => {
  const signal = { size_usd: 500 };
  const result = riskGovernor.preCheck(signal, null, SSOT);
  
  assert(result.pass === false, 'Should fail-safe block on null state');
  assert(result.reason.includes('FAIL-SAFE'), 'Should mention fail-safe');
});

test('RiskGovernor: getDashboard() returns metrics', () => {
  const state = new riskGovernor.RiskGovernorState(SSOT.risk_governor);
  state.updateEquity(10000);
  state.daily_pnl = -30;
  
  const dashboard = riskGovernor.getDashboard(state, SSOT);
  
  assert(dashboard.status === 'ACTIVE', 'Status should be ACTIVE');
  assert(dashboard.current_equity === 10000, 'Current equity should be 10000');
  assert(dashboard.daily_pnl === -30, 'Daily PnL should be -30');
  assert(dashboard.caps.max_position_size_usd === 1000, 'Max position should be 1000');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n' + '='.repeat(60));
console.log(`✅ PASSED: ${passed}`);
console.log(`❌ FAILED: ${failed}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n❌ PHASE 2 SMOKE TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n✅ PHASE 2 SMOKE TESTS PASSED');
  process.exit(0);
}
