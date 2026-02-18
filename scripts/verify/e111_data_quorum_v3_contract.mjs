#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const minBars = Number(process.env.E111_MIN_BARS || 5000);
const minSymbols = Number(process.env.E111_MIN_SYMBOLS || 10);
const maxGapRatio = Number(process.env.E111_MAX_GAP_RATIO || 0.02);
const dir = path.resolve('.cache/e111/normalized');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort() : [];
if (files.length < minSymbols) {
  console.error(`FAIL MULTI_SYMBOL_COVERAGE symbols=${files.length} min=${minSymbols}`);
  process.exit(1);
}

const reasons = [];
for (const f of files) {
  const rows = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  if (rows.length < minBars) reasons.push(`${f}:BARS_LT_MIN`);
  let dup = false; let mono = true; let miss = false; let gaps = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if ([r.o, r.h, r.l, r.c, r.v, r.ts].some(v => v === undefined || Number.isNaN(Number(v)))) miss = true;
    if (i > 0) {
      const d = r.ts - rows[i - 1].ts;
      if (d <= 0) { if (d === 0) dup = true; mono = false; }
      if (d > 300000) gaps++;
    }
  }
  const gapRatio = rows.length > 1 ? gaps / (rows.length - 1) : 1;
  if (dup) reasons.push(`${f}:DUPLICATE_TS`);
  if (!mono) reasons.push(`${f}:NON_MONOTONIC_TS`);
  if (miss) reasons.push(`${f}:MISSING_FIELDS`);
  if (gapRatio > maxGapRatio) reasons.push(`${f}:GAP_RATIO_HIGH`);
}

const pass = reasons.length === 0;
const summary = [
  '# E111 DATA QUORUM V3',
  `- symbols_checked: ${files.length}`,
  `- min_symbols_required: ${minSymbols}`,
  `- min_bars_required: ${minBars}`,
  `- max_gap_ratio: ${maxGapRatio}`,
  `- status: ${pass ? 'PASS' : 'FAIL'}`,
  '',
  '## Reasons',
  ...(reasons.length ? reasons.map(r => `- ${r}`) : ['- NONE'])
].join('\n');
fs.mkdirSync(path.resolve('reports/evidence/E111'), { recursive: true });
fs.writeFileSync(path.resolve('reports/evidence/E111/DATA_QUORUM_V3.md'), summary);
console.log(`e111_data_quorum_v3_contract: ${pass ? 'PASS' : 'FAIL'} (${files.length} symbols)`);
if (!pass) process.exit(1);
