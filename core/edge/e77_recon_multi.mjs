#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DEC = 8;
const HEAD = 'symbol,ts_utc,side,qty,expected_px,filled_px,fee,spread_est,latency_ms,slippage_est,venue,notes';
function round(v, d = DEC) { const f = 10 ** d; return Math.round(v * f) / f; }
function posix(p) { return p.split(path.sep).join('/'); }

export function parseReconMulti(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').trim();
  const [h, ...rows] = raw.split(/\r?\n/);
  if (h !== HEAD) throw new Error('E77_RECON_BAD_HEADER');
  const out = [];
  for (const line of rows) {
    const [symbol, ts_utc, side, qty, expected_px, filled_px, fee, spread_est, latency_ms, slippage_est, venue, notes] = line.split(',');
    const miss = [symbol, ts_utc, side, qty, expected_px, filled_px, fee, spread_est, latency_ms, slippage_est, venue].some((x) => x === undefined || x === '');
    if (miss) throw new Error('MISSING_FIELD');
    const nums = [qty, expected_px, filled_px, fee, spread_est, latency_ms, slippage_est].map(Number);
    if (nums.some((x) => !Number.isFinite(x))) throw new Error('NON_NUMERIC');
    if (nums[0] <= 0 || nums[1] <= 0 || nums[2] <= 0 || nums[5] < 0) throw new Error('OUT_OF_RANGE');
    out.push({
      symbol, ts_utc, side,
      qty: round(Number(qty), 6), expected_px: round(Number(expected_px), 6), filled_px: round(Number(filled_px), 6), fee: round(Number(fee), 6),
      spread_est: round(Number(spread_est), 4), latency_ms: round(Number(latency_ms), 3), slippage_est: round(Number(slippage_est), 4),
      venue, notes: notes || ''
    });
  }
  out.sort((a, b) =>
    a.symbol.localeCompare(b.symbol) || a.ts_utc.localeCompare(b.ts_utc) || a.side.localeCompare(b.side) ||
    a.qty - b.qty || a.expected_px - b.expected_px || a.filled_px - b.filled_px || a.venue.localeCompare(b.venue)
  );
  if (!out.length) throw new Error('INVALID_SAMPLE');
  return out;
}

function p(sorted, q) {
  if (!sorted.length) return 0;
  const i = Math.floor((sorted.length - 1) * q);
  return sorted[i];
}

export function summarizeReconMulti(rows, sourcePath) {
  const windows = ['W1', 'W2', 'W3'];
  const bySymbol = new Map();
  for (const r of rows) {
    const list = bySymbol.get(r.symbol) || [];
    list.push(r);
    bySymbol.set(r.symbol, list);
  }

  const symbolRows = [];
  const windowRows = [];

  for (const [symbol, list] of [...bySymbol.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const fee = list.map((x) => x.fee).sort((a, b) => a - b);
    const spread = list.map((x) => x.spread_est).sort((a, b) => a - b);
    const slip = list.map((x) => x.slippage_est).sort((a, b) => a - b);
    const lat = list.map((x) => x.latency_ms).sort((a, b) => a - b);
    symbolRows.push({
      symbol,
      fee_median: round(p(fee, 0.5), 6),
      spread_median: round(p(spread, 0.5), 4),
      spread_p95: round(p(spread, 0.95), 4),
      slippage_small: round(p(slip, 0.5), 4),
      slippage_medium: round(p(slip, 0.75), 4),
      slippage_large: round(p(slip, 0.95), 4),
      latency_median: round(p(lat, 0.5), 3),
      latency_p95: round(p(lat, 0.95), 3)
    });

    for (const w of windows) {
      const wl = list.filter((x) => x.notes === w);
      if (!wl.length) continue;
      const ws = wl.map((x) => x.slippage_est).sort((a, b) => a - b);
      const wlats = wl.map((x) => x.latency_ms).sort((a, b) => a - b);
      windowRows.push({ symbol, window: w, trades: wl.length, slippage_median: round(p(ws, 0.5), 4), latency_median: round(p(wlats, 0.5), 3) });
    }
  }

  windowRows.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.window.localeCompare(b.window));
  const sha = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
  const normalizedHash = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ sha, normalizedHash, symbolRows, windowRows })).digest('hex');

  return { source_file: posix(path.relative(process.cwd(), sourcePath)), source_sha256: sha, normalized_rows_hash: normalizedHash, fingerprint, symbolRows, windowRows };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const f = path.resolve(process.argv[2] || 'core/edge/fixtures/e77_recon_observed_multi.csv');
  const rows = parseReconMulti(f);
  console.log(JSON.stringify(summarizeReconMulti(rows, f), null, 2));
}
