#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pinDirE116, writeMdAtomic } from '../verify/e116_lib.mjs';

const pinFile = path.join(pinDirE116(), 'canonical_ohlcv.jsonl');
let board = [];
let reason = 'INSUFFICIENT_DATA';
if (fs.existsSync(pinFile)) {
  const rows = fs.readFileSync(pinFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  if (rows.length >= 120) {
    const first = rows[0].c, last = rows[rows.length - 1].c;
    const ret = ((last - first) / first) * 100;
    const dd = Math.min(...rows.map((r) => ((r.l - first) / first) * 100));
    board = [{ strategy: 'E108_BRIDGE_BASELINE', bars: rows.length, return_pct: Number(ret.toFixed(4)), drawdown_pct: Number(dd.toFixed(4)), status: ret > 0 && dd > -25 ? 'CANDIDATE' : 'REJECT' }];
    reason = board[0].status === 'CANDIDATE' ? 'QUORUM_PASS' : 'REALISM_FAIL';
  }
}
const graduated = board.some((b) => b.status === 'CANDIDATE');
writeMdAtomic('reports/evidence/E116/CANDIDATE_BOARD.md', ['# E116 CANDIDATE BOARD', `- entries: ${board.length}`, `- reason_code: ${reason}`, ...board.map((b) => `- ${b.strategy}: bars=${b.bars}, return_pct=${b.return_pct}, drawdown_pct=${b.drawdown_pct}, status=${b.status}`)].join('\n'));
writeMdAtomic('reports/evidence/E116/GRADUATION_BRIDGE.md', ['# E116 GRADUATION BRIDGE', `- bridge_source: <REPO_ROOT>/${path.relative(process.cwd(), pinFile).replace(/\\/g, '/')}`, `- graduated: ${graduated ? 'yes' : 'no'}`, `- micro_live_plan_pointer: ${graduated ? 'specs/epochs/E111.md' : 'NONE'}`].join('\n'));
writeMdAtomic('reports/evidence/E116/COURT_VERDICTS.md', ['# E116 COURT VERDICTS', `- candidate_minimums: ${board.length ? 'PASS' : 'WARN'}`, `- realism_gate: ${graduated ? 'PASS' : 'WARN'}`, `- verdict: ${graduated ? 'GRADUATED' : 'NOT_GRADUATED'}`].join('\n'));
console.log(`e116_graduation_bridge: ${graduated ? 'GRADUATED' : 'NOT_GRADUATED'}`);
