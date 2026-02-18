#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeE116, assertNetGateE116, wsDirE116, writeMdAtomic } from '../verify/e116_lib.mjs';

const mode = modeE116();
const N = Number(process.env.E116_PARITY_N || 8);
const tol = Number(process.env.E116_FLOAT_TOL || 1e-6);
const canPath = path.join(wsDirE116(), 'canonical_ohlcv.jsonl');
const rows = [];

function closeEq(a, b) { return Math.abs(a - b) <= tol; }
function reason(symbol, interval, verdict, code, detail='') { rows.push({ symbol, interval, verdict, code, detail }); }

if (!fs.existsSync(canPath) || !fs.readFileSync(canPath, 'utf8').trim()) {
  reason('BTCUSDT', '5m', 'WARN', 'WS_EMPTY');
} else {
  const wsBars = fs.readFileSync(canPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const groups = new Map();
  for (const b of wsBars) {
    const k = `${b.symbol}|${b.timeframe}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  }
  for (const [k, bars] of groups) {
    const [symbol, interval] = k.split('|');
    bars.sort((a, b) => a.ts - b.ts);
    const tail = bars.slice(-N);
    if (!tail.length) { reason(symbol, interval, 'WARN', 'WS_UNCLOSED_ONLY'); continue; }
    if (mode === 'OFFLINE_ONLY') { reason(symbol, interval, 'WARN', 'REST_UNREACHABLE'); continue; }
    if (!(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) { reason(symbol, interval, 'WARN', 'REST_UNREACHABLE', 'NET_GUARD_OFF'); continue; }
    assertNetGateE116();
    if (process.env.FORCE_NET_DOWN === '1') { reason(symbol, interval, 'FAIL', 'REST_UNREACHABLE'); continue; }
    try {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${tail.length}`);
      if (!r.ok) { reason(symbol, interval, 'FAIL', 'REST_UNREACHABLE', `HTTP_${r.status}`); continue; }
      const j = await r.json();
      const rest = (Array.isArray(j) ? j : []).map((x) => ({ ts: Number(x[0]), o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]), v: Number(x[5]) }));
      if (rest.length !== tail.length) { reason(symbol, interval, 'FAIL', 'SCHEMA_DRIFT', `len=${rest.length}/${tail.length}`); continue; }
      let ok = true;
      for (let i = 0; i < tail.length; i += 1) {
        const a = tail[i], b = rest[i];
        if (a.ts !== b.ts || !closeEq(a.o, b.o) || !closeEq(a.h, b.h) || !closeEq(a.l, b.l) || !closeEq(a.c, b.c) || !closeEq(a.v, b.v)) { ok = false; break; }
      }
      reason(symbol, interval, ok ? 'PASS' : 'FAIL', ok ? 'PARITY_OK' : 'PARITY_MISMATCH');
    } catch {
      reason(symbol, interval, 'FAIL', 'REST_UNREACHABLE');
    }
  }
}
const okCount = rows.filter((r) => r.code === 'PARITY_OK').length;
writeMdAtomic('reports/evidence/E116/PARITY_COURT.md', ['# E116 PARITY COURT', `- mode: ${mode}`, `- required_ok_count: ${mode === 'ONLINE_REQUIRED' ? 1 : 0}`, ...rows.map((r) => `- ${r.symbol}|${r.interval}: ${r.verdict} (${r.code}${r.detail ? `:${r.detail}` : ''})`)].join('\n'));
if (mode === 'ONLINE_REQUIRED' && okCount < 1) throw new Error('E116_PARITY_REQUIRED_FAIL');
console.log(`e116_ws_rest_parity_contract: parity_ok=${okCount}`);
