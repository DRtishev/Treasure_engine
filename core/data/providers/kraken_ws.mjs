import { normalizeWsFrame } from '../ws_provider_interface.mjs';

export function mapKrakenWs(json, symbol, timeframe) {
  if (!Array.isArray(json?.data) || !json.data.length) return null;
  const k = json.data[0];
  return normalizeWsFrame({
    symbol: String(k.symbol || symbol).replace('/', ''),
    timeframe,
    ts: Number(k.interval_begin || 0),
    event_ts: Number(Date.parse(k.timestamp || '') || Date.now()),
    final: Boolean(k.complete),
    o: Number(k.open),
    h: Number(k.high),
    l: Number(k.low),
    c: Number(k.close),
    v: Number(k.volume)
  }, 'kraken_ws');
}
