#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const p = path.resolve('.cache/e111/candidate_board.json');
if (!fs.existsSync(p)) throw new Error('candidate_board missing');
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
const board = data.board || [];
const quorum = fs.readFileSync(path.resolve('reports/evidence/E111/DATA_QUORUM_V3.md'), 'utf8');
const quorumPass = /status:\s*PASS/.test(quorum);
const good = board.filter(c => c.trades >= 300 && c.oosStability >= 0.2);
if (quorumPass && good.length === 0) {
  console.error('FAIL BOARD_EMPTY_WITH_QUORUM_PASS');
  process.exit(1);
}
console.log(`e111_candidate_minimums_contract: PASS qualified=${good.length}`);
