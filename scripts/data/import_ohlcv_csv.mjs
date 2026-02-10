#!/usr/bin/env node
// scripts/data/import_ohlcv_csv.mjs
// Convert OHLCV CSV to Treasure Engine dataset JSON.
// Expected columns (any case): time/timestamp/date, open, high, low, close, volume

import fs from 'fs';

function die(msg) {
  console.error('[import:csv] ' + msg);
  process.exit(1);
}

function toMs(v) {
  // Accept: unix seconds, unix ms, ISO date string
  const n = Number(v);
  if (Number.isFinite(n)) {
    if (n > 1e12) return Math.trunc(n); // already ms
    if (n > 1e9) return Math.trunc(n * 1000); // seconds
  }
  const d = new Date(String(v));
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  return t;
}

function splitCSVLine(line) {
  // Minimal CSV splitter: handles quotes.
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) die('CSV must have header + at least 1 row');

  const header = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = (nameCandidates) => {
    for (const n of nameCandidates) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const iT = idx(['time', 'timestamp', 'date', 'datetime']);
  const iO = idx(['open', 'o']);
  const iH = idx(['high', 'h']);
  const iL = idx(['low', 'l']);
  const iC = idx(['close', 'c']);
  const iV = idx(['volume', 'v']);

  if (iT === -1 || iO === -1 || iH === -1 || iL === -1 || iC === -1 || iV === -1) {
    die('Missing required columns. Need: time, open, high, low, close, volume');
  }

  const bars = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCSVLine(lines[r]);
    if (cols.length < header.length) continue;

    const t_ms = toMs(cols[iT]);
    const o = Number(cols[iO]);
    const h = Number(cols[iH]);
    const l = Number(cols[iL]);
    const c = Number(cols[iC]);
    const v = Number(cols[iV]);

    if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(v) || t_ms === null) {
      continue;
    }

    bars.push({ t_ms, o, h, l, c, v });
  }

  if (bars.length < 10) die('Parsed too few bars (<10). Check your CSV formatting.');

  // Sort and de-dup by t_ms
  bars.sort((a, b) => a.t_ms - b.t_ms);
  const dedup = [];
  let last = null;
  for (const b of bars) {
    if (last === null || b.t_ms !== last) {
      dedup.push(b);
      last = b.t_ms;
    }
  }

  return dedup;
}

function main() {
  const args = process.argv.slice(2);
  const inPath = args[0];
  const outPath = args[1];
  const symbol = args[2] || 'UNKNOWN';
  const timeframe = args[3] || 'UNKNOWN';

  if (!inPath || !outPath) {
    die('Usage: node scripts/data/import_ohlcv_csv.mjs <input.csv> <output.json> [SYMBOL] [TIMEFRAME]');
  }
  if (!fs.existsSync(inPath)) die('Input not found: ' + inPath);

  const text = fs.readFileSync(inPath, 'utf8');
  const bars = parseCSV(text);

  const dataset = {
    meta: {
      source: 'REAL',
      symbol,
      timeframe,
      disclaimer: 'REAL DATA: Imported from CSV by scripts/data/import_ohlcv_csv.mjs. Validate exchange rules, fees, and latency separately.',
      seed: 0
    },
    bars
  };

  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
  console.log('[import:csv] WROTE:', outPath, 'bars=' + bars.length);
}

main();
