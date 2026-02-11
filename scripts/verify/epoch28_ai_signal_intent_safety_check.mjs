#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { aiDecisionsToSignals } from '../../core/ai/ai_signal_bridge.mjs';
import { StrategyAwareExecutor } from '../../core/exec/strategy_aware_executor.mjs';
import { SafetyIntegratedExecutor } from '../../core/exec/safety_integrated_executor.mjs';

const runDir = process.env.TREASURE_RUN_DIR || path.join('reports', 'runs', 'epoch28', String(process.env.SEED || 12345), 'default', 'manual');
fs.mkdirSync(runDir, { recursive: true });

class DryAdapter {
  getName() { return 'Epoch28DryAdapter'; }
  async placeOrder(intent) { return { order_id: `dry_${intent.intent_id}`, status: 'FILLED' }; }
  async pollOrder(order_id) { return { filled: true, pnl_usd: 0, fills: [{ order_id }] }; }
}

const decisions = [
  { agent_id: 'risk_ok', symbol: 'BTCUSDT', score: 0.8, confidence: 0.8, price: 50000, priority: 1 },
  { agent_id: 'risk_block', symbol: 'ETHUSDT', score: 0.7, confidence: 1.0, price: 2500, priority: 1 }
];
const signals = aiDecisionsToSignals(decisions, { seed: Number(process.env.SEED || 12345), baseNotionalUsd: 100 });
const intents = new StrategyAwareExecutor({ seed: Number(process.env.SEED || 12345) }).prepareIntents(signals, { mode: 'DRY_RUN', bar_idx: 10 });

const executor = new SafetyIntegratedExecutor({ adapter: new DryAdapter(), mode: 'DRY_RUN', safetyConfig: { confirmationRequired: false, maxPositionSizeUsd: 1000, maxDailyLossUsd: 100 } });
const resAllow = await executor.execute({ ...intents[0], size_usd: 100 }, { mode: 'DRY_RUN' }, { currentPositionUsd: 0, dailyPnlUsd: 0 });
const resBlock = await executor.execute({ ...intents[1], size_usd: 1500 }, { mode: 'DRY_RUN' }, { currentPositionUsd: 0, dailyPnlUsd: 0 });

let failed = 0;
const assert = (c,m)=>{ if(c) console.log(`✓ ${m}`); else { failed += 1; console.error(`✗ ${m}`);} };
assert(resAllow.success === true && resAllow.blocked === false, 'allowed intent passes through safety+risk to adapter');
assert(resBlock.blocked === true && typeof resBlock.reason === 'string', 'blocked intent is rejected with explicit reason');

fs.writeFileSync(path.join(runDir, 'epoch28_signal_intent_safety.json'), JSON.stringify({ signals, intents, resAllow, resBlock }, null, 2) + '\n');
console.log(`WROTE: ${path.join(runDir, 'epoch28_signal_intent_safety.json')}`);
if (failed > 0) process.exit(1);
