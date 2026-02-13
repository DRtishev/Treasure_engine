import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function toFiniteNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`FillRecord non-finite ${field}: ${value}`);
  }
  return n;
}

function normalizeSide(side) {
  const s = String(side || '').toUpperCase();
  if (!['BUY', 'SELL'].includes(s)) throw new Error(`FillRecord invalid side: ${side}`);
  return s;
}

function normalizeTimestamp(ts) {
  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) throw new Error(`FillRecord invalid timestamp: ${ts}`);
  return parsed.toISOString();
}

export function normalizeFillRecord(row, idx = 0) {
  if (!row || typeof row !== 'object') throw new Error(`FillRecord row ${idx} must be object`);
  const timestamp = normalizeTimestamp(row.timestamp);
  const symbol = String(row.symbol || '').trim();
  if (!symbol) throw new Error(`FillRecord row ${idx} symbol required`);

  const out = {
    timestamp,
    symbol,
    side: normalizeSide(row.side),
    qty: toFiniteNumber(row.qty, 'qty'),
    price: toFiniteNumber(row.price, 'price'),
    fees: toFiniteNumber(row.fees ?? 0, 'fees')
  };

  if (row.latency_ms !== undefined && row.latency_ms !== null) {
    out.latency_ms = toFiniteNumber(row.latency_ms, 'latency_ms');
  }

  return out;
}

function parseFillFile(filePath) {
  const body = fs.readFileSync(filePath, 'utf8').trim();
  if (!body) return [];
  if (filePath.endsWith('.jsonl')) {
    return body.split('\n').filter(Boolean).map((line, i) => {
      try { return JSON.parse(line); } catch (err) { throw new Error(`Invalid JSONL at line ${i + 1}: ${err.message}`); }
    });
  }
  const parsed = JSON.parse(body);
  if (!Array.isArray(parsed)) throw new Error('FillRecord .json file must contain an array');
  return parsed;
}

export function loadFillRecords(options = {}) {
  const root = options.root || process.cwd();
  const candidates = options.candidates || [
    path.join(root, 'data/live/fills.jsonl'),
    path.join(root, 'data/live/fills.json'),
    path.join(root, 'reports/live/fills.jsonl'),
    path.join(root, 'reports/live/fills.json')
  ];

  const existing = candidates.find((p) => fs.existsSync(p));
  if (!existing) {
    return {
      mode: 'fallback-shadow-proxy',
      fallback_used: true,
      fallback_reason: 'FILL_RECORD_FILE_MISSING',
      source: null,
      records: []
    };
  }

  const rows = parseFillFile(existing).map((row, idx) => normalizeFillRecord(row, idx));
  rows.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp.localeCompare(b.timestamp);
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
    return a.side.localeCompare(b.side);
  });

  const inputHash = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');

  return {
    mode: 'live-fill-records',
    fallback_used: false,
    fallback_reason: null,
    source: path.relative(root, existing),
    records: rows,
    input_hash: inputHash
  };
}
