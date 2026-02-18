#!/usr/bin/env node
import fs from 'node:fs';
import { evaluateE122LiveFillGate } from '../../core/gates/e122_live_fill_gate.mjs';
import { modeE122, writeMdAtomic } from './e122_lib.mjs';

const mode = modeE122();
const flow = fs.readFileSync('reports/evidence/E122/EXECUTION_FLOW.md', 'utf8');
const proof = fs.readFileSync('reports/evidence/E122/LIVE_FILL_PROOF.md', 'utf8');
const ledger = fs.readFileSync('reports/evidence/E122/LEDGER_DAILY_REPORT.md', 'utf8');
const terminalStatus = /terminal_status:\s*(\w+)/.exec(flow)?.[1] || 'UNKNOWN';
const liveProofStatus = /status:\s*(\w+)/.exec(proof)?.[1] || 'FAIL';
const ledgerFills = Number(/fills:\s*(\d+)/.exec(ledger)?.[1] || '0');
const res = evaluateE122LiveFillGate({ mode, terminalStatus, ledgerFills, liveProofStatus });
writeMdAtomic('reports/evidence/E122/LIVE_FILL_GATE.md', [
  '# E122 LIVE FILL GATE',
  `- status: ${res.status}`,
  `- reason_code: ${res.reason_code}`,
  `- final_verdict: ${res.verdict}`,
  `- terminal_status: ${terminalStatus}`,
  `- ledger_fills: ${ledgerFills}`
].join('\n'));
if (res.status === 'FAIL') process.exit(1);
