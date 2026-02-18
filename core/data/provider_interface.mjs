import { isCITruthy, assertNetGateE114 } from '../../scripts/verify/e114_lib.mjs';

export const E114_ERRORS = {
  NET_BLOCKED: 'E_NET_BLOCKED', TIMEOUT: 'E_TIMEOUT', RATE_LIMIT: 'E_RATE_LIMIT', BAD_SCHEMA: 'E_BAD_SCHEMA', EMPTY: 'E_EMPTY', FETCH_FAIL: 'E_FETCH_FAIL'
};

function mapError(msg) {
  if (msg.includes('aborted')) return E114_ERRORS.TIMEOUT;
  if (msg.includes('429')) return E114_ERRORS.RATE_LIMIT;
  if (msg.includes('schema')) return E114_ERRORS.BAD_SCHEMA;
  if (msg.includes('empty')) return E114_ERRORS.EMPTY;
  return E114_ERRORS.FETCH_FAIL;
}

export async function fetchOHLCV({ provider, symbol, tf = '5m', from, to, limit = 200 }) {
  if (isCITruthy()) throw new Error(E114_ERRORS.NET_BLOCKED);
  assertNetGateE114();
  try {
    const result = await provider.fetchOHLCV({ symbol, tf, from, to, limit });
    if (!Array.isArray(result?.bars) || result.bars.length === 0) throw new Error('empty');
    const bars = result.bars.map(r => ({ ts: Number(r.ts), o: Number(r.o), h: Number(r.h), l: Number(r.l), c: Number(r.c), v: Number(r.v) }));
    for (const b of bars) if ([b.ts,b.o,b.h,b.l,b.c,b.v].some(x => Number.isNaN(x))) throw new Error('schema');
    return { bars, provider_meta: result.provider_meta || {} };
  } catch (e) {
    const m = String(e.message || e);
    const code = Object.values(E114_ERRORS).includes(m) ? m : mapError(m);
    const err = new Error(code);
    err.code = code;
    throw err;
  }
}
