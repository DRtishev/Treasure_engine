import crypto from 'node:crypto';

export function parseAllowlist(raw) {
  return String(raw || 'binance,bybit,okx,kraken')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export function classifyError(err) {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || 'UNKNOWN');
  if (code === 'ENOTFOUND') return 'DNS';
  if (code === 'ETIMEDOUT') return 'TIMEOUT';
  if (code === 'ENETUNREACH' || code === 'ECONNREFUSED' || code === 'ECONNRESET') return 'ENETUNREACH';
  if (code === 'ERR_SSL_PROTOCOL_ERROR' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') return 'TLS';
  if (/HTTP\s*4\d\d/.test(msg)) return 'HTTP_4XX';
  if (/HTTP\s*5\d\d/.test(msg)) return 'HTTP_5XX';
  if (/JSON|parse/i.test(msg)) return 'PARSE';
  return 'UNKNOWN';
}

export function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

export function normalizeRows(rows) {
  return [...rows]
    .map((r) => ({
      symbol: String(r.symbol),
      tf: String(r.tf),
      ts_open_ms: Number(r.ts_open_ms),
      o: Number(Number(r.o).toFixed(8)),
      h: Number(Number(r.h).toFixed(8)),
      l: Number(Number(r.l).toFixed(8)),
      c: Number(Number(r.c).toFixed(8)),
      v: Number(Number(r.v).toFixed(8)),
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol) || a.ts_open_ms - b.ts_open_ms);
}

export function schemaSignature() {
  return sha256Text('ts_open_ms,o,h,l,c,v,symbol,tf');
}
