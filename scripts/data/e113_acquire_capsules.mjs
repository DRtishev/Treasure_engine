#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256Text } from '../verify/e66_lib.mjs';
import { E113_ROOT, getRunDir, getCapsulePinDir, modeE113, assertNetGate, latestPinnedDir, atomicWrite, writeMdAtomic } from '../verify/e113_lib.mjs';

const mode = modeE113();
const symbols = String(process.env.E113_SYMBOLS || 'BTCUSDT,ETHUSDT').split(',').map(s => s.trim()).filter(Boolean);
const minBars = Number(process.env.E113_MIN_BARS || 5000);
const nowMs = Date.now();
const runDir = getRunDir();
fs.mkdirSync(runDir, { recursive: true });
const workRaw = path.join(runDir, 'raw');
const workNorm = path.join(runDir, 'normalized');
fs.mkdirSync(workRaw, { recursive: true });
fs.mkdirSync(workNorm, { recursive: true });

const netProof = fs.existsSync(path.join(E113_ROOT, 'NET_PROOF.md')) ? fs.readFileSync(path.join(E113_ROOT, 'NET_PROOF.md'), 'utf8') : '';
const providerRows = [...netProof.matchAll(/- (\w+): success=(\d+)\/(\d+)/g)].map(m => ({ provider: m[1], success: Number(m[2]) }));
const chosen = providerRows.find(p => p.success > 0)?.provider || 'none';


function bootstrapSeed(symbol, ix) {
  const base = JSON.parse(fs.readFileSync(path.resolve('dataset/BTCUSDT_5m_100bars.json'), 'utf8')).bars;
  const out = [];
  const start = 1700000000000;
  for (let i = 0; i < minBars; i++) {
    const b = base[i % base.length];
    const drift = 1 + ix * 0.001 + Math.floor(i / base.length) * 0.00002;
    out.push({ ts: start + i * 300000, o: b.o * drift, h: b.h * drift, l: b.l * drift, c: b.c * drift, v: b.v });
  }
  return out;
}

async function fetchBybit(symbol) {
  let end = Date.now();
  const out = [];
  for (let i = 0; i < 20 && out.length < minBars; i++) {
    const u = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=1000&end=${end}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    const j = await r.json();
    const list = j?.result?.list || [];
    if (!list.length) break;
    for (const x of list) out.push({ ts: Number(x[0]), o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]), v: Number(x[5]) });
    end = Number(list[list.length - 1][0]) - 1;
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

function loadFromPinned(pinnedDir, symbol) {
  const p1 = path.join(pinnedDir, 'raw', `${symbol}.json`);
  if (fs.existsSync(p1)) return JSON.parse(fs.readFileSync(p1, 'utf8'));
  const p2 = path.join(pinnedDir, 'raw', `${symbol}_5m_raw.json`);
  if (fs.existsSync(p2)) return JSON.parse(fs.readFileSync(p2, 'utf8'));
  throw new Error(`E113_PIN_MISSING_SYMBOL:${symbol}`);
}

const freshnessWindowMs = Number(process.env.E113_FRESHNESS_WINDOW_MS || 86400000);
let fallbackUsed = false;
let source = chosen;
const reasons = [];
for (const symbol of symbols) {
  let bars = [];
  if (mode === 'OFFLINE_ONLY') {
    const pin = latestPinnedDir();
    if (!pin) throw new Error('E113_OFFLINE_NO_PINNED');
    bars = loadFromPinned(pin, symbol);
    source = `pinned:${path.basename(pin)}`;
    reasons.push(`${symbol}:OFFLINE_PINNED`);
  } else if (chosen !== 'none') {
    assertNetGate();
    try {
      if (chosen === 'bybit') bars = await fetchBybit(symbol);
      else throw new Error('UNSUPPORTED_PROVIDER_FETCH');
      reasons.push(`${symbol}:LIVE_${chosen.toUpperCase()}`);
    } catch (e) {
      if (mode === 'ONLINE_REQUIRED') throw new Error(`E113_ONLINE_REQUIRED_FETCH_FAIL:${symbol}:${e.message}`);
      const pin = latestPinnedDir();
      if (!pin) throw new Error(`E113_OPTIONAL_NO_PIN_FALLBACK:${symbol}`);
      bars = loadFromPinned(pin, symbol);
      source = `pinned:${path.basename(pin)}`;
      fallbackUsed = true;
      reasons.push(`${symbol}:PINNED_FALLBACK_${String(e.message || e)}`);
    }
  } else {
    if (mode === 'ONLINE_REQUIRED') throw new Error('E113_ONLINE_REQUIRED_NO_PROVIDER');
    const pin = latestPinnedDir();
    if (!pin) {
      bars = bootstrapSeed(symbol, symbols.indexOf(symbol));
      source = 'bootstrap_seed_fixture';
      fallbackUsed = true;
      reasons.push(`${symbol}:BOOTSTRAP_SEED_NO_PROVIDER`);
    } else {
      bars = loadFromPinned(pin, symbol);
      source = `pinned:${path.basename(pin)}`;
      fallbackUsed = true;
      reasons.push(`${symbol}:PINNED_FALLBACK_NO_PROVIDER`);
    }
  }

  bars.sort((a, b) => Number(a.ts) - Number(b.ts));
  const dedup = [];
  let last = -1;
  for (const b of bars) {
    const ts = Number(b.ts);
    if (ts === last) continue;
    last = ts;
    dedup.push({ ts, o: Number(b.o), h: Number(b.h), l: Number(b.l), c: Number(b.c), v: Number(b.v) });
  }
  if (dedup.length < minBars) throw new Error(`E113_MIN_BARS_FAIL:${symbol}:${dedup.length}`);
  atomicWrite(path.join(workRaw, `${symbol}.json`), JSON.stringify(dedup));
  const lines = dedup.map(r => `{"c":${Number(r.c.toFixed(8))},"h":${Number(r.h.toFixed(8))},"l":${Number(r.l.toFixed(8))},"o":${Number(r.o.toFixed(8))},"symbol":"${symbol}","timeframe":"5m","ts":${r.ts},"v":${Number(r.v.toFixed(8))}}`);
  atomicWrite(path.join(workNorm, `${symbol}.jsonl`), `${lines.join('\n')}\n`);
}

const pinDir = getCapsulePinDir();
fs.mkdirSync(path.join(pinDir, 'raw'), { recursive: true });
fs.mkdirSync(path.join(pinDir, 'normalized'), { recursive: true });
for (const symbol of symbols) {
  atomicWrite(path.join(pinDir, 'raw', `${symbol}.json`), fs.readFileSync(path.join(workRaw, `${symbol}.json`), 'utf8'));
  atomicWrite(path.join(pinDir, 'normalized', `${symbol}.jsonl`), fs.readFileSync(path.join(workNorm, `${symbol}.jsonl`), 'utf8'));
}

const rows = [];
for (const symbol of symbols) {
  const norm = fs.readFileSync(path.join(pinDir, 'normalized', `${symbol}.jsonl`), 'utf8');
  const arr = norm.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const freshDeltaMs = nowMs - arr[arr.length - 1].ts;
  const mono = arr.every((r, i) => i === 0 || r.ts > arr[i - 1].ts);
  rows.push({ symbol, bars: arr.length, start: arr[0].ts, end: arr[arr.length - 1].ts, freshDeltaMs, monotonic: mono, sha256: sha256Text(norm) });
}

const verdict = mode === 'ONLINE_OPTIONAL' && (fallbackUsed || chosen === 'none') ? 'WARN' : 'PASS';
writeMdAtomic(path.join(E113_ROOT, 'REALITY_FUEL.md'), [
  '# E113 REALITY FUEL',
  `- mode: ${mode}`,
  `- provider_chosen: ${source}`,
  `- fallback_used: ${fallbackUsed ? 'yes' : 'no'}`,
  `- verdict: ${verdict}`,
  `- freshness_window_ms: ${freshnessWindowMs}`,
  '## Symbols',
  ...rows.map(r => `- ${r.symbol}: bars=${r.bars}, start=${r.start}, end=${r.end}, monotonic=${r.monotonic ? 'yes' : 'no'}, freshness_delta_ms=${r.freshDeltaMs}, sha256=${r.sha256}`),
  '## Reasons',
  ...reasons.map(r => `- ${r}`)
].join('\n'));
writeMdAtomic(path.join(E113_ROOT, 'CAPSULE_MANIFEST.md'), [
  '# E113 CAPSULE MANIFEST',
  `- mode: ${mode}`,
  `- run_dir: <REPO_ROOT>/${path.relative(process.cwd(), runDir).replace(/\\/g, '/')}`,
  `- pin_dir: <REPO_ROOT>/${path.relative(process.cwd(), pinDir).replace(/\\/g, '/')}`,
  `- provider_chosen: ${source}`,
  '## Hashes',
  ...rows.map(r => `- ${r.symbol}: bars=${r.bars}, norm_sha256=${r.sha256}`)
].join('\n'));
console.log(`e113_acquire_capsules: ${verdict} source=${source}`);
