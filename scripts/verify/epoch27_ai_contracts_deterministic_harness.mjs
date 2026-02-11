#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { aiDecisionsToSignals } from '../../core/ai/ai_signal_bridge.mjs';
import { StrategyAwareExecutor } from '../../core/exec/strategy_aware_executor.mjs';

const runDir = process.env.TREASURE_RUN_DIR || path.join('reports', 'runs', 'epoch27', String(process.env.SEED || 12345), 'default', 'manual');
fs.mkdirSync(runDir, { recursive: true });

const fixtures = [
  { agent_id: 'a1', symbol: 'BTCUSDT', score: 0.8, confidence: 0.91, price: 50000, priority: 2 },
  { agent_id: 'a2', symbol: 'ETHUSDT', score: -0.7, confidence: 0.74, price: 3000, priority: 1 },
  { agent_id: 'a3', symbol: 'SOLUSDT', score: 0.4, confidence: 0.62, price: 100, priority: 1 }
];

function fingerprint(v) { return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'); }
function finiteDeep(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(finiteDeep);
  if (typeof v === 'object') return Object.values(v).every(finiteDeep);
  return true;
}

const seeds = [12345, 22222, 54321];
const out = seeds.map((seed) => {
  const signals = aiDecisionsToSignals(fixtures, { seed, baseNotionalUsd: 100 });
  const intents = new StrategyAwareExecutor({ seed }).prepareIntents(signals, { mode: 'DRY_RUN', bar_idx: 7 });
  return { seed, signals, intents, fp: fingerprint({ signals, intents }) };
});

const sameSeedA = aiDecisionsToSignals(fixtures, { seed: 12345, baseNotionalUsd: 100 });
const sameSeedB = aiDecisionsToSignals(fixtures, { seed: 12345, baseNotionalUsd: 100 });

let failed = 0;
const assert = (c,m)=>{ if(c) console.log(`✓ ${m}`); else { failed += 1; console.error(`✗ ${m}`);} };
assert(JSON.stringify(sameSeedA) === JSON.stringify(sameSeedB), 'stable structural output for same seed');
assert(out.every((r) => finiteDeep(r.signals) && finiteDeep(r.intents)), 'no NaN/Infinity in AI contract outputs');
assert(new Set(out.map((x) => x.seed)).size === out.length, 'multi-seed harness executed');

fs.writeFileSync(path.join(runDir, 'epoch27_harness.json'), JSON.stringify({ gate: 'epoch27', runDir, results: out }, null, 2) + '\n');
console.log(`WROTE: ${path.join(runDir, 'epoch27_harness.json')}`);
if (failed > 0) process.exit(1);
