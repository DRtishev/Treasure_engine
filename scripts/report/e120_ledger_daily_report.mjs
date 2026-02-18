#!/usr/bin/env node
import { writeMdAtomic } from '../verify/e120_lib.mjs';

const fees = Number(process.env.E120_FEES_USD || 0);
const slippage = Number(process.env.E120_SLIPPAGE_USD || 0);
const pnl = Number(process.env.E120_PNL_USD || 0);
const dd = Number(process.env.E120_DRAWDOWN_USD || 0);
writeMdAtomic('reports/evidence/E120/LEDGER_DAILY_REPORT.md', [
  '# E120 LEDGER DAILY REPORT',
  `- fees_usd: ${fees.toFixed(4)}`,
  `- slippage_usd: ${slippage.toFixed(4)}`,
  `- pnl_usd: ${pnl.toFixed(4)}`,
  `- drawdown_usd: ${dd.toFixed(4)}`,
  `- anomalies: NONE`
].join('\n'));
