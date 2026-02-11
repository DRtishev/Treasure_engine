#!/usr/bin/env node

import { StrategyOrchestrator } from '../../core/strategy/strategy_orchestrator.mjs';
import { signalToIntent } from '../../core/exec/signal_converter.mjs';
import { PortfolioAllocator } from '../../core/portfolio/portfolio_allocator.mjs';
import { StrategyAwareExecutor } from '../../core/exec/strategy_aware_executor.mjs';

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

function sampleSignals() {
  return [
    { strategy_id: 'S1', symbol: 'BTC/USDT', side: 'BUY', confidence: 0.91, price: 50000, notional_usd: 700, reason: 'trend' },
    { strategy_id: 'S2', symbol: 'ETH/USDT', side: 'SELL', confidence: 0.91, price: 2500, notional_usd: 700, reason: 'mean_revert' },
    { strategy_id: 'S3', symbol: 'SOL/USDT', side: 'BUY', confidence: 0.55, price: 100, notional_usd: 500, reason: 'breakout' },
  ];
}

function testDeterministicRanking() {
  const sigs = sampleSignals();
  const a = new StrategyOrchestrator({ seed: 12345 }).rankSignals(sigs).map((s) => s.strategy_id).join(',');
  const b = new StrategyOrchestrator({ seed: 12345 }).rankSignals(sigs).map((s) => s.strategy_id).join(',');
  const c = new StrategyOrchestrator({ seed: 54321 }).rankSignals(sigs).map((s) => s.strategy_id).join(',');

  assert(a === b, 'same-seed ranking is stable');
  assert(a !== '' && c !== '', 'rankings are produced');
}

function testSignalConversion() {
  const intent = signalToIntent(sampleSignals()[0], { mode: 'DRY_RUN', bar_idx: 7, order_seq: 0 });
  assert(intent.intent_id === 'S1_BTC/USDT_7_0', 'intent_id deterministic format');
  assert(intent.side === 'BUY', 'signal side normalized to BUY/SELL');
  assert(intent.size_usd === 700, 'notional preserved before allocation');
}

function testAllocationCaps() {
  const allocator = new PortfolioAllocator({ totalCapitalUsd: 1000, maxPerIntentUsd: 400, maxPortfolioAllocationPct: 0.6 });
  const allocations = allocator.allocate([
    { intent_id: 'i1', strategy_id: 'S1', size_usd: 700 },
    { intent_id: 'i2', strategy_id: 'S2', size_usd: 700 },
  ]);
  const total = allocations.reduce((acc, x) => acc + x.allocated_notional, 0);

  assert(allocations[0].allocated_notional <= 400, 'per-intent cap enforced');
  assert(total <= 600, 'portfolio cap enforced');
}

function testStrategyAwareExecutor() {
  const exec = new StrategyAwareExecutor({
    seed: 12345,
    allocation: { totalCapitalUsd: 1000, maxPerIntentUsd: 350, maxPortfolioAllocationPct: 0.8 },
  });

  const intents = exec.prepareIntents(sampleSignals(), { mode: 'DRY_RUN', bar_idx: 1 });
  assert(intents.length === 3, 'prepared intents count matches signals');
  assert(intents.every((i) => i.allocation && Number.isFinite(i.size_usd)), 'allocation attached to every intent');
  assert(intents.every((i) => i.mode === 'DRY_RUN'), 'default mode remains DRY_RUN for strategy layer');
}

function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-18 STRATEGY LAYER CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  testDeterministicRanking();
  testSignalConversion();
  testAllocationCaps();
  testStrategyAwareExecutor();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main();
