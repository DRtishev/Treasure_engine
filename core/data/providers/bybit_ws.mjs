import { normalizeWsFrame } from '../ws_provider_interface.mjs';

export function mapBybitWs(json, symbol, timeframe) {
  const k = Array.isArray(json?.data) ? json.data[0] : json?.data;
  if (!k) return null;
  const start = Number(k.start ?? k.startTime ?? 0);
  return normalizeWsFrame({
    symbol: String(k.symbol || symbol),
    timeframe: String(k.interval || timeframe),
    ts: start,
    event_ts: Number(json.ts || Date.now()),
    final: Boolean(k.confirm),
    o: Number(k.open),
    h: Number(k.high),
    l: Number(k.low),
    c: Number(k.close),
    v: Number(k.volume)
  }, 'bybit_ws');
}
