import { normalizeWsFrame } from '../ws_provider_interface.mjs';

export function mapBinanceWs(json, symbol, timeframe) {
  const k = json?.k;
  if (!k) return null;
  return normalizeWsFrame({
    symbol: String(k.s || symbol),
    timeframe: String(k.i || timeframe),
    ts: Number(k.t),
    event_ts: Number(json.E || 0),
    final: Boolean(k.x),
    o: Number(k.o),
    h: Number(k.h),
    l: Number(k.l),
    c: Number(k.c),
    v: Number(k.v)
  }, 'binance_ws');
}
