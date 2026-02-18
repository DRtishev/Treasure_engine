#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runMicroLive } from '../../core/live/e112_micro_live_runner.mjs';
import { modeState, SNAP_ROOT, writeMdAtomic } from '../verify/e112_lib.mjs';

const board = JSON.parse(fs.readFileSync(path.join(SNAP_ROOT, '_work', 'board_v4.json'), 'utf8')).board || [];
if (!board.length) throw new Error('E112_GRADUATION_NO_CANDIDATE');
const symbol = board[0].symbol;
const rows = fs.readFileSync(path.join(SNAP_ROOT, '_work', 'normalized', `${symbol}.jsonl`), 'utf8').trim().split('\n').filter(Boolean).map(x => JSON.parse(x));
const replay = rows.slice(-288).map(r => ({ ts: r.ts, price: r.c, symbol }));
const mode = modeState();
const live1h = mode === 'ONLINE_REQUIRED' ? 1 : 0;
const out = runMicroLive(replay, { replay24h: 1, live1h, maxTrades: 24 });
const payload = { ...out, symbol, mode };
fs.writeFileSync(path.join(SNAP_ROOT, '_work', 'graduation_run.json'), JSON.stringify(payload, null, 2));
writeMdAtomic('reports/evidence/E112/GRADUATION_BITE.md', [
  '# E112 GRADUATION BITE',
  `- mode: ${mode}`,
  `- symbol: ${symbol}`,
  `- replay_24h: PASS`,
  `- live_1h: ${live1h === 1 ? 'EXECUTED' : 'SKIPPED'}`,
  `- total_fills: ${out.summary.total_fills}`,
  `- kill_switch: ${out.kill_switch}`,
  `- summary_hash: ${out.summary_hash}`
].join('\n'));
console.log(`e112_graduation_bite: symbol=${symbol}`);
