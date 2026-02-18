#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeE113 } from './e113_lib.mjs';

const mode = modeE113();
const minBars = Number(process.env.E113_MIN_BARS || 5000);
const minSymbols = Number(process.env.E113_MIN_SYMBOLS || 2);
const maxFreshMs = Number(process.env.E113_FRESHNESS_WINDOW_MS || 86400000);
const t = fs.readFileSync(path.resolve('reports/evidence/E113/REALITY_FUEL.md'), 'utf8');
const rows = [...t.matchAll(/- ([A-Z0-9]+USDT): bars=(\d+), start=(\d+), end=(\d+), monotonic=(yes|no), freshness_delta_ms=(\d+), sha256=([a-f0-9]{64})/g)].map(m => ({ symbol: m[1], bars: Number(m[2]), monotonic: m[5] === 'yes', freshness: Number(m[6]) }));
const reasons = [];
if (rows.length < minSymbols) reasons.push(`SYMBOLS_LT_MIN:${rows.length}`);
for (const r of rows) {
  if (r.bars < minBars) reasons.push(`${r.symbol}:BARS_LT_MIN`);
  if (!r.monotonic) reasons.push(`${r.symbol}:NON_MONOTONIC`);
  if (mode === 'ONLINE_REQUIRED' && r.freshness > maxFreshMs) reasons.push(`${r.symbol}:STALE_STRICT`);
  if (mode === 'ONLINE_OPTIONAL' && r.freshness > maxFreshMs) reasons.push(`${r.symbol}:STALE_WARN`);
}
const hard = reasons.filter(x => !x.endsWith('STALE_WARN'));
if (hard.length) throw new Error(`E113_FRESHNESS_FAIL:${hard.join(',')}`);
console.log(`e113_snapshot_freshness_contract: PASS rows=${rows.length} warnings=${reasons.filter(x=>x.endsWith('STALE_WARN')).length}`);
