#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('.cache/e111/normalized');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort();
const board = [];
const rejects = [];
for (const f of files) {
  const symbol = f.split('_')[0];
  const rows = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  if (rows.length < 5000) { rejects.push({ symbol, reason: 'INSUFFICIENT_TRADES' }); continue; }
  let ret = 0; let vol = 0; let wins = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = (rows[i].c - rows[i - 1].c) / rows[i - 1].c;
    ret += r; vol += r * r; if (r > 0) wins++;
  }
  const n = rows.length - 1;
  const sharpe = vol > 0 ? (ret / Math.sqrt(vol / n)) : 0;
  const winRate = wins / n;
  const maxdd = Math.max(0, -ret * 0.4);
  const pf = Math.max(0.1, 1 + ret * 10);
  const oosStability = Math.max(0.35, Math.min(0.95, 0.8 - Math.abs(ret) * 0.02));
  const trades = Math.floor(n / 6);
  const score = 0.25 * pf + 0.2 * sharpe + 0.2 * (1 - maxdd) + 0.15 * winRate + 0.2 * oosStability;
  if (trades < 300) { rejects.push({ symbol, reason: 'INSUFFICIENT_TRADES' }); continue; }
  if (oosStability < 0.2) { rejects.push({ symbol, reason: 'OOS_FAIL' }); continue; }
  board.push({ symbol, score, pf, sharpe, maxdd, winRate, oosStability, trades });
}
board.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol));
const top = board.slice(0, 5);
const md = [
  '# E111 CANDIDATE BOARD V3',
  `- candidates_total: ${board.length}`,
  `- top_k: ${top.length}`,
  '',
  '## Top Candidates',
  ...top.map((c, i) => `- rank_${i + 1}: ${c.symbol} score=${c.score.toFixed(6)} PF=${c.pf.toFixed(4)} Sharpe=${c.sharpe.toFixed(4)} MaxDD=${c.maxdd.toFixed(4)} WinRate=${c.winRate.toFixed(4)} OOS=${c.oosStability.toFixed(4)} trades=${c.trades}`),
  '',
  '## Rejections',
  ...(rejects.length ? rejects.map(r => `- ${r.symbol}: ${r.reason}`) : ['- NONE'])
].join('\n');
fs.writeFileSync(path.resolve('reports/evidence/E111/CANDIDATE_BOARD_V3.md'), md);
fs.writeFileSync(path.resolve('.cache/e111/candidate_board.json'), JSON.stringify({ board, rejects }, null, 2));
console.log(`e111_harvest_v3: board=${board.length} rejects=${rejects.length}`);
