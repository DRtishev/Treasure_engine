#!/usr/bin/env node
import { aiDecisionsToSignals } from '../../core/ai/ai_signal_bridge.mjs';
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

const decisions = [
  { agent_id: 'alpha', model_id: 'm1', symbol: 'BTCUSDT', score: 0.9, confidence: 0.8, price: 50000, priority: 1 },
  { agent_id: 'beta', model_id: 'm1', symbol: 'ETHUSDT', score: -0.6, confidence: 0.8, price: 3000, priority: 1 },
  { agent_id: 'gamma', model_id: 'm2', symbol: 'SOLUSDT', score: 0.0, confidence: 0.95, price: 100, priority: 2 },
  { agent_id: 'delta', model_id: 'm2', symbol: 'BNBUSDT', score: 0.4, confidence: 0.5, price: 400, priority: 0 }
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('EPOCH-23 SIGNAL->INTENT CONTRACT CHECK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const s1 = aiDecisionsToSignals(decisions, { seed: 12345, baseNotionalUsd: 120 });
const s2 = aiDecisionsToSignals(decisions, { seed: 12345, baseNotionalUsd: 120 });
const s3 = aiDecisionsToSignals(decisions, { seed: 54321, baseNotionalUsd: 120 });

assert(JSON.stringify(s1) === JSON.stringify(s2), 'same seed yields identical AI->signal output');
assert(s1.length === 3, 'HOLD/zero-score decisions are skipped');
assert(s1.every((s) => ['BUY', 'SELL'].includes(s.side)), 'signal sides are normalized BUY/SELL');
assert(s1.every((s) => Number.isFinite(s.notional_usd) && s.notional_usd > 0), 'notional_usd is finite and positive');
assert(s3.length === s1.length, 'cross-seed output preserves structural signal count');

const executor = new StrategyAwareExecutor({ seed: 12345 });
const intents1 = executor.prepareIntents(s1, { mode: 'DRY_RUN', bar_idx: 42 });
const intents2 = executor.prepareIntents(s2, { mode: 'DRY_RUN', bar_idx: 42 });

assert(JSON.stringify(intents1) === JSON.stringify(intents2), 'signal->intent conversion is deterministic');
assert(intents1.length === s1.length, 'intent count equals signal count');
assert(intents1.every((i) => i.intent_id && i.strategy_id?.startsWith('ai_')), 'intent contract contains deterministic ids and ai strategy ids');
assert(intents1.every((i) => Number.isFinite(i.size_usd) && Number.isFinite(i.size)), 'intent sizing fields are finite');
assert(intents1.every((i) => i.mode === 'DRY_RUN'), 'mode remains DRY_RUN by default in epoch23 contract');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: ${passed}`);
console.log(`✗ FAILED: ${failed}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (failed > 0) process.exit(1);
