import { WebSocket } from 'ws';
import fs from 'node:fs';

export async function collectBinanceClosedKlines({ symbol = 'btcusdt', interval = '5m', maxMessages = 20, timeoutMs = 8000, wsBaseUrl = process.env.BINANCE_WS_BASE_URL || 'wss://stream.binance.com:9443/ws', recordPath }) {
  const url = `${wsBaseUrl}/${symbol}@kline_${interval}`;
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const rows = [];
    const frames = [];
    const to = setTimeout(() => { ws.terminate(); reject(new Error('E_WSS_TIMEOUT')); }, timeoutMs);
    ws.on('message', (buf) => {
      const txt = buf.toString('utf8');
      frames.push(txt);
      let j; try { j = JSON.parse(txt); } catch { return; }
      const k = j?.k;
      if (!k || !k.x) return;
      rows.push({ ts: Number(k.t), o: Number(k.o), h: Number(k.h), l: Number(k.l), c: Number(k.c), v: Number(k.v) });
      if (rows.length >= maxMessages) { clearTimeout(to); ws.close(); }
    });
    ws.on('close', () => {
      clearTimeout(to);
      rows.sort((a, b) => a.ts - b.ts);
      if (recordPath) fs.writeFileSync(recordPath, `${frames.join('\n')}\n`, 'utf8');
      resolve(rows);
    });
    ws.on('error', (e) => { clearTimeout(to); reject(e); });
  });
}

export function replayBinanceFrames(framesText) {
  const rows = [];
  for (const line of framesText.split('\n').filter(Boolean)) {
    let j; try { j = JSON.parse(line); } catch { continue; }
    const k = j?.k; if (!k || !k.x) continue;
    rows.push({ ts: Number(k.t), o: Number(k.o), h: Number(k.h), l: Number(k.l), c: Number(k.c), v: Number(k.v) });
  }
  rows.sort((a, b) => a.ts - b.ts);
  return rows;
}
