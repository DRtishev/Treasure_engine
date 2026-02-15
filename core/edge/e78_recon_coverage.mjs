#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HEADER = 'symbol,ts_utc,side,qty,expected_px,filled_px,fee,spread_est,latency_ms,slippage_est,venue,notes';
const ALLOWED_SIDE = new Set(['BUY', 'SELL']);
const DEC = 8;
const r = (v, d = DEC) => { const f = 10 ** d; return Math.round(v * f) / f; };

function reasoned(row) {
  const cols = row.split(',');
  if (cols.length < 12) return { ok: false, reason: 'MISSING_FIELD' };
  const [symbol, ts, side, qty, expected, filled, fee, spread, latency, slip, venue, notes] = cols;
  if (![symbol, ts, side, qty, expected, filled, fee, spread, latency, slip, venue].every((x) => x !== '')) return { ok: false, reason: 'MISSING_FIELD' };
  if (!ALLOWED_SIDE.has(side)) return { ok: false, reason: 'INVALID_ENUM' };
  if (Number.isNaN(Date.parse(ts))) return { ok: false, reason: 'BAD_TIMESTAMP' };
  const nums = [qty, expected, filled, fee, spread, latency, slip].map(Number);
  if (nums.some((x) => !Number.isFinite(x))) return { ok: false, reason: 'INVALID_NUMERIC' };
  if (nums[0] <= 0 || nums[1] <= 0 || nums[2] <= 0 || nums[5] < 0) return { ok: false, reason: 'INVALID_RANGE' };
  return { ok: true, row: { symbol, ts_utc: ts, side, qty: r(Number(qty), 6), expected_px: r(Number(expected), 6), filled_px: r(Number(filled), 6), fee: r(Number(fee), 6), spread_est: r(Number(spread), 4), latency_ms: r(Number(latency), 3), slippage_est: r(Number(slip), 4), venue, notes } };
}

export function ingestE78Recon(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').trim();
  const [head, ...rows] = raw.split(/\r?\n/);
  if (head !== HEADER) throw new Error('E78_RECON_BAD_HEADER');
  const seen = new Set();
  const accepted = [];
  const rejected = [];
  for (const line of rows) {
    const parsed = reasoned(line);
    if (!parsed.ok) { rejected.push({ line, reason: parsed.reason }); continue; }
    const key = JSON.stringify([parsed.row.symbol, parsed.row.ts_utc, parsed.row.side, parsed.row.qty, parsed.row.expected_px, parsed.row.filled_px, parsed.row.venue]);
    if (seen.has(key)) { rejected.push({ line, reason: 'DUPLICATE_ROW' }); continue; }
    seen.add(key);
    accepted.push(parsed.row);
  }
  accepted.sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.ts_utc.localeCompare(b.ts_utc)||a.side.localeCompare(b.side)||a.qty-b.qty||a.expected_px-b.expected_px);
  const coverage = new Map();
  for (const row of accepted) {
    const k = `${row.symbol}:${row.notes}`;
    const item = coverage.get(k) || { symbol: row.symbol, window: row.notes, accepted_rows: 0, rejected_rows: 0, rejects: {} };
    item.accepted_rows += 1;
    coverage.set(k, item);
  }
  for (const row of rejected) {
    const cols = row.line.split(',');
    const symbol = cols[0] || 'UNKNOWN';
    const window = cols[11] || 'UNKNOWN';
    const k = `${symbol}:${window}`;
    const item = coverage.get(k) || { symbol, window, accepted_rows: 0, rejected_rows: 0, rejects: {} };
    item.rejected_rows += 1;
    item.rejects[row.reason] = (item.rejects[row.reason] || 0) + 1;
    coverage.set(k, item);
  }
  const coverageRows = [...coverage.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.window.localeCompare(b.window));
  const source_sha = crypto.createHash('sha256').update(fs.readFileSync(csvPath)).digest('hex');
  const rows_sha = crypto.createHash('sha256').update(JSON.stringify(accepted)).digest('hex');
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ source_sha, rows_sha, coverageRows })).digest('hex');
  return { source_file: path.relative(process.cwd(), csvPath).split(path.sep).join('/'), source_sha, rows_sha, fingerprint, accepted, rejected, coverageRows };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(ingestE78Recon(path.resolve(process.argv[2] || 'core/edge/fixtures/e77_recon_observed_multi.csv')), null, 2));
}
