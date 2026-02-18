#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256Text } from '../verify/e66_lib.mjs';
import { E112_ROOT, SNAP_ROOT, modeState, assertNetGuard, writeMdAtomic } from '../verify/e112_lib.mjs';

const mode = modeState();
const tf = process.env.E112_TIMEFRAME || '5m';
const minBars = Number(process.env.E112_MIN_BARS || 5000);
const symbols = String(process.env.E112_SYMBOLS || 'BTCUSDT,ETHUSDT,SOLUSDT').split(',').map(s => s.trim()).filter(Boolean);
const workDir = path.join(SNAP_ROOT, '_work');
fs.mkdirSync(workDir, { recursive: true });
const rawDir = path.join(workDir, 'raw');
fs.mkdirSync(rawDir, { recursive: true });

const fixture = JSON.parse(fs.readFileSync(path.resolve('dataset/BTCUSDT_5m_100bars.json'), 'utf8')).bars;
function fallbackSeries(ix) {
  const rows = [];
  const start = 1700000000000;
  for (let i = 0; i < minBars; i++) {
    const s = fixture[i % fixture.length];
    const drift = 1 + ix * 0.001 + Math.floor(i / fixture.length) * 0.00002;
    rows.push({ ts: start + i * 300000, o: s.o * drift, h: s.h * drift, l: s.l * drift, c: s.c * drift, v: s.v });
  }
  return rows;
}

async function fetchSymbol(symbol) {
  let end = Date.now();
  const all = [];
  for (let i = 0; i < 25 && all.length < minBars; i++) {
    const u = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=1000&end=${end}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    const j = await r.json();
    const list = j?.result?.list || [];
    if (!list.length) break;
    for (const row of list) all.push({ ts: Number(row[0]), o: Number(row[1]), h: Number(row[2]), l: Number(row[3]), c: Number(row[4]), v: Number(row[5]) });
    end = Number(list[list.length - 1][0]) - 1;
  }
  all.sort((a, b) => a.ts - b.ts);
  const out = [];
  let last = -1;
  for (const r of all) { if (r.ts !== last) out.push(r); last = r.ts; }
  return out;
}

function latestPinnedStamp() {
  if (!fs.existsSync(SNAP_ROOT)) return null;
  const stamps = fs.readdirSync(SNAP_ROOT).filter(s => /^E112_\d+$/.test(s)).sort();
  return stamps.length ? stamps[stamps.length - 1] : null;
}

let usedFallback = false;
const reasons = [];
for (let i = 0; i < symbols.length; i++) {
  const symbol = symbols[i];
  let bars = [];
  if (mode === 'OFFLINE_ONLY') {
    const stamp = latestPinnedStamp();
    if (!stamp) throw new Error('E112_OFFLINE_NO_PINNED_SNAPSHOT');
    const src = path.join(SNAP_ROOT, stamp, 'raw', `${symbol}.json`);
    if (!fs.existsSync(src)) throw new Error(`E112_OFFLINE_MISSING_SYMBOL:${symbol}`);
    bars = JSON.parse(fs.readFileSync(src, 'utf8'));
    reasons.push(`${symbol}:PINNED`);
  } else {
    assertNetGuard();
    try {
      bars = await fetchSymbol(symbol);
      if (bars.length < minBars) throw new Error('BARS_LT_MIN');
      reasons.push(`${symbol}:LIVE_OK`);
    } catch (e) {
      if (mode === 'ONLINE_REQUIRED') throw new Error(`E112_ONLINE_REQUIRED_FETCH_FAIL:${symbol}:${e.message}`);
      bars = fallbackSeries(i);
      usedFallback = true;
      reasons.push(`${symbol}:FALLBACK_${String(e.message || e)}`);
    }
  }
  if (bars.length < minBars) throw new Error(`E112_SYMBOL_QUORUM_FAIL:${symbol}:bars=${bars.length}`);
  fs.writeFileSync(path.join(rawDir, `${symbol}.json`), JSON.stringify(bars));
}

const verdict = mode === 'ONLINE_OPTIONAL' && usedFallback ? 'WARN' : 'PASS';
const lines = ['# E112 REALITY FUEL', `- mode: ${mode}`, `- verdict: ${verdict}`, `- symbols: ${symbols.join(',')}`, `- timeframe: ${tf}`, `- min_bars: ${minBars}`, `- fallback_used: ${usedFallback ? 'yes' : 'no'}`, '## Symbol Status'];
for (const symbol of symbols) {
  const bars = JSON.parse(fs.readFileSync(path.join(rawDir, `${symbol}.json`), 'utf8'));
  const jsonl = bars.map(b => JSON.stringify(b)).join('\n') + '\n';
  lines.push(`- ${symbol}: bars=${bars.length}, start=${bars[0].ts}, end=${bars[bars.length - 1].ts}, sha256=${sha256Text(jsonl)}`);
}
lines.push('## Reasons');
for (const r of reasons) lines.push(`- ${r}`);
writeMdAtomic(path.join(E112_ROOT, 'REALITY_FUEL.md'), lines.join('\n'));
console.log(`e112_fetch_capsules: mode=${mode} verdict=${verdict}`);
