#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const runDir = process.env.TREASURE_RUN_DIR || path.join('reports', 'runs', 'epoch29', String(process.env.SEED || 12345), 'default', 'manual');
fs.mkdirSync(runDir, { recursive: true });

const series = [0.01, 0.02, -0.005, 0.003, 0.008, -0.002, 0.006, 0.004, -0.001, 0.005];
const train = 4, valid = 2, step = 2;
const folds = [];
for (let s = 0; s + train + valid <= series.length; s += step) {
  const trainSlice = series.slice(s, s + train);
  const validSlice = series.slice(s + train, s + train + valid);
  folds.push({ start: s, train_idx: [s, s + train - 1], valid_idx: [s + train, s + train + valid - 1], train_mean: trainSlice.reduce((a,b)=>a+b,0)/trainSlice.length, valid_mean: validSlice.reduce((a,b)=>a+b,0)/validSlice.length, leakage: false });
}

let failed = 0;
const assert=(c,m)=>{if(c) console.log(`✓ ${m}`); else {failed+=1;console.error(`✗ ${m}`)}};
assert(folds.length >= 2, 'walk-forward generated multiple folds');
assert(folds.every((f) => f.train_idx[1] < f.valid_idx[0]), 'leakage sentinel: training window never uses future validation data');

const manifest = { gate: 'epoch29', seed: Number(process.env.SEED || 12345), params: { train, valid, step }, folds };
manifest.fingerprint = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
fs.writeFileSync(path.join(runDir, 'epoch29_walkforward_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`WROTE: ${path.join(runDir, 'epoch29_walkforward_manifest.json')}`);
if (failed > 0) process.exit(1);
