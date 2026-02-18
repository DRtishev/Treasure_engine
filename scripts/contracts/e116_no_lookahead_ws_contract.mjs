#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { wsDirE116, writeMdAtomic } from '../verify/e116_lib.mjs';

const grace = Number(process.env.E116_WS_GRACE_MS || 1000);
const framePath = path.join(wsDirE116(), 'binance_kline_frames.jsonl');
const canPath = path.join(wsDirE116(), 'canonical_ohlcv.jsonl');
if (!fs.existsSync(framePath) || !fs.existsSync(canPath)) {
  writeMdAtomic('reports/evidence/E116/NO_LOOKAHEAD_WS.md', '# E116 NO LOOKAHEAD WS\n- status: PASS\n- checks: 0\n- reason_code: WS_EMPTY');
  console.log('e116_no_lookahead_ws_contract: WS_EMPTY');
  process.exit(0);
}
const frames = fs.readFileSync(framePath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const bars = fs.readFileSync(canPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const map = new Map();
for (const f of frames) {
  const key = `${f.symbol}|${f.interval}|${f.openTime}`;
  const prev = map.get(key);
  if (!prev || f.eventTime > prev.eventTime || (f.eventTime === prev.eventTime && f.recv_seq > prev.recv_seq)) map.set(key, f);
}
let checks = 0;
for (const b of bars) {
  const key = `${b.symbol}|${b.timeframe}|${b.ts}`;
  const f = map.get(key);
  if (!f) continue;
  checks += 1;
  const tfMs = b.timeframe.endsWith('m') ? Number(b.timeframe.slice(0, -1)) * 60000 : 300000;
  const closeT = b.ts + tfMs;
  if (Number(f.eventTime) > closeT + grace) {
    writeMdAtomic('reports/evidence/E116/NO_LOOKAHEAD_WS.md', ['# E116 NO LOOKAHEAD WS', '- status: FAIL', `- checks: ${checks}`, `- offending_key: ${key}`, `- event_time: ${f.eventTime}`, `- bar_close_plus_grace: ${closeT + grace}`].join('\n'));
    throw new Error('E116_LOOKAHEAD_DETECTED');
  }
}
writeMdAtomic('reports/evidence/E116/NO_LOOKAHEAD_WS.md', ['# E116 NO LOOKAHEAD WS', '- status: PASS', `- checks: ${checks}`, `- grace_ms: ${grace}`].join('\n'));
console.log(`e116_no_lookahead_ws_contract: checks=${checks}`);
