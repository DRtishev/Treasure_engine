#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from '../verify/e66_lib.mjs';
import { wsDirE116, writeMdAtomic } from '../verify/e116_lib.mjs';

const wsDir = wsDirE116();
const inPath = path.join(wsDir, 'binance_kline_frames.jsonl');
const outPath = path.join(wsDir, 'canonical_ohlcv.jsonl');
if (!fs.existsSync(inPath)) {
  writeMdAtomic('reports/evidence/E116/WS_REPLAY.md', '# E116 WS REPLAY\n- bars: 0\n- dedupe_updates: 0\n- canonical_hash: EMPTY\n- reason_code: WS_EMPTY');
  console.log('e116_ws_replay_to_ohlcv: WS_EMPTY');
  process.exit(0);
}
const frames = fs.readFileSync(inPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const byKey = new Map();
for (const f of frames) {
  const key = `${f.symbol}|${f.interval}|${f.openTime}`;
  const prev = byKey.get(key);
  if (!prev || f.eventTime > prev.eventTime || (f.eventTime === prev.eventTime && f.recv_seq > prev.recv_seq)) byKey.set(key, f);
}
const dedupe = frames.length - byKey.size;
const keys = [...byKey.keys()].sort((a, b) => {
  const [sa, ia, ta] = a.split('|'); const [sb, ib, tb] = b.split('|');
  if (sa !== sb) return sa.localeCompare(sb);
  if (ia !== ib) return ia.localeCompare(ib);
  return Number(ta) - Number(tb);
});
const bySI = new Map();
for (const k of keys) {
  const [s, i, t] = k.split('|');
  const gk = `${s}|${i}`;
  if (!bySI.has(gk)) bySI.set(gk, []);
  bySI.get(gk).push(Number(t));
}
const bars = [];
for (const k of keys) {
  const [symbol, interval, openTimeRaw] = k.split('|');
  const openTime = Number(openTimeRaw);
  const gk = `${symbol}|${interval}`;
  const arr = bySI.get(gk) || [];
  const idx = arr.indexOf(openTime);
  const row = byKey.get(k);
  const shouldClose = row.isFinal || idx < arr.length - 1;
  if (!shouldClose) continue;
  const p = JSON.parse(row.payload_compact || '{}');
  bars.push({ symbol, timeframe: interval, ts: openTime, o: Number(p.o), h: Number(p.h), l: Number(p.l), c: Number(p.c), v: Number(p.v), eventTime: Number(row.eventTime), recv_seq: Number(row.recv_seq) });
}
bars.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.timeframe.localeCompare(b.timeframe) || a.ts - b.ts);
const text = bars.map((b) => JSON.stringify(b)).join('\n');
if (text) fs.writeFileSync(outPath, `${text}\n`, 'utf8');
const h = fs.existsSync(outPath) ? sha256File(outPath) : sha256Text('EMPTY');
writeMdAtomic(path.join(wsDir, 'replay_summary.md'), ['# E116 WS REPLAY SUMMARY', `- bars: ${bars.length}`, `- canonical_sha256: ${h}`].join('\n'));
writeMdAtomic('reports/evidence/E116/WS_REPLAY.md', ['# E116 WS REPLAY', `- bars: ${bars.length}`, `- dedupe_updates: ${dedupe}`, `- canonical_hash: ${h}`].join('\n'));
console.log(`e116_ws_replay_to_ohlcv: bars=${bars.length}`);
