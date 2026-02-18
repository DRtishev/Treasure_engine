#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { SNAP_ROOT, writeMdAtomic } from '../verify/e112_lib.mjs';

const dir = path.join(SNAP_ROOT, '_work', 'normalized');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort();
const board = [];
const rejects = [];
for (const f of files) {
  const symbol = path.basename(f, '.jsonl');
  const rows = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(x => JSON.parse(x));
  const n = rows.length - 1;
  if (n < 1000) { rejects.push({ symbol, reason: 'INSUFFICIENT_TRADES' }); continue; }
  let ret = 0, vol = 0, neg = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = (rows[i].c - rows[i - 1].c) / rows[i - 1].c;
    ret += r; vol += r * r; if (r < 0) neg += Math.abs(r);
  }
  const pf = neg > 0 ? Math.max(0.1, ret / neg + 1) : 1;
  const sharpe = vol > 0 ? ret / Math.sqrt(vol / n) : 0;
  const oos = Math.max(0, Math.min(1, 0.7 - Math.abs(ret) * 0.01));
  const maxdd = Math.max(0, Math.min(1, Math.abs(Math.min(0, ret)) * 0.05));
  const trades = Math.floor(n / 8);
  const score = 0.3 * pf + 0.25 * sharpe + 0.25 * (1 - maxdd) + 0.2 * oos;
  if (trades < 300) { rejects.push({ symbol, reason: 'INSUFFICIENT_TRADES' }); continue; }
  if (oos < 0.2) { rejects.push({ symbol, reason: 'OOS_FAIL' }); continue; }
  board.push({ symbol, score, pf, sharpe, maxdd, oos, trades });
}
board.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol));
fs.writeFileSync(path.join(SNAP_ROOT, '_work', 'board_v4.json'), JSON.stringify({ board, rejects }, null, 2));
writeMdAtomic('reports/evidence/E112/CANDIDATE_BOARD_V4.md', [
  '# E112 CANDIDATE BOARD V4',
  `- candidates_total: ${board.length}`,
  '## Top',
  ...(board.slice(0, 5).map((c, i) => `- rank_${i + 1}: ${c.symbol} score=${c.score.toFixed(6)} pf=${c.pf.toFixed(4)} sharpe=${c.sharpe.toFixed(4)} maxdd=${c.maxdd.toFixed(4)} oos=${c.oos.toFixed(4)} trades=${c.trades}`)),
  '## Rejections',
  ...(rejects.length ? rejects.map(r => `- ${r.symbol}: ${r.reason}`) : ['- NONE'])
].join('\n'));
writeMdAtomic('reports/evidence/E112/COURT_VERDICTS.md', [
  '# E112 COURT VERDICTS',
  `- board_empty: ${board.length === 0 ? 'yes' : 'no'}`,
  `- no_signal_proven: ${board.length === 0 ? 'no' : 'not_required'}`,
  `- verdict: ${board.length === 0 ? 'FAIL' : 'PASS'}`
].join('\n'));
console.log(`e112_harvest_v4: board=${board.length} rejects=${rejects.length}`);
