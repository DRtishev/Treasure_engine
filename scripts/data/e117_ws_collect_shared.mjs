import fs from 'node:fs';
import path from 'node:path';
import { WebSocket } from 'ws';
import { sha256File, sha256Text } from '../verify/e66_lib.mjs';
import { modeE117, runDirE117 } from '../verify/e117_lib.mjs';

export async function collectWsE117({ provider, url, mapper, subscribe }) {
  const mode = modeE117();
  const wsDir = path.join(runDirE117(), 'ws');
  fs.mkdirSync(wsDir, { recursive: true });
  const out = path.join(wsDir, `${provider}_frames.jsonl`);
  const maxFrames = Number(process.env.E117_WS_MAX_FRAMES || 40);
  const timeoutMs = Number(process.env.E117_WS_TIMEOUT_MS || 5000);
  let rows = [];
  let reason = 'OFFLINE_ONLY';
  if (mode !== 'OFFLINE_ONLY' && process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1' && process.env.FORCE_NET_DOWN !== '1') {
    try {
      rows = await new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        const rec = [];
        const to = setTimeout(() => { ws.terminate(); reject(new Error('E_TIMEOUT')); }, timeoutMs);
        ws.on('open', () => { if (subscribe) ws.send(JSON.stringify(subscribe)); });
        ws.on('message', (buf) => {
          let j; try { j = JSON.parse(buf.toString('utf8')); } catch { return; }
          const row = mapper(j);
          if (!row) return;
          rec.push({ ...row, seq: rec.length + 1, recv_ts: Date.now() });
          if (rec.length >= maxFrames) { clearTimeout(to); ws.close(); }
        });
        ws.on('close', () => { clearTimeout(to); resolve(rec); });
        ws.on('error', (e) => { clearTimeout(to); reject(e); });
      });
      reason = rows.length ? 'WS_CAPTURE_OK' : 'E_EMPTY';
    } catch { reason = 'E_PROVIDER_DOWN'; }
  } else if (mode !== 'OFFLINE_ONLY') {
    reason = process.env.FORCE_NET_DOWN === '1' ? 'FORCED_NET_DOWN' : 'NET_GUARD_OFF';
  }
  if (!rows.length) {
    rows = [{ provider, symbol: (process.env.E117_SYMBOL || 'BTCUSDT').toUpperCase(), timeframe: process.env.E117_INTERVAL || '5m', ts: 1700000000000, event_ts: 1700000000000, final: true, o: 1, h: 1, l: 1, c: 1, v: 1, seq: 1, recv_ts: 1700000000000, pinned: true }];
    if (mode === 'ONLINE_REQUIRED') reason = `${reason}|PINNED_FALLBACK`; else reason = `${reason}|PINNED_FALLBACK`;
  }
  const monotonic = rows.map((r, i) => ({ ...r, recv_ts: i === 0 ? Number(r.recv_ts) : Math.max(Number(r.recv_ts), Number(rows[i - 1].recv_ts) + 1) }));
  fs.writeFileSync(out, `${monotonic.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
  return { out, hash: sha256File(out), rows: monotonic.length, reason, mode, wsDir, emptyHash: sha256Text('EMPTY') };
}
