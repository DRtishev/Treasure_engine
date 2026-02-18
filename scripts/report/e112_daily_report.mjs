#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { serializeLedger } from '../../core/profit/ledger.mjs';
import { writeMdAtomic } from '../verify/e112_lib.mjs';

const run = JSON.parse(fs.readFileSync(path.resolve('.foundation-seal/capsules/_work/graduation_run.json'), 'utf8'));
writeMdAtomic('reports/evidence/E112/LEDGER_SUMMARY.md', [
  '# E112 LEDGER SUMMARY',
  `- total_fills: ${run.summary.total_fills}`,
  `- equity: ${run.summary.equity}`,
  `- realized_pnl: ${run.summary.realized_pnl}`,
  `- max_drawdown: ${run.summary.max_drawdown}`,
  `- summary_hash: ${run.summary_hash}`
].join('\n'));
writeMdAtomic('reports/evidence/E112/DAILY_REPORT.md', [
  '# E112 DAILY REPORT',
  `- symbol: ${run.symbol}`,
  `- kill_switch: ${run.kill_switch}`,
  `- total_fills: ${run.summary.total_fills}`,
  `- equity: ${run.summary.equity}`,
  `- max_drawdown: ${run.summary.max_drawdown}`,
  '## Notes',
  '- SSOT ledger module: core/profit/ledger.mjs'
].join('\n'));
fs.writeFileSync(path.resolve('.foundation-seal/capsules/_work/ledger_snapshot.json'), serializeLedger(run.ledger));
console.log('e112_daily_report: wrote evidence');
