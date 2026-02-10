#!/usr/bin/env node
// scripts/verify/dataset_check.mjs
// Validates dataset JSON shape and basic sanity (no network).

import fs from 'fs';

function fail(msg) {
  console.error('[dataset:check] ' + msg);
  process.exit(1);
}

function main() {
  const p = process.argv[2] || process.env.DATASET_PATH || 'data/synthetic_1000bars_5m.json';
  if (!fs.existsSync(p)) fail('Dataset not found: ' + p);
  let ds;
  try {
    ds = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail('Invalid JSON: ' + e.message);
  }
  if (!ds || typeof ds !== 'object') fail('Dataset must be an object');
  if (!Array.isArray(ds.bars)) fail('Dataset.bars must be an array');
  if (ds.bars.length < 50) fail('Too few bars: ' + ds.bars.length);

  let bad = 0;
  let missingTime = 0;
  let t0 = null;
  let t1 = null;

  for (let i = 0; i < ds.bars.length; i++) {
    const b = ds.bars[i];
    if (!b || typeof b !== 'object') { bad++; continue; }
    const o = Number(b.o);
    const h = Number(b.h);
    const l = Number(b.l);
    const c = Number(b.c);
    const v = Number(b.v);
    if (![o, h, l, c, v].every(Number.isFinite)) bad++;
    if (h < Math.max(o, c) || l > Math.min(o, c) || h < l) bad++;

    if (b.t_ms === undefined || b.t_ms === null) {
      missingTime++;
    } else {
      const t = Number(b.t_ms);
      if (!Number.isFinite(t)) bad++;
      if (t0 === null || t < t0) t0 = t;
      if (t1 === null || t > t1) t1 = t;
    }
  }

  const meta = ds.meta || {};
  const source = meta.source || (p.includes('synthetic') ? 'SYNTHETIC' : 'REAL');

  console.log('[dataset:check] OK');
  console.log(' path:', p);
  console.log(' source:', source);
  console.log(' bars:', ds.bars.length);
  console.log(' missing t_ms:', missingTime);
  console.log(' suspicious rows:', bad);
  if (t0 !== null && t1 !== null) {
    console.log(' t_ms range:', t0, '→', t1);
  }

  // Hard fails
  if (bad > Math.floor(ds.bars.length * 0.02)) fail('Too many suspicious rows: ' + bad);
}

main();
