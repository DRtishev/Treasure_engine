#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256Text } from '../verify/e66_lib.mjs';

const rawDir = path.resolve('.cache/e111/raw');
const outDir = path.resolve('.cache/e111/normalized');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(rawDir).filter(f => f.endsWith('_raw.json')).sort();
if (!files.length) throw new Error('no raw capsule files');

const manifest = [];
for (const f of files) {
  const symbol = f.split('_')[0];
  const bars = JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'));
  bars.sort((a, b) => a.ts - b.ts);
  const rows = [];
  let last = -1;
  for (const b of bars) {
    if (b.ts === last) continue;
    last = b.ts;
    const row = {
      symbol,
      timeframe: '5m',
      ts: Number(b.ts),
      o: Number(Number(b.o).toFixed(8)),
      h: Number(Number(b.h).toFixed(8)),
      l: Number(Number(b.l).toFixed(8)),
      c: Number(Number(b.c).toFixed(8)),
      v: Number(Number(b.v).toFixed(8))
    };
    rows.push(row);
  }
  const jsonl = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, `${symbol}_5m.jsonl`), jsonl);
  manifest.push({ symbol, bars: rows.length, sha256: sha256Text(jsonl) });
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`e111_normalize_capsules: ${manifest.length} symbols`);
