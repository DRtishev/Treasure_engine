#!/usr/bin/env node
// core/sim/bar_generator.mjs
import fs from 'fs';
import { SeededRNG } from './rng.mjs';

const SEED = 12345;
const NUM_BARS = 1000;
const rng = new SeededRNG(SEED);

const regimes = ['trend', 'range', 'turbulent'];
const bars = [];
let price = 100;

for (let i = 0; i < NUM_BARS; i++) {
  const regime = rng.choice(regimes);
  const drift = regime === 'trend' ? rng.uniform(-0.5, 0.5) : rng.uniform(-0.1, 0.1);
  const vol = regime === 'turbulent' ? 2 : 0.5;
  
  const o = price;
  const c = o + rng.normal(drift, vol);
  const h = Math.max(o, c) + Math.abs(rng.normal(0, vol * 0.3));
  const l = Math.min(o, c) - Math.abs(rng.normal(0, vol * 0.3));
  const v = Math.max(100, rng.normal(1000, 300));
  
  bars.push({ o, h, l, c, v, regime });
  price = c;
}

const dataset = {
  meta: {
    source: 'SYNTHETIC',
    seed: SEED,
    bars_count: NUM_BARS,
    disclaimer: 'SYNTHETIC DATA ONLY - NOT REAL MARKET'
  },
  bars
};

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/synthetic_1000bars_5m.json', JSON.stringify(dataset, null, 2));
console.log('[bar_generator] Generated data/synthetic_1000bars_5m.json');
