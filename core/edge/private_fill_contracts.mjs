import crypto from 'node:crypto';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });
export const PRIVATE_FILL_SCHEMA_VERSION = '1.0.0';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'fill_id', 'order_id', 'ts_ms', 'symbol', 'side', 'qty', 'price',
    'fee', 'fee_asset', 'liquidity_flag', 'provider', 'account_label', 'venue', 'input_fingerprint', 'output_fingerprint'
  ],
  properties: {
    schema_version: { const: PRIVATE_FILL_SCHEMA_VERSION },
    fill_id: { type: ['string', 'null'] },
    order_id: { type: ['string', 'null'] },
    ts_ms: { type: 'integer', minimum: 0 },
    symbol: { type: 'string', minLength: 1 },
    side: { type: 'string', enum: ['BUY', 'SELL'] },
    qty: { type: 'number' },
    price: { type: 'number' },
    fee: { type: 'number' },
    fee_asset: { type: 'string', minLength: 1 },
    liquidity_flag: { type: 'string', enum: ['MAKER', 'TAKER', 'UNKNOWN'] },
    provider: { type: 'string', minLength: 1 },
    account_label: { type: 'string', minLength: 1 },
    venue: { type: 'string', minLength: 1 },
    input_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    output_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
  }
};

const validate = ajv.compile(schema);

function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

function fp(obj) { return crypto.createHash('sha256').update(stableStringify(obj)).digest('hex'); }

function toFiniteNumber(x, name) {
  const n = Number(x);
  if (!Number.isFinite(n)) throw new Error(`non-finite ${name}`);
  const out = Math.round(n * 1e8) / 1e8;
  return Object.is(out, -0) ? 0 : out;
}

function parseTsMs(v) {
  const asNum = Number(v);
  if (Number.isFinite(asNum)) return Math.trunc(asNum);
  const ms = Date.parse(v);
  if (!Number.isFinite(ms)) throw new Error(`invalid ts_ms: ${v}`);
  return ms;
}

export function normalizePrivateFill(raw, ctx = {}, strict = false) {
  const base = {
    schema_version: PRIVATE_FILL_SCHEMA_VERSION,
    fill_id: raw.fill_id == null || raw.fill_id === '' ? null : String(raw.fill_id),
    order_id: raw.order_id == null || raw.order_id === '' ? null : String(raw.order_id),
    ts_ms: parseTsMs(raw.ts_ms ?? raw.timestamp),
    symbol: String(raw.symbol ?? '').toUpperCase(),
    side: String(raw.side ?? '').toUpperCase(),
    qty: toFiniteNumber(raw.qty, 'qty'),
    price: toFiniteNumber(raw.price, 'price'),
    fee: toFiniteNumber(raw.fee ?? raw.fees ?? 0, 'fee'),
    fee_asset: String(raw.fee_asset ?? 'USDT').toUpperCase(),
    liquidity_flag: String(raw.liquidity_flag ?? 'UNKNOWN').toUpperCase(),
    provider: String(ctx.provider ?? raw.provider ?? 'unknown'),
    account_label: String(ctx.account_label ?? raw.account_label ?? 'acct-redacted'),
    venue: String(ctx.venue ?? raw.venue ?? 'unknown')
  };

  if (!['BUY', 'SELL'].includes(base.side)) throw new Error(`invalid side ${base.side}`);
  if (!['MAKER', 'TAKER', 'UNKNOWN'].includes(base.liquidity_flag)) base.liquidity_flag = 'UNKNOWN';
  if (strict && !base.fill_id) throw new Error('strict mode requires fill_id');

  const input_fingerprint = fp(raw);
  const output_fingerprint = fp({ ...base, input_fingerprint });
  const out = { ...base, input_fingerprint, output_fingerprint };

  const ok = validate(out);
  if (!ok) throw new Error(ajv.errorsText(validate.errors));
  return out;
}

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
    return row;
  });
}

export function jsonlParse(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
}

export function toJsonl(rows) { return `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`; }
