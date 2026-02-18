export const E117_WS_ERRORS = {
  NET_BLOCKED: 'E_NET_BLOCKED',
  PROVIDER_DOWN: 'E_PROVIDER_DOWN',
  TIMEOUT: 'E_TIMEOUT',
  BAD_SCHEMA: 'E_SCHEMA_DRIFT',
  EMPTY: 'E_EMPTY',
  TIME_DRIFT: 'E_TIME_DRIFT',
  FETCH_FAIL: 'E_FETCH_FAIL',
  FALLBACK_CAP: 'E_FALLBACK_CAP'
};

export function normalizeWsFrame(frame, provider) {
  const row = {
    provider,
    symbol: String(frame?.symbol || '').toUpperCase(),
    timeframe: String(frame?.timeframe || ''),
    ts: Number(frame?.ts || 0),
    event_ts: Number(frame?.event_ts || 0),
    final: Boolean(frame?.final),
    o: Number(frame?.o),
    h: Number(frame?.h),
    l: Number(frame?.l),
    c: Number(frame?.c),
    v: Number(frame?.v)
  };
  if (!row.symbol || !row.timeframe || Number.isNaN(row.ts) || Number.isNaN(row.event_ts) || [row.o, row.h, row.l, row.c, row.v].some(Number.isNaN)) {
    const e = new Error(E117_WS_ERRORS.BAD_SCHEMA);
    e.code = E117_WS_ERRORS.BAD_SCHEMA;
    throw e;
  }
  return row;
}

export function wsResult({ provider, symbol, timeframe, frames_path, meta = {}, warnings = [], errors = [] }) {
  return { provider, symbol, timeframe, frames_path, meta, warnings, errors };
}
