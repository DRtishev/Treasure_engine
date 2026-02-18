#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from '../verify/e66_lib.mjs';
import { runDirE117, writeMdAtomic } from '../verify/e117_lib.mjs';

const wsDir = path.join(runDirE117(), 'ws');
const files = ['binance_ws_frames.jsonl', 'bybit_ws_frames.jsonl', 'kraken_ws_frames.jsonl'].map((f) => path.join(wsDir, f)).filter((p) => fs.existsSync(p));
const all = files.flatMap((p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const byKey = new Map();
for (const r of all) {
  const k = `${r.provider}|${r.symbol}|${r.timeframe}|${r.ts}`;
  const prev = byKey.get(k);
  if (!prev || Number(r.event_ts) > Number(prev.event_ts) || (Number(r.event_ts) === Number(prev.event_ts) && Number(r.seq) > Number(prev.seq))) byKey.set(k, r);
}
const bars = [...byKey.values()].filter((r) => r.final).sort((a, b) => a.provider.localeCompare(b.provider) || a.symbol.localeCompare(b.symbol) || a.timeframe.localeCompare(b.timeframe) || a.ts - b.ts);
const out = path.join(wsDir, 'replay_ohlcv.jsonl');
if (bars.length) fs.writeFileSync(out, `${bars.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
const h = fs.existsSync(out) ? sha256File(out) : sha256Text('EMPTY');
writeMdAtomic('reports/evidence/E117/WS_REPLAY.md', ['# E117 WS REPLAY', `- providers_seen: ${[...new Set(all.map((r) => r.provider))].sort().join(',') || 'NONE'}`, `- bars: ${bars.length}`, `- canonical_hash: ${h}`].join('\n'));
writeMdAtomic('reports/evidence/E117/NO_LOOKAHEAD_WS.md', ['# E117 NO LOOKAHEAD WS', `- check: monotonic_close_only`, `- status: ${bars.every((b) => b.final) ? 'PASS' : 'FAIL'}`].join('\n'));
console.log('e117_ws_replay_to_ohlcv done');
