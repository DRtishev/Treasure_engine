import crypto from 'node:crypto';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });

const NUMERIC_SCALE = 8;

export const DATA_SCHEMA_VERSION = '1.0.0';
export const NORMALIZATION_VERSION = '1.0.0';

const tradeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'ts_ms',
    'symbol',
    'price',
    'qty',
    'side',
    'trade_id',
    'source_seq',
    'input_fingerprint',
    'output_fingerprint'
  ],
  properties: {
    schema_version: { const: DATA_SCHEMA_VERSION },
    ts_ms: { type: 'integer', minimum: 0 },
    symbol: { type: 'string', minLength: 1 },
    price: { type: 'number' },
    qty: { type: 'number' },
    side: { type: 'string', enum: ['BUY', 'SELL'] },
    trade_id: { type: ['string', 'null'] },
    source_seq: { type: ['integer', 'null'] },
    input_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    output_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
  }
};

const validateTrade = ajv.compile(tradeSchema);

function normalizeNumber(value, scale = NUMERIC_SCALE) {
  if (!Number.isFinite(value)) throw new Error(`Non-finite numeric value: ${value}`);
  const factor = 10 ** scale;
  const truncated = value < 0 ? Math.ceil(value * factor) : Math.floor(value * factor);
  const out = truncated / factor;
  return Object.is(out, -0) ? 0 : out;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function fingerprintObject(obj) {
  return sha256Hex(stableStringify(obj));
}

export function normalizeTradeEvent(rawEvent, provider = 'binance') {
  const inputFingerprint = fingerprintObject(rawEvent);

  let tsMs;
  let symbol;
  let price;
  let qty;
  let side;
  let tradeId = null;
  let sourceSeq = null;

  if (provider === 'binance') {
    tsMs = Number(rawEvent.T ?? rawEvent.E ?? rawEvent.ts_ms);
    symbol = String(rawEvent.s ?? rawEvent.symbol ?? '');
    price = Number(rawEvent.p ?? rawEvent.price);
    qty = Number(rawEvent.q ?? rawEvent.qty);
    side = rawEvent.m === true || rawEvent.side === 'SELL' ? 'SELL' : 'BUY';
    tradeId = rawEvent.t !== undefined ? String(rawEvent.t) : (rawEvent.trade_id ?? null);
    sourceSeq = Number.isFinite(Number(rawEvent.a)) ? Number(rawEvent.a) : (Number.isFinite(Number(rawEvent.source_seq)) ? Number(rawEvent.source_seq) : null);
  } else {
    tsMs = Number(rawEvent.ts_ms);
    symbol = String(rawEvent.symbol ?? '');
    price = Number(rawEvent.price);
    qty = Number(rawEvent.qty);
    side = String(rawEvent.side ?? '').toUpperCase();
    tradeId = rawEvent.trade_id == null ? null : String(rawEvent.trade_id);
    sourceSeq = Number.isFinite(Number(rawEvent.source_seq)) ? Number(rawEvent.source_seq) : null;
  }

  const base = {
    schema_version: DATA_SCHEMA_VERSION,
    ts_ms: Math.trunc(tsMs),
    symbol,
    price: normalizeNumber(price),
    qty: normalizeNumber(qty),
    side,
    trade_id: tradeId,
    source_seq: sourceSeq,
    input_fingerprint: inputFingerprint
  };

  const outputFingerprint = fingerprintObject(base);
  const normalized = { ...base, output_fingerprint: outputFingerprint };

  const ok = validateTrade(normalized);
  if (!ok) {
    throw new Error(`TradeEvent contract violation: ${ajv.errorsText(validateTrade.errors)}`);
  }

  return normalized;
}

export function parseJsonl(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function toJsonl(rows) {
  return `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`;
}
