#!/usr/bin/env node
import fs from 'node:fs';

const p = 'reports/evidence/E116/CANDIDATE_BOARD.md';
if (!fs.existsSync(p)) throw new Error('E116_CANDIDATE_BOARD_MISSING');
const t = fs.readFileSync(p, 'utf8');
const net = fs.existsSync('reports/evidence/E116/NET_PROOF_WS.md') ? fs.readFileSync('reports/evidence/E116/NET_PROOF_WS.md', 'utf8') : '';
const quorumPass = /status:\s*FULL/.test(net);
const entries = Number((t.match(/entries:\s*(\d+)/) || [])[1] || 0);
const reason = (t.match(/reason_code:\s*([A-Z_]+)/) || [])[1] || 'UNKNOWN';
if (quorumPass && entries < 1) throw new Error('E116_CANDIDATE_MINIMUMS_FAIL_EMPTY_BOARD');
if (!quorumPass && entries < 1 && reason !== 'INSUFFICIENT_DATA') throw new Error('E116_CANDIDATE_MINIMUMS_REASON_INVALID');
console.log('e116_candidate_minimums_contract: PASS');
