#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { SNAP_ROOT } from '../verify/e112_lib.mjs';

const workDir = path.join(SNAP_ROOT, '_work');
const rawDir = path.join(workDir, 'raw');
const outDir = path.join(workDir, 'normalized');
fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json')).sort();
if (!files.length) throw new Error('E112_NO_RAW_CAPSULES');

function fmt(n) { return Number(Number(n).toFixed(8)); }
function stableRow(symbol, r) {
  return { symbol, timeframe: '5m', ts: Number(r.ts), o: fmt(r.o), h: fmt(r.h), l: fmt(r.l), c: fmt(r.c), v: fmt(r.v) };
}

for (const f of files) {
  const symbol = path.basename(f, '.json');
  const rows = JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'));
  rows.sort((a, b) => a.ts - b.ts);
  let last = -1;
  const out = [];
  for (const r of rows) {
    if (r.ts === last) continue;
    last = r.ts;
    const x = stableRow(symbol, r);
    out.push(`{"c":${x.c},"h":${x.h},"l":${x.l},"o":${x.o},"symbol":"${x.symbol}","timeframe":"${x.timeframe}","ts":${x.ts},"v":${x.v}}`);
  }
  fs.writeFileSync(path.join(outDir, `${symbol}.jsonl`), `${out.join('\n')}\n`);
}
console.log(`e112_normalize_canonical_jsonl: symbols=${files.length}`);
