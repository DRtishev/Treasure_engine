#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const quorum = fs.readFileSync(path.resolve('reports/evidence/E112/DATA_QUORUM_V4.md'), 'utf8');
const quorumPass = /status:\s*PASS/.test(quorum);
const board = JSON.parse(fs.readFileSync(path.resolve('.foundation-seal/capsules/_work/board_v4.json'), 'utf8')).board || [];
const court = fs.readFileSync(path.resolve('reports/evidence/E112/COURT_VERDICTS.md'), 'utf8');
const noSignal = /no_signal_proven:\s*yes/.test(court);
if (quorumPass && board.length === 0 && !noSignal) throw new Error('E112_BOARD_EMPTY_WITH_QUORUM_PASS');
console.log(`e112_candidate_minimums_v2: PASS board=${board.length}`);
