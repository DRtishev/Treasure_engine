#!/usr/bin/env node
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { E97_ROOT, E97_PROFIT, ensureDir, fmt4, minimalLog, readProfitRows, writeProfitRows } from './e97_lib.mjs';

const updateState=process.env.UPDATE_E97_STATE==='1';
if(process.env.CI==='true'&&updateState) throw new Error('UPDATE_E97_STATE forbidden in CI');
if(!updateState){minimalLog('verify:e97:update:state SKIPPED update_state=0');process.exit(0);} 

const fixtures=[
  {date_utc:'2023-11-12',symbol:'BTCUSDT',pnl_usd:101.4,latency_ms:30,spread_bps:2.0,fill_rate:0.971},
  {date_utc:'2023-11-12',symbol:'ETHUSDT',pnl_usd:-11.7,latency_ms:42,spread_bps:3.8,fill_rate:0.929},
  {date_utc:'2023-11-12',symbol:'SOLUSDT',pnl_usd:13.1,latency_ms:43,spread_bps:3.9,fill_rate:0.931}
];
const existing=readProfitRows();
const map=new Map(existing.map((r)=>[`${r.date_utc}|${r.symbol}`,r]));
for(const row of fixtures) map.set(`${row.date_utc}|${row.symbol}`,row);
const merged=[...map.values()].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
for(const r of merged){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date_utc)) throw new Error('profit_ledger schema date_utc');
  if(!/^[A-Z0-9]+$/.test(r.symbol)) throw new Error('profit_ledger schema symbol');
  if(![r.pnl_usd,r.latency_ms,r.spread_bps,r.fill_rate].every((n)=>Number.isFinite(n))) throw new Error('profit_ledger schema metrics');
}
writeProfitRows(merged);

ensureDir(E97_ROOT);
writeMd(path.join(E97_ROOT,'PROFIT_LEDGER_SNAPSHOT.md'),[
  '# E97 Profit Ledger Snapshot',
  `- total_rows: ${merged.length}`,
  '| date_utc | symbol | pnl_usd | latency_ms | spread_bps | fill_rate |',
  '|---|---|---:|---:|---:|---:|',
  ...merged.map((r)=>`| ${r.date_utc} | ${r.symbol} | ${fmt4(r.pnl_usd)} | ${fmt4(r.latency_ms)} | ${fmt4(r.spread_bps)} | ${fmt4(r.fill_rate)} |`)
].join('\n'));
minimalLog(`verify:e97:update:state PASSED rows=${merged.length} file=${E97_PROFIT}`);
