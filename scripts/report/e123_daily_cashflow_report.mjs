#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createLedger, recordFill, getLedgerSummary, getUnrealizedPnL, detectAnomalies } from '../../core/profit/ledger.mjs';
import { runDirE123, writeMdAtomic } from '../verify/e123_lib.mjs';
const p = path.join(runDirE123(), 'E123_EVENTS.jsonl');
const events = fs.existsSync(p)?fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse):[];
const normalized=[...events].sort((a,b)=>`${a.ts}|${a.trade_id}`.localeCompare(`${b.ts}|${b.trade_id}`));
const ledger=createLedger({initial_capital:10000,currency:'USDT',created_at:'2026-01-01T00:00:00Z'});
for(const ev of normalized){ if(ev.status!=='FILLED') continue; recordFill(ledger,{symbol:ev.symbol,side:ev.side,qty:ev.qty,price:ev.price,exec_price:ev.price,fee:ev.fee,ts:ev.ts,trade_id:ev.trade_id}); }
const summary=getLedgerSummary(ledger,{BTCUSDT:normalized[0]?.price||100000});
const unreal=getUnrealizedPnL(ledger,{BTCUSDT:normalized[0]?.price||100000});
const anomalies=detectAnomalies(ledger);
const hash=crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
writeMdAtomic('reports/evidence/E123/LEDGER_DAILY_REPORT.md',[
 '# E123 LEDGER DAILY REPORT',`- fills: ${ledger.fills.length}`,`- realized_pnl_usd: ${summary.realized_pnl.toFixed(4)}`,
 `- unrealized_pnl_usd: ${unreal.toFixed(4)}`,`- fees_usd: ${summary.total_fees.toFixed(4)}`,`- drawdown: ${summary.max_drawdown.toFixed(6)}`,
 `- anomalies: ${anomalies.length}`,`- summary_hash: ${hash}`
].join('\n'));
