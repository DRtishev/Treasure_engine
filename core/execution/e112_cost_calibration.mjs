import { assertNetGuard, modeState } from '../../scripts/verify/e112_lib.mjs';

function percentile(arr, q) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
  return s[idx];
}

export async function runCostCalibration(symbol = 'BTCUSDT') {
  const mode = modeState();
  let spreads = [], rtts = [], source = 'offline_fallback';
  const feeBps = 4;
  if (mode !== 'OFFLINE_ONLY') {
    assertNetGuard();
    try {
      for (let i = 0; i < 5; i++) {
        const t0 = Date.now();
        const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
        const t1 = Date.now();
        if (!r.ok) throw new Error(`HTTP_${r.status}`);
        const j = await r.json();
        const item = j?.result?.list?.[0];
        const bid = Number(item?.bid1Price || 0);
        const ask = Number(item?.ask1Price || 0);
        if (bid <= 0 || ask <= 0 || ask < bid) throw new Error('BAD_TICKER');
        spreads.push(((ask - bid) / ((ask + bid) / 2)) * 10000);
        rtts.push(t1 - t0);
      }
      source = 'live_public_bybit';
    } catch {
      spreads = [1.4, 1.6, 1.8, 2.0, 2.2];
      rtts = [120, 130, 140, 150, 160];
      source = 'offline_fallback';
    }
  } else {
    spreads = [1.4, 1.6, 1.8, 2.0, 2.2];
    rtts = [120, 130, 140, 150, 160];
  }
  return {
    symbol,
    source,
    spread_median_bps: Number(percentile(spreads, 0.5).toFixed(6)),
    spread_p95_bps: Number(percentile(spreads, 0.95).toFixed(6)),
    rtt_median_ms: Number(percentile(rtts, 0.5).toFixed(6)),
    rtt_p95_ms: Number(percentile(rtts, 0.95).toFixed(6)),
    fee_bps: feeBps
  };
}
