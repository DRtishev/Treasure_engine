#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { WebSocket } from 'ws';
import { sha256File, sha256Text } from '../verify/e66_lib.mjs';
import { modeE116, assertNetGateE116, wsDirE116, runDirE116, writeMdAtomic } from '../verify/e116_lib.mjs';

const mode = modeE116();
const run = runDirE116();
const wsDir = wsDirE116();
fs.mkdirSync(wsDir, { recursive: true });

const symbol = (process.env.E116_WS_SYMBOL || 'btcusdt').toLowerCase();
const interval = process.env.E116_WS_INTERVAL || '5m';
const maxFrames = Number(process.env.E116_WS_MAX_FRAMES || 40);
const timeoutMs = Number(process.env.E116_WS_TIMEOUT_MS || 6000);
const channel = `${symbol}@kline_${interval}`;
const wsBase = process.env.BINANCE_WS_BASE_URL || 'wss://stream.binance.com:9443/ws';
const outPath = path.join(wsDir, 'binance_kline_frames.jsonl');
const manifestPath = path.join(wsDir, 'manifest.md');

let reason = 'OFFLINE_MODE';
let rows = [];
if (mode !== 'OFFLINE_ONLY') {
  assertNetGateE116();
  if (process.env.FORCE_NET_DOWN === '1') reason = 'FORCED_NET_DOWN';
  else {
    try {
      rows = await new Promise((resolve, reject) => {
        const ws = new WebSocket(`${wsBase}/${channel}`);
        const rec = [];
        let seq = 0;
        const to = setTimeout(() => { ws.terminate(); reject(new Error('E116_WS_TIMEOUT')); }, timeoutMs);
        ws.on('message', (buf) => {
          const txt = buf.toString('utf8');
          let j; try { j = JSON.parse(txt); } catch { return; }
          const k = j?.k;
          if (!k) return;
          seq += 1;
          rec.push({
            provider: 'binance',
            channel: 'kline',
            symbol: String(k.s || symbol).toUpperCase(),
            interval: String(k.i || interval),
            eventTime: Number(j.E || 0),
            openTime: Number(k.t || 0),
            isFinal: Boolean(k.x),
            payload_compact: JSON.stringify({ o: k.o, h: k.h, l: k.l, c: k.c, v: k.v }),
            recv_seq: seq,
            recv_ts: Date.now()
          });
          if (seq >= maxFrames) { clearTimeout(to); ws.close(); }
        });
        ws.on('close', () => { clearTimeout(to); resolve(rec); });
        ws.on('error', (e) => { clearTimeout(to); reject(e); });
      });
      reason = rows.length ? 'WS_CAPTURE_OK' : 'WS_EMPTY';
    } catch (e) {
      reason = String(e.message || e).includes('TIMEOUT') ? 'WS_TIMEOUT' : 'WS_UNREACHABLE';
    }
  }
}
const body = rows.map((r) => JSON.stringify(r)).join('\n');
if (body) fs.writeFileSync(outPath, `${body}\n`, 'utf8');
const chunkHash = fs.existsSync(outPath) ? sha256File(outPath) : sha256Text('EMPTY');
writeMdAtomic(manifestPath, ['# E116 WS MANIFEST', `- file: ${path.relative(process.cwd(), outPath).replace(/\\/g, '/')}`, `- sha256: ${chunkHash}`, `- rows: ${rows.length}`].join('\n'));
writeMdAtomic('reports/evidence/E116/WS_CAPTURE.md', ['# E116 WS CAPTURE', `- mode: ${mode}`, `- run_dir: <REPO_ROOT>/${path.relative(process.cwd(), run).replace(/\\/g, '/')}`, `- symbol: ${symbol.toUpperCase()}`, `- interval: ${interval}`, `- frame_count: ${rows.length}`, `- chunk_sha256: ${chunkHash}`, `- reason_code: ${reason}`].join('\n'));
console.log(`e116_ws_collect_binance: ${reason}`);
