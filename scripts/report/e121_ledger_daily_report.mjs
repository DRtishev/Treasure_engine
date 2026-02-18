#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createLedger, recordFill, getLedgerSummary } from '../../core/profit/ledger.mjs';
import { runDirE121, writeMdAtomic } from '../verify/e121_lib.mjs';

const p = path.join(runDirE121(), 'MICRO_LIVE_RUN.jsonl');
const events = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
const normalized = [...events].sort((a, b) => `${a.ts}|${a.trade_id}`.localeCompare(`${b.ts}|${b.trade_id}`));
const ledger = createLedger({ initial_capital: 10000, currency: 'USDT', created_at: '2026-01-01T00:00:00Z' });
for (const ev of normalized) {
  if (!/(filled|partially_filled|submitted|skip)/i.test(String(ev.status || ''))) continue;
  recordFill(ledger, { symbol: ev.symbol, side: ev.side, qty: ev.qty, price: ev.price, exec_price: ev.exec_price, fee: ev.fee, ts: ev.ts, trade_id: ev.trade_id });
}
const summary = getLedgerSummary(ledger, { [normalized[0]?.symbol || 'BTCUSDT']: normalized[0]?.price || 100000 });
const summaryHash = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
writeMdAtomic('reports/evidence/E121/LEDGER_DAILY_REPORT.md', [
  '# E121 LEDGER DAILY REPORT',
  `- fills: ${ledger.fills.length}`,
  `- fees_usd: ${summary.total_fees.toFixed(4)}`,
  `- slippage_usd: ${summary.total_slippage.toFixed(4)}`,
  `- realized_pnl_usd: ${summary.realized_pnl.toFixed(4)}`,
  `- equity_usd: ${summary.equity.toFixed(4)}`,
  `- summary_hash: ${summaryHash}`
].join('\n'));
