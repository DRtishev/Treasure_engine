#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { SNAP_ROOT, writeMdAtomic } from '../verify/e112_lib.mjs';

const minBars = Number(process.env.E112_MIN_BARS || 5000);
const minSymbols = Number(process.env.E112_MIN_SYMBOLS || 2);
const maxGapRatio = Number(process.env.E112_MAX_GAP_RATIO || 0.02);
const dir = path.join(SNAP_ROOT, '_work', 'normalized');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort() : [];
const reasons = [];
if (files.length < minSymbols) reasons.push(`MULTI_SYMBOL_LT_MIN:${files.length}<${minSymbols}`);
for (const f of files) {
  const rows = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(x => JSON.parse(x));
  if (rows.length < minBars) reasons.push(`${f}:BARS_LT_MIN`);
  let dups = 0, nonMono = 0, missing = 0, gaps = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if ([r.ts, r.o, r.h, r.l, r.c, r.v].some(v => v === undefined || Number.isNaN(Number(v)))) missing++;
    if (i > 0) {
      const d = r.ts - rows[i - 1].ts;
      if (d === 0) dups++;
      if (d <= 0) nonMono++;
      if (d > 300000) gaps++;
    }
  }
  const ratio = rows.length > 1 ? gaps / (rows.length - 1) : 1;
  if (dups) reasons.push(`${f}:DUP_TS:${dups}`);
  if (nonMono) reasons.push(`${f}:NON_MONO:${nonMono}`);
  if (missing) reasons.push(`${f}:MISS_FIELDS:${missing}`);
  if (ratio > maxGapRatio) reasons.push(`${f}:GAP_RATIO:${ratio.toFixed(6)}`);
}
const pass = reasons.length === 0;
writeMdAtomic(path.resolve('reports/evidence/E112/DATA_QUORUM_V4.md'), [
  '# E112 DATA QUORUM V4',
  `- symbols_checked: ${files.length}`,
  `- min_symbols_required: ${minSymbols}`,
  `- min_bars_required: ${minBars}`,
  `- max_gap_ratio: ${maxGapRatio}`,
  `- status: ${pass ? 'PASS' : 'FAIL'}`,
  '## Reasons',
  ...(reasons.length ? reasons.map(r => `- ${r}`) : ['- NONE'])
].join('\n'));
if (!pass) throw new Error('E112_DATA_QUORUM_V4_FAIL');
console.log(`e112_data_quorum_v4: PASS symbols=${files.length}`);
